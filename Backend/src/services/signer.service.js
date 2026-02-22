const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/ApiError');
const { sendSigningInvitation } = require('../config/email');
const pdfService = require('./pdf.service');

const BUCKET = 'documents';
const SIGNED_URL_EXPIRY = 3600;

/**
 * Generate a secure token for email-based signing
 */
function generateSignerToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Add signers to a document
 */
async function addSigners(documentId, ownerId, signers, requiresOrder = false, expiresAt = null) {
  if (!documentId || !ownerId || !signers || !Array.isArray(signers) || signers.length === 0) {
    throw new ApiError(400, 'documentId, ownerId, and signers array are required');
  }

  // Verify document ownership
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, title, owner_id')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    throw new ApiError(404, 'Document not found');
  }

  if (doc.owner_id !== ownerId) {
    throw new ApiError(403, 'Access denied');
  }

  // Get owner info for email
  const { data: owner } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', ownerId)
    .single();

  const ownerName = owner?.name || owner?.email || 'Someone';

  // Validate signers
  const validSigners = signers.map((signer, index) => {
    if (!signer.email || !signer.name) {
      throw new ApiError(400, `Signer ${index + 1}: email and name are required`);
    }
    if (!signer.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      throw new ApiError(400, `Signer ${index + 1}: invalid email format`);
    }
    return {
      email: signer.email.trim().toLowerCase(),
      name: signer.name.trim(),
      role: signer.role || 'signer',
      signing_order: requiresOrder ? (signer.signing_order || index + 1) : null,
    };
  });

  // Check for duplicate emails
  const emails = validSigners.map(s => s.email);
  if (new Set(emails).size !== emails.length) {
    throw new ApiError(400, 'Duplicate email addresses are not allowed');
  }

  // Insert signers
  const signerRecords = validSigners.map(signer => ({
    document_id: documentId,
    email: signer.email,
    name: signer.name,
    role: signer.role,
    signing_order: signer.signing_order,
    signer_token: generateSignerToken(),
    status: 'pending',
  }));

  const { data: insertedSigners, error: insertError } = await supabase
    .from('document_signers')
    .insert(signerRecords)
    .select();

  if (insertError) {
    console.error('[AddSigners] Database error:', insertError);
    throw new ApiError(500, `Failed to add signers: ${insertError.message}`);
  }

  // Update document settings
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      requires_signing_order: requiresOrder,
      expires_at: expiresAt,
      status: 'pending', // Change status to pending when signers are added
    })
    .eq('id', documentId);

  if (updateError) {
    console.error('[AddSigners] Failed to update document:', updateError);
  }

  // Send invitation emails
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const emailResults = [];

  for (const signer of insertedSigners) {
    try {
      const signingUrl = `${baseUrl}/sign/${documentId}?token=${signer.signer_token}`;
      await sendSigningInvitation({
        to: signer.email,
        name: signer.name,
        documentTitle: doc.title,
        signingUrl,
        ownerName,
      });
      
      // Update status to 'sent'
      await supabase
        .from('document_signers')
        .update({ status: 'sent' })
        .eq('id', signer.id);

      emailResults.push({ email: signer.email, sent: true });
    } catch (emailError) {
      console.error(`[AddSigners] Failed to send email to ${signer.email}:`, emailError);
      emailResults.push({ email: signer.email, sent: false, error: emailError.message });
    }
  }

  return {
    signers: insertedSigners,
    emailResults,
  };
}

/**
 * Get signers for a document
 */
async function getDocumentSigners(documentId, userId) {
  // Verify document ownership or signer access
  const { data: doc } = await supabase
    .from('documents')
    .select('id, owner_id')
    .eq('id', documentId)
    .single();

  if (!doc) {
    throw new ApiError(404, 'Document not found');
  }

  // Only owner can see all signers
  if (doc.owner_id !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  const { data: signers, error } = await supabase
    .from('document_signers')
    .select('*')
    .eq('document_id', documentId)
    .order('signing_order', { ascending: true, nullsLast: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw new ApiError(500, `Failed to fetch signers: ${error.message}`);
  }

  return signers || [];
}

/**
 * Verify signer token and get signer info
 */
async function verifySignerToken(documentId, token) {
  const { data: signer, error } = await supabase
    .from('document_signers')
    .select('*, documents(*)')
    .eq('document_id', documentId)
    .eq('signer_token', token)
    .single();

  if (error || !signer) {
    throw new ApiError(401, 'Invalid or expired signing link');
  }

  // Check if already signed
  if (signer.status === 'signed') {
    throw new ApiError(400, 'This document has already been signed by you');
  }

  // Check if document is expired
  if (signer.documents?.expires_at) {
    const expiresAt = new Date(signer.documents.expires_at);
    if (expiresAt < new Date()) {
      throw new ApiError(400, 'This signing link has expired');
    }
  }

  // Check signing order if required
  if (signer.documents?.requires_signing_order && signer.signing_order !== null) {
    const { data: previousSigners } = await supabase
      .from('document_signers')
      .select('status')
      .eq('document_id', documentId)
      .lt('signing_order', signer.signing_order);

    const incomplete = previousSigners?.some(s => s.status !== 'signed');
    if (incomplete) {
      throw new ApiError(400, 'Previous signers must complete their signatures first');
    }
  }

  // Update status to 'viewed' when they access the link
  if (signer.status === 'pending' || signer.status === 'sent') {
    await supabase
      .from('document_signers')
      .update({ status: 'viewed' })
      .eq('id', signer.id);
    signer.status = 'viewed';
  }

  // Build document with viewable PDF URL - use _signed.pdf if doc is fully signed or any signer has signed (for multi-signer)
  const doc = signer.documents;
  const { count } = await supabase
    .from('document_signers')
    .select('*', { count: 'exact', head: true })
    .eq('document_id', documentId)
    .eq('status', 'signed');

  const hasAnySignature = (count ?? 0) > 0;
  const storagePath = (doc.status === 'signed' || hasAnySignature)
    ? `${doc.owner_id}/${doc.id}_signed.pdf`
    : `${doc.owner_id}/${doc.id}.pdf`;

  const { data: signedData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  const pdfUrl = signedData?.signedUrl || doc.file_url;

  return {
    signer: {
      id: signer.id,
      email: signer.email,
      name: signer.name,
      role: signer.role,
      status: signer.status,
    },
    document: {
      id: doc.id,
      title: doc.title,
      status: doc.status,
      owner_id: doc.owner_id,
      file_url: doc.file_url,
      signed_url: pdfUrl,
    },
  };
}

/**
 * Accept and sign - embed signer's name into PDF and update status
 */
async function acceptAndSign(documentId, token, ipAddress = null, position = {}) {
  const verified = await verifySignerToken(documentId, token);
  const { signer, document } = verified;

  if (signer.status === 'signed') {
    throw new ApiError(400, 'You have already signed this document');
  }

  // Download current PDF: use _signed.pdf if it exists (has previous signers), else original
  let buffer;
  const signedPath = `${document.owner_id}/${document.id}_signed.pdf`;
  const originalPath = `${document.owner_id}/${document.id}.pdf`;

  const { data: signedData, error: signedError } = await supabase.storage
    .from(BUCKET)
    .download(signedPath);

  if (!signedError && signedData) {
    buffer = Buffer.from(await signedData.arrayBuffer());
  } else {
    const { data: origData, error: origError } = await supabase.storage
      .from(BUCKET)
      .download(originalPath);
    if (origError || !origData) {
      console.error('[AcceptAndSign] Failed to download PDF:', signedError || origError);
      throw new ApiError(500, 'Failed to load document for signing');
    }
    buffer = Buffer.from(await origData.arrayBuffer());
  }

  // Use signer-chosen position or default to bottom center of first page
  const pageIndex = (position.page != null ? Number(position.page) : 1) - 1;
  const x = position.x != null ? Number(position.x) : 50;
  const y = position.y != null ? Number(position.y) : 90;
  const signaturesWithLabels = [
    { pageIndex: Math.max(0, pageIndex), x, y, label: `Signed by ${signer.name}` },
  ];

  let signedPdfBytes;
  try {
    signedPdfBytes = await pdfService.embedSignatureText(buffer, signaturesWithLabels, 'signature', 'black');
  } catch (pdfError) {
    console.error('[AcceptAndSign] PDF embedding error:', pdfError);
    throw new ApiError(500, `Failed to sign document: ${pdfError.message || 'PDF error'}`);
  }

  const uploadPayload = Buffer.isBuffer(signedPdfBytes) ? signedPdfBytes : Buffer.from(signedPdfBytes);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(signedPath, uploadPayload, { contentType: 'application/pdf', upsert: true });

  if (uploadError) {
    console.error('[AcceptAndSign] Failed to upload signed PDF:', uploadError);
    throw new ApiError(500, 'Failed to save signed document');
  }

  const { data: signedUrlData } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(signedPath, SIGNED_URL_EXPIRY);
  const signedFileUrl = signedUrlData?.signedUrl || document.file_url;

  // Update document_signer status
  await supabase
    .from('document_signers')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      ip_address: ipAddress,
      updated_at: new Date().toISOString(),
    })
    .eq('id', signer.id);

  // Update document file_url (always - so latest signed PDF is shown)
  const updateData = { file_url: signedFileUrl };

  // Only set document status to 'signed' when ALL signers have signed
  const { data: allSigners } = await supabase
    .from('document_signers')
    .select('status')
    .eq('document_id', documentId);

  const allSigned = allSigners?.length > 0 && allSigners.every((s) => s.status === 'signed');
  if (allSigned) {
    updateData.status = 'signed';
  }

  await supabase
    .from('documents')
    .update(updateData)
    .eq('id', documentId);

  return { success: true, message: 'Document signed successfully' };
}

/**
 * Update signer status (legacy - for reject only; use acceptAndSign for signing)
 */
async function updateSignerStatus(signerId, status, ipAddress = null) {
  const updateData = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'signed') {
    updateData.signed_at = new Date().toISOString();
  }

  if (ipAddress) {
    updateData.ip_address = ipAddress;
  }

  const { data, error } = await supabase
    .from('document_signers')
    .update(updateData)
    .eq('id', signerId)
    .select()
    .single();

  if (error) {
    throw new ApiError(500, `Failed to update signer status: ${error.message}`);
  }

  return data;
}

module.exports = {
  addSigners,
  getDocumentSigners,
  verifySignerToken,
  acceptAndSign,
  updateSignerStatus,
};
