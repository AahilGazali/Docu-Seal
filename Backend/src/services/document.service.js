const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { ApiError } = require('../utils/ApiError');

const BUCKET = 'documents';
const SIGNED_URL_EXPIRY = 3600;

async function uploadDocument(ownerId, title, buffer, mimetype) {
  if (!title || !buffer || !Buffer.isBuffer(buffer)) {
    throw new ApiError(400, 'Title and PDF file are required');
  }
  if (mimetype !== 'application/pdf') {
    throw new ApiError(400, 'Only PDF files are allowed');
  }

  const id = uuidv4();
  const fileName = `${ownerId}/${id}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, buffer, { contentType: 'application/pdf', upsert: false });

  if (uploadError) {
    throw new ApiError(500, 'Failed to upload file');
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  const fileUrl = urlData.publicUrl;

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      id,
      title,
      owner_id: ownerId,
      file_url: fileUrl,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([fileName]);
    throw new ApiError(500, 'Failed to save document record');
  }

  return doc;
}

async function listDocuments(ownerId, includeDeleted = false) {
  try {
    let query = supabase
      .from('documents')
      .select('id, title, owner_id, file_url, status, created_at, deleted_at')
      .eq('owner_id', ownerId);
    
    if (!includeDeleted) {
      query = query.is('deleted_at', null);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      // If deleted_at column doesn't exist, fallback to query without it
      if (error.message && error.message.includes('deleted_at')) {
        console.warn(`[ListDocuments] deleted_at column may not exist. Using fallback query.`);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('documents')
          .select('id, title, owner_id, file_url, status, created_at')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false });
        if (fallbackError) {
          throw new ApiError(500, `Failed to list documents: ${fallbackError.message}`);
        }
        return fallbackData || [];
      }
      throw new ApiError(500, `Failed to list documents: ${error.message || 'Database error'}`);
    }
    return data || [];
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error(`[ListDocuments] Unexpected error:`, err);
    throw new ApiError(500, `Failed to list documents: ${err.message || 'Unknown error'}`);
  }
}

async function listDeletedDocuments(ownerId) {
  // Query for documents where deleted_at is NOT null
  // Fetch all documents and filter in JavaScript to avoid Supabase null handling issues
  try {
    console.log(`[ListDeleted] Fetching deleted documents for user ${ownerId}...`);
    
    // Fetch all documents for this user (including deleted_at column)
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, owner_id, file_url, status, created_at, deleted_at')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      // If column doesn't exist, return empty array
      if (error.message && (error.message.includes('column') || error.message.includes('deleted_at'))) {
        console.warn(`[ListDeleted] deleted_at column may not exist. Error: ${error.message}`);
        console.warn(`[ListDeleted] Please run: ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;`);
        return [];
      }
      console.error(`[ListDeleted] Database error:`, error);
      throw new ApiError(500, `Failed to list deleted documents: ${error.message || 'Database error'}`);
    }
    
    // Filter in JavaScript for documents where deleted_at is not null/undefined
    // Also filter out any records where deleted_at is the string "null" or empty
    const deletedDocs = (data || []).filter(doc => {
      const deletedAt = doc.deleted_at;
      // Check if deleted_at exists and is a valid timestamp string
      return deletedAt != null && 
             deletedAt !== undefined && 
             deletedAt !== 'null' && 
             deletedAt !== '' &&
             typeof deletedAt === 'string' && 
             deletedAt.trim().length > 0 &&
             !isNaN(Date.parse(deletedAt)); // Ensure it's a valid date
    });
    
    // Sort by deleted_at descending (most recently deleted first)
    deletedDocs.sort((a, b) => {
      try {
        const dateA = new Date(a.deleted_at).getTime();
        const dateB = new Date(b.deleted_at).getTime();
        return dateB - dateA; // Descending order
      } catch (e) {
        return 0; // If date parsing fails, maintain order
      }
    });
    
    console.log(`[ListDeleted] Query result:`, {
      totalDocs: data?.length || 0,
      deletedDocs: deletedDocs.length,
      sampleDeleted: deletedDocs.slice(0, 3).map(d => ({ id: d.id, title: d.title, deleted_at: d.deleted_at })),
    });
    
    return deletedDocs;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    console.error(`[ListDeleted] Unexpected error:`, err);
    throw new ApiError(500, `Failed to list deleted documents: ${err.message || 'Unknown error'}`);
  }
}

async function getDocumentById(documentId, ownerId) {
  if (!documentId) {
    throw new ApiError(400, 'Document ID is required');
  }

  const { data, error } = await supabase
    .from('documents')
    .select('id, title, owner_id, file_url, status, created_at, deleted_at')
    .eq('id', documentId)
    .single();
    
  // Check if document is deleted - don't allow access to deleted documents
  if (data && data.deleted_at) {
    throw new ApiError(404, 'Document not found');
  }

  if (error || !data) {
    throw new ApiError(404, 'Document not found');
  }

  if (data.owner_id !== ownerId) {
    throw new ApiError(403, 'Access denied');
  }

  // Signed documents are stored at owner_id/id_signed.pdf; drafts use owner_id/id.pdf
  const storagePath = data.status === 'signed'
    ? `${data.owner_id}/${data.id}_signed.pdf`
    : `${data.owner_id}/${data.id}.pdf`;
  const { data: signedData, error: signedUrlError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (signedUrlError && data.status === 'signed') {
    throw new ApiError(500, 'Failed to generate signed document URL. The document may not have been finalized correctly.');
  }

  return {
    ...data,
    signed_url: signedData?.signedUrl || data.file_url,
  };
}

async function deleteDocument(documentId, ownerId, permanent = false) {
  if (!documentId) {
    throw new ApiError(400, 'Document ID is required');
  }

  // First check if document exists and user owns it
  // Don't filter by deleted_at here - we want to allow deleting already-deleted docs permanently
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, owner_id, status, deleted_at')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    console.error(`[DeleteDocument] Document not found: ${documentId}`, docError);
    throw new ApiError(404, 'Document not found');
  }
  if (doc.owner_id !== ownerId) {
    throw new ApiError(403, 'Access denied');
  }
  
  // If already deleted and trying soft delete again, return success
  if (!permanent && doc.deleted_at) {
    console.log(`[DeleteDocument] Document ${documentId} is already deleted`);
    return { deleted: true, permanent: false };
  }

  if (permanent) {
    // Permanent delete: remove files and database record
    const pathsToRemove = [
      `${doc.owner_id}/${doc.id}.pdf`,
      `${doc.owner_id}/${doc.id}_signed.pdf`,
    ].filter(Boolean);
    await supabase.storage.from(BUCKET).remove(pathsToRemove);

    await supabase.from('audit_logs').delete().eq('document_id', documentId);
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      throw new ApiError(500, 'Failed to permanently delete document');
    }
    return { deleted: true, permanent: true };
  } else {
    // Soft delete: set deleted_at timestamp
    const deletedAt = new Date().toISOString();
    console.log(`[DeleteDocument] Soft deleting document ${documentId} for user ${ownerId}, setting deleted_at to ${deletedAt}`);
    
    const { data: updateData, error: updateError } = await supabase
      .from('documents')
      .update({ deleted_at: deletedAt })
      .eq('id', documentId)
      .eq('owner_id', ownerId) // Ensure user owns the document
      .select('id, deleted_at')
      .single();

    if (updateError) {
      console.error(`[DeleteDocument] Error updating deleted_at:`, updateError);
      // Check if column doesn't exist
      if (updateError.message && updateError.message.includes('column') && updateError.message.includes('deleted_at')) {
        throw new ApiError(500, 'deleted_at column does not exist. Please run the migration SQL: ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;');
      }
      throw new ApiError(500, `Failed to delete document: ${updateError.message || 'Database error'}`);
    }
    
    if (!updateData) {
      console.error(`[DeleteDocument] No data returned after update`);
      throw new ApiError(500, 'Failed to delete document: No data returned');
    }
    
    console.log(`[DeleteDocument] Successfully soft deleted document ${documentId}:`, {
      id: updateData.id,
      deleted_at: updateData.deleted_at,
    });
    
    return { deleted: true, permanent: false };
  }
}

async function restoreDocument(documentId, ownerId) {
  if (!documentId) {
    throw new ApiError(400, 'Document ID is required');
  }

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, owner_id, deleted_at')
    .eq('id', documentId)
    .single();

  if (docError || !doc) {
    throw new ApiError(404, 'Document not found');
  }
  if (doc.owner_id !== ownerId) {
    throw new ApiError(403, 'Access denied');
  }
  if (!doc.deleted_at) {
    throw new ApiError(400, 'Document is not deleted');
  }

  const { error: updateError } = await supabase
    .from('documents')
    .update({ deleted_at: null })
    .eq('id', documentId);

  if (updateError) {
    throw new ApiError(500, 'Failed to restore document');
  }
  return { restored: true };
}

module.exports = { uploadDocument, listDocuments, listDeletedDocuments, getDocumentById, deleteDocument, restoreDocument };
