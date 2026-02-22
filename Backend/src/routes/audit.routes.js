const express = require('express');
const auditController = require('../controllers/audit.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.get('/:documentId', auditController.getByDocumentId);

module.exports = router;
