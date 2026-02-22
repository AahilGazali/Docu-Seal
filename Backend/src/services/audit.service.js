const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/ApiError');

async function log(documentId, userId, action, ipAddress) {
  try {
    await supabase.from('audit_logs').insert({
      id: uuidv4(),
      document_id: documentId,
      user_id: userId,
      action,
      ip_address: ipAddress || null,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}

async function getByDocumentId(documentId, ownerId) {
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
  if (doc.owner_id !== ownerId) {
    throw new ApiError(403, 'Access denied');
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new ApiError(500, 'Failed to fetch audit logs');
  }
  return data;
}

module.exports = { log, getByDocumentId };
