const documentService = require('../services/document.service');
const { ApiError } = require('../utils/ApiError');

async function upload(req, res, next) {
  try {
    if (!req.file || !req.file.buffer) {
      return next(new ApiError(400, 'PDF file is required'));
    }
    const doc = await documentService.uploadDocument(
      req.user.id,
      req.body.title || req.file.originalname || 'Untitled',
      req.file.buffer,
      req.file.mimetype
    );
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const docs = await documentService.listDocuments(req.user.id);
    res.status(200).json(docs);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const doc = await documentService.getDocumentById(req.params.id, req.user.id);
    res.status(200).json(doc);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const permanent = req.query.permanent === 'true';
    await documentService.deleteDocument(req.params.id, req.user.id, permanent);
    res.status(200).json({ message: permanent ? 'Document permanently deleted' : 'Document moved to trash' });
  } catch (err) {
    next(err);
  }
}

async function listDeleted(req, res, next) {
  try {
    console.log(`[ListDeleted Controller] Fetching deleted documents for user ${req.user.id}`);
    const docs = await documentService.listDeletedDocuments(req.user.id);
    console.log(`[ListDeleted Controller] Returning ${docs.length} deleted documents`);
    res.status(200).json(docs);
  } catch (err) {
    console.error(`[ListDeleted Controller] Error:`, err);
    next(err);
  }
}

async function restore(req, res, next) {
  try {
    await documentService.restoreDocument(req.params.id, req.user.id);
    res.status(200).json({ message: 'Document restored' });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, list, listDeleted, getById, remove, restore };
