const { ApiError } = require('../utils/ApiError');

const errorMiddleware = (err, req, res, next) => {
  // Log the error for debugging
  console.error(`[Error Middleware] ${req.method} ${req.path}:`, {
    message: err.message,
    name: err.name,
    stack: err.stack,
    code: err.code,
  });

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  if (err.message && err.message.includes('Only PDF')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('[Error Middleware] Unhandled error:', err);
  return res.status(500).json({ error: 'Internal server error' });
};

module.exports = { errorMiddleware };
