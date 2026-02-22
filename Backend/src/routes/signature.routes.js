const express = require('express');
const signatureController = require('../controllers/signature.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authMiddleware);
router.post('/', signatureController.create);
router.post('/finalize', signatureController.finalize);
router.put('/:id', signatureController.update);
// Keep this last to avoid route conflicts
router.get('/:documentId', signatureController.getByDocumentId);

module.exports = router;
