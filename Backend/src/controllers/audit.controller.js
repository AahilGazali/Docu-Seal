const auditService = require('../services/audit.service');

async function getByDocumentId(req, res, next) {
  try {
    const logs = await auditService.getByDocumentId(req.params.documentId, req.user.id);
    res.status(200).json(logs);
  } catch (err) {
    next(err);
  }
}

module.exports = { getByDocumentId };
