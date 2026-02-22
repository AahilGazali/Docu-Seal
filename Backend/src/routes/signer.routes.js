const express = require('express');
const signerController = require('../controllers/signer.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

// Add signers to a document (requires auth)
router.post('/add', authMiddleware, signerController.addSigners);

// Get signers for a document (requires auth - owner only)
router.get('/document/:documentId', authMiddleware, signerController.getSigners);

// Verify signing token (public endpoint for email links)
router.get('/verify', signerController.verifyToken);

// Accept and sign - embed signature into PDF (public, uses token)
router.post('/accept-and-sign', signerController.acceptAndSign);

// Update signer status (public endpoint for reject/viewed)
router.put('/:signerId/status', signerController.updateSignerStatus);

module.exports = router;
