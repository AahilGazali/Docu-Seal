const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/ApiError');
const pdfService = require('./pdf.service');
const auditService = require('./audit.service');

const BUCKET = 'documents';

async function createSignature(documentId, signerId, x, y, page, ipAddress, label = null) {
  if (!documentId || signerId == null || x == null || y == null || page == null) {
    throw new ApiError(400, 'documentId, signerId, x, y and page are required');
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, owner_id, status')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    throw new ApiError(404, 'Document not found');
  }
  if (doc.status === 'signed') {
    throw new ApiError(400, 'Document already signed');
  }

  const id = uuidv4();
  const signatureData = {
    id,
    document_id: documentId,
    signer_id: signerId,
    x: Number(x),
    y: Number(y),
    page: Number(page),
    status: 'pending',
    ip_address: ipAddress || null,
    label: label || null, // Store the label (full name or initials) for this signature
  };
  
  console.log(`[CreateSignature] Inserting signature:`, signatureData);
  
  const { data: sig, error } = await supabase
    .from('signatures')
    .insert(signatureData)
    .select()
    .single();

  if (error) {
    console.error(`[CreateSignature] Database error:`, error);
    throw new ApiError(500, `Failed to create signature: ${error.message || 'Database error'}`);
  }

  if (!sig) {
    console.error(`[CreateSignature] No signature returned after insert`);
    throw new ApiError(500, 'Failed to create signature: No data returned');
  }

  // Verify the signature was saved correctly by querying it back
  const { data: verifySig, error: verifyError } = await supabase
    .from('signatures')
    .select('*')
    .eq('id', sig.id)
    .single();

  if (verifyError || !verifySig) {
    console.error(`[CreateSignature] Verification failed:`, verifyError);
  } else {
    console.log(`[CreateSignature] Verified signature in DB:`, {
      id: verifySig.id,
      document_id: verifySig.document_id,
      status: verifySig.status,
      page: verifySig.page,
      x: verifySig.x,
      y: verifySig.y,
    });
  }

  console.log(`[CreateSignature] Successfully created signature ${sig.id} for document ${documentId}, status: ${sig.status}`);
  
  await auditService.log(documentId, signerId, 'signature_placed', ipAddress);
  return sig;
}

async function getSignaturesByDocumentId(documentId, userId) {
  if (!documentId) {
    throw new ApiError(400, 'Document ID is required');
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('owner_id')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    throw new ApiError(404, 'Document not found');
  }
  if (doc.owner_id !== userId) {
    throw new ApiError(403, 'Access denied');
  }

  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('document_id', documentId)
    .order('page', { ascending: true });

  if (error) {
    throw new ApiError(500, 'Failed to fetch signatures');
  }
  return data || [];
}

async function finalizeSignatures(documentId, userId, ipAddress, signatureLabel, signatureStyle, signatureColor) {
  try {
    console.log(`[Finalize] Starting finalize for document ${documentId}, user ${userId}`);
    
    if (!documentId) {
      throw new ApiError(400, 'Document ID is required');
    }

    // Query document - don't include deleted_at to avoid potential issues
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('id, owner_id, file_url, status')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error(`[Finalize] Database error fetching document:`, docError);
      if (docError.code === '42P01' || docError.message?.includes('does not exist')) {
        throw new ApiError(503, 'Database not set up. Run the SQL in Backend/supabase-schema.sql in your Supabase SQL editor.');
      }
      throw new ApiError(404, `Document not found: ${docError.message || 'Database error'}`);
    }
    
    if (!doc) {
      console.error(`[Finalize] Document not found: ${documentId}`);
      throw new ApiError(404, 'Document not found');
    }
    
    if (doc.owner_id !== userId) {
      console.error(`[Finalize] Access denied: doc owner ${doc.owner_id} != user ${userId}`);
      throw new ApiError(403, 'Access denied');
    }
    
    if (doc.status === 'signed') {
      throw new ApiError(400, 'Document already signed');
    }
    
    console.log(`[Finalize] Document found: ${doc.id}, status: ${doc.status}`);

    const storagePath = `${doc.owner_id}/${doc.id}.pdf`;
    console.log(`[Finalize] Downloading PDF from storage: ${storagePath}`);
    
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);

    if (downloadError) {
      console.error(`[Finalize] Storage download error:`, downloadError);
      throw new ApiError(500, `Failed to download document: ${downloadError.message || 'Storage error'}`);
    }
    
    if (!downloadData) {
      console.error(`[Finalize] No data returned from storage download`);
      throw new ApiError(500, 'Failed to download document: No data returned');
    }

    const buffer = Buffer.from(await downloadData.arrayBuffer());
    console.log(`[Finalize] Downloaded PDF: ${buffer.length} bytes`);
    
    // Get ALL signatures for this document - don't filter by status yet
    console.log(`[Finalize] Fetching signatures for document ${documentId}...`);
    const { data: allSignatures, error: sigError } = await supabase
      .from('signatures')
      .select('id, page, x, y, signer_id, status, document_id, label')
      .eq('document_id', documentId);

    if (sigError) {
      console.error(`[Finalize] Database error fetching signatures:`, sigError);
      if (sigError.code === '42P01' || sigError.message?.includes('does not exist')) {
        throw new ApiError(503, 'Database not set up. Run the SQL in Backend/supabase-schema.sql in your Supabase SQL editor.');
      }
      throw new ApiError(500, `Failed to fetch signatures: ${sigError.message || 'Database error'}`);
    }

    console.log(`[Finalize] Database query result:`, {
      documentId,
      foundSignatures: allSignatures?.length || 0,
      signatures: allSignatures,
    });

    if (!allSignatures || allSignatures.length === 0) {
      // Double-check with a raw query to see if table exists and is accessible
      const { data: testQuery, error: testError } = await supabase
        .from('signatures')
        .select('count')
        .eq('document_id', documentId);
      
      console.error(`[Finalize] No signatures found in database for document ${documentId}`, {
        testQuery,
        testError,
        documentId,
        userId,
      });
      
      throw new ApiError(400, `No signature fields found in database for this document. Please place at least one signature field and ensure it was saved successfully. Document ID: ${documentId}`);
    }

    // If document is still draft but signatures are marked as signed (from previous failed attempt),
    // reset them to pending so we can finalize properly
    const signedButDocIsDraft = allSignatures.filter(s => s.status === 'signed').length > 0 && doc.status === 'draft';
    
    if (signedButDocIsDraft) {
      console.log(`[Finalize] Found ${allSignatures.filter(s => s.status === 'signed').length} signatures marked as 'signed' but document is still 'draft'. Resetting to 'pending'...`);
      const { error: resetError } = await supabase
        .from('signatures')
        .update({ status: 'pending', signed_at: null })
        .eq('document_id', documentId)
        .eq('status', 'signed');
      
      if (resetError) {
        console.error(`[Finalize] Error resetting signatures:`, resetError);
      } else {
        console.log(`[Finalize] Reset signatures to pending. Refetching...`);
        // Refetch after reset - include label column
        const { data: refreshedSigs } = await supabase
          .from('signatures')
          .select('id, page, x, y, signer_id, status, label')
          .eq('document_id', documentId);
        if (refreshedSigs) {
          allSignatures.splice(0, allSignatures.length, ...refreshedSigs);
        }
      }
    }

    // Filter for pending signatures only - be more lenient with status check
    const signatureList = allSignatures.filter(s => {
      // Accept 'pending', null, undefined, or empty string as pending
      const statusStr = String(s.status || '').toLowerCase().trim();
      const isPending = statusStr === 'pending' || statusStr === '' || !s.status;
      if (!isPending) {
        console.log(`[Finalize] Skipping signature ${s.id}: status="${s.status}" (not pending)`);
      }
      return isPending;
    });
    
    console.log(`[Finalize] Filtered signatures:`, {
      total: allSignatures.length,
      pending: signatureList.length,
      signed: allSignatures.filter(s => s.status === 'signed').length,
      pendingList: signatureList.map(s => ({ id: s.id, status: s.status, page: s.page, x: s.x, y: s.y })),
    });
    
    if (signatureList.length === 0) {
      const signedCount = allSignatures.filter(s => s.status === 'signed').length;
      console.log(`[Finalize] No pending signatures found. Signed count: ${signedCount}, doc status: ${doc.status}`);
      if (signedCount > 0 && doc.status === 'signed') {
        throw new ApiError(400, 'Document has already been signed.');
      }
      throw new ApiError(400, `No pending signature fields found. Found ${allSignatures.length} signature(s) but none are pending. Please place new signature fields.`);
    }

    const signerIds = [...new Set(signatureList.map((s) => s.signer_id))];
    const { data: users } = await supabase.from('users').select('id, name').in('id', signerIds);
    const userMap = (users || []).reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

    const labelForSigner = (sig) => {
      // If signature has a stored label (full name or initials), use it
      if (sig.label && String(sig.label).trim()) {
        return String(sig.label).trim();
      }
      // Otherwise, use the signatureLabel from finalize request (for backward compatibility)
      if (sig.signer_id === userId && signatureLabel && String(signatureLabel).trim()) {
        return String(signatureLabel).trim();
      }
      // Fallback to user's name
      return userMap[sig.signer_id] ? userMap[sig.signer_id] : 'Signed';
    };

    const signaturesWithLabels = signatureList
      .filter(s => s.status === 'pending') // Only use pending signatures
      .map((s) => ({
        pageIndex: s.page - 1,
        x: Number(s.x),
        y: Number(s.y),
        label: labelForSigner(s),
      }));

    if (signaturesWithLabels.length === 0) {
      throw new ApiError(400, 'No valid signature positions found');
    }

    console.log(`[Finalize] Embedding ${signaturesWithLabels.length} signature(s) into PDF:`, 
      signaturesWithLabels.map(s => `${s.label} at (${s.x}%, ${s.y}%) page ${s.pageIndex + 1}`));

    console.log(`[Finalize] Calling pdfService.embedSignatureText with style: ${signatureStyle}, color: ${signatureColor || 'black'}`);
    let signedPdfBytes;
    try {
      signedPdfBytes = await pdfService.embedSignatureText(buffer, signaturesWithLabels, signatureStyle, signatureColor || 'black');
    } catch (pdfError) {
      console.error(`[Finalize] PDF embedding error:`, pdfError);
      console.error(`[Finalize] PDF error stack:`, pdfError.stack);
      throw new ApiError(500, `Failed to embed signatures in PDF: ${pdfError.message || 'PDF processing error'}`);
    }
    
    console.log(`[Finalize] Generated signed PDF: ${signedPdfBytes?.length || 0} bytes (original: ${buffer.length} bytes)`);
    
    if (!signedPdfBytes || signedPdfBytes.length === 0) {
      throw new ApiError(500, 'Failed to generate signed PDF: Empty result');
    }
    const signedPath = `${doc.owner_id}/${doc.id}_signed.pdf`;
    console.log(`[Finalize] Uploading signed PDF to storage: ${signedPath}`);
    const uploadPayload = Buffer.isBuffer(signedPdfBytes) ? signedPdfBytes : Buffer.from(signedPdfBytes);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(signedPath, uploadPayload, { contentType: 'application/pdf', upsert: true });

    if (uploadError) {
      console.error(`[Finalize] Storage upload error:`, uploadError);
      throw new ApiError(500, `Failed to upload signed document: ${uploadError.message || 'Storage error'}`);
    }
    
    console.log(`[Finalize] Successfully uploaded signed PDF`);

    // For private buckets, use createSignedUrl; for public, getPublicUrl works
    // Try signed URL first (works for both private and public buckets)
    console.log(`[Finalize] Generating signed URL for ${signedPath}...`);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(signedPath, 3600);

    if (signedUrlError) {
      console.warn(`[Finalize] Signed URL error (trying public URL):`, signedUrlError);
    }

    const signedFileUrl = signedUrlData?.signedUrl || (() => {
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(signedPath);
      return urlData.publicUrl;
    })();

    console.log(`[Finalize] Signed PDF URL: ${signedFileUrl?.substring(0, 100) || 'N/A'}...`);

    console.log(`[Finalize] Updating document status to 'signed'...`);
    const { error: updateDocError } = await supabase
      .from('documents')
      .update({ status: 'signed', file_url: signedFileUrl })
      .eq('id', documentId);

    if (updateDocError) {
      console.error(`[Finalize] Error updating document status:`, updateDocError);
      throw new ApiError(500, `Failed to update document status: ${updateDocError.message || 'Database error'}`);
    }
    
    console.log(`[Finalize] Document status updated successfully`);

    console.log(`[Finalize] Updating signature statuses to 'signed'...`);
    const { error: updateSigError } = await supabase
      .from('signatures')
      .update({ status: 'signed', signed_at: new Date().toISOString() })
      .eq('document_id', documentId)
      .eq('status', 'pending');

    if (updateSigError) {
      console.error(`[Finalize] Error updating signature status:`, updateSigError);
      // Don't fail the whole operation if signature status update fails
    } else {
      console.log(`[Finalize] Signature statuses updated successfully`);
    }

    console.log(`[Finalize] Logging audit trail...`);
    await auditService.log(documentId, userId, 'document_finalized', ipAddress);

    console.log(`[Finalize] Successfully finalized document ${documentId}`);
    return { message: 'Document finalized', file_url: signedFileUrl };
  } catch (err) {
    if (err instanceof ApiError) {
      console.error(`[Finalize] ApiError:`, err.statusCode, err.message);
      throw err;
    }
    console.error(`[Finalize] Unexpected error:`, err);
    console.error(`[Finalize] Error stack:`, err.stack);
    throw new ApiError(500, `Failed to finalize signatures: ${err.message || 'Unknown error'}`);
  }
}

async function updateSignature(signatureId, userId, x, y, page) {
  if (!signatureId || x == null || y == null || page == null) {
    throw new ApiError(400, 'signatureId, x, y and page are required');
  }

  // Verify signature exists
  const { data: sig, error: sigError } = await supabase
    .from('signatures')
    .select('id, document_id, signer_id')
    .eq('id', signatureId)
    .single();

  if (sigError || !sig) {
    throw new ApiError(404, 'Signature not found');
  }

  // Get document to check status and ownership
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, owner_id, status')
    .eq('id', sig.document_id)
    .single();

  if (docError || !doc) {
    throw new ApiError(404, 'Document not found');
  }

  // Check document status
  if (doc.status === 'signed') {
    throw new ApiError(400, 'Cannot update signature on a signed document');
  }

  // Verify user owns the document or is the signer
  if (doc.owner_id !== userId && sig.signer_id !== userId) {
    throw new ApiError(403, 'Not authorized to update this signature');
  }

  const { data: updated, error: updateError } = await supabase
    .from('signatures')
    .update({
      x: Number(x),
      y: Number(y),
      page: Number(page),
    })
    .eq('id', signatureId)
    .select()
    .single();

  if (updateError) {
    console.error(`[UpdateSignature] Database error:`, updateError);
    throw new ApiError(500, `Failed to update signature: ${updateError.message || 'Database error'}`);
  }

  return updated;
}

module.exports = { createSignature, getSignaturesByDocumentId, finalizeSignatures, updateSignature };
