const express = require('express');
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Profile update route
router.put('/profile', authMiddleware, (req, res, next) => {
  authController.updateProfile(req, res, next);
});

router.put('/password', authMiddleware, authController.changePassword);

router.get('/2fa/status', authMiddleware, authController.get2FAStatus);
router.post('/2fa/setup', authMiddleware, authController.setup2FA);
router.post('/2fa/verify', authMiddleware, authController.verify2FA);
router.post('/2fa/disable', authMiddleware, authController.disable2FA);
router.post('/2fa/complete-login', authController.complete2FALogin);

module.exports = router;
