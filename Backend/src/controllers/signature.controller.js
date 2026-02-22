const signatureService = require('../services/signature.service');

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || null;
}

async function create(req, res, next) {
  try {
    const { documentId, signerId, x, y, page, label } = req.body;
    const sig = await signatureService.createSignature(
      documentId,
      signerId ?? req.user.id,
      x,
      y,
      page,
      getClientIp(req),
      label // Pass the label (full name or initials)
    );
    res.status(201).json(sig);
  } catch (err) {
    next(err);
  }
}

async function getByDocumentId(req, res, next) {
  try {
    const signatures = await signatureService.getSignaturesByDocumentId(req.params.documentId, req.user.id);
    res.status(200).json(signatures);
  } catch (err) {
    next(err);
  }
}

async function finalize(req, res, next) {
  try {
    const { documentId, signatureLabel, signatureStyle, signatureColor } = req.body;
    const result = await signatureService.finalizeSignatures(
      documentId,
      req.user.id,
      getClientIp(req),
      signatureLabel,
      signatureStyle,
      signatureColor
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const { x, y, page } = req.body;
    const sig = await signatureService.updateSignature(
      id,
      req.user.id,
      x,
      y,
      page
    );
    res.status(200).json(sig);
  } catch (err) {
    next(err);
  }
}

module.exports = { create, getByDocumentId, finalize, update };
