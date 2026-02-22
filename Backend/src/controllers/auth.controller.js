const authService = require('../services/auth.service');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const result = await authService.register(name, email, password);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(201).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    const result = await authService.refresh(token);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, language } = req.body;
    console.log(`[Auth Controller] updateProfile called for user ${userId} with:`, { name, language });
    const updatedUser = await authService.updateProfile(userId, { name, language });
    res.status(200).json({ user: updatedUser });
  } catch (err) {
    console.error('[Auth Controller] updateProfile error:', err);
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    const result = await authService.resetPassword(token, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function setup2FA(req, res, next) {
  try {
    const result = await authService.setup2FA(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function verify2FA(req, res, next) {
  try {
    const { token } = req.body;
    const result = await authService.verify2FA(req.user.id, token);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function disable2FA(req, res, next) {
  try {
    const { password } = req.body;
    const result = await authService.disable2FA(req.user.id, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function complete2FALogin(req, res, next) {
  try {
    const { tempToken, code } = req.body;
    const result = await authService.complete2FALogin(tempToken, code);
    res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ user: result.user, accessToken: result.accessToken });
  } catch (err) {
    next(err);
  }
}

async function get2FAStatus(req, res, next) {
  try {
    const result = await authService.get2FAStatus(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  updateProfile,
  forgotPassword,
  resetPassword,
  changePassword,
  setup2FA,
  verify2FA,
  disable2FA,
  complete2FALogin,
  get2FAStatus,
};
