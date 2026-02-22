const signerService = require('../services/signer.service');
const { ApiError } = require('../utils/ApiError');

async function addSigners(req, res, next) {
  try {
    const userId = req.user.id;
    const { documentId, signers, requiresOrder, expiresAt } = req.body;

    if (!documentId || !signers || !Array.isArray(signers)) {
      throw new ApiError(400, 'documentId and signers array are required');
    }

    const result = await signerService.addSigners(
      documentId,
      userId,
      signers,
      requiresOrder || false,
      expiresAt || null
    );

    res.status(201).json({
      message: 'Signers added successfully',
      signers: result.signers,
      emailResults: result.emailResults,
    });
  } catch (err) {
    next(err);
  }
}

async function getSigners(req, res, next) {
  try {
    const userId = req.user.id;
    const { documentId } = req.params;

    const signers = await signerService.getDocumentSigners(documentId, userId);
    res.status(200).json(signers);
  } catch (err) {
    next(err);
  }
}

async function verifyToken(req, res, next) {
  try {
    const { documentId, token } = req.query;

    if (!documentId || !token) {
      throw new ApiError(400, 'documentId and token are required');
    }

    const { signer, document } = await signerService.verifySignerToken(documentId, token);
    res.status(200).json({
      signer: {
        id: signer.id,
        email: signer.email,
        name: signer.name,
        role: signer.role,
        status: signer.status,
      },
      document: {
        id: document.id,
        title: document.title,
        file_url: document.file_url,
        signed_url: document.signed_url,
        status: document.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function acceptAndSign(req, res, next) {
  try {
    const { documentId, token, x, y, page } = req.body;
    const ipAddress = req.ip || req.connection?.remoteAddress;

    if (!documentId || !token) {
      throw new ApiError(400, 'documentId and token are required');
    }

    const result = await signerService.acceptAndSign(documentId, token, ipAddress, { x, y, page });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function updateSignerStatus(req, res, next) {
  try {
    const { signerId } = req.params;
    const { status } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!status || !['signed', 'rejected', 'viewed'].includes(status)) {
      throw new ApiError(400, 'Valid status is required (signed, rejected, or viewed)');
    }

    const updatedSigner = await signerService.updateSignerStatus(signerId, status, ipAddress);
    res.status(200).json({ signer: updatedSigner });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addSigners,
  getSigners,
  verifyToken,
  acceptAndSign,
  updateSignerStatus,
};
