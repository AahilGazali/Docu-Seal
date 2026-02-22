const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/ApiError');

const accessSecret = process.env.JWT_ACCESS_SECRET;
if (!accessSecret) {
  throw new Error('JWT_ACCESS_SECRET must be set in environment');
}

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new ApiError(401, 'Access token required');
    }

    const decoded = jwt.verify(token, accessSecret);
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      next(new ApiError(401, 'Invalid or expired token'));
      return;
    }
    next(err);
  }
};

module.exports = { authMiddleware };
