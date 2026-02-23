const jwt = require('jsonwebtoken');

/**
 * SECURITY: JWT Authentication Middleware
 *
 * How it secures the system:
 * - Verifies that every protected request carries a valid, unexpired JWT token
 * - Tokens are signed with a secret key only the server knows
 * - Prevents unauthenticated access to any protected resource
 * - Attaches decoded user/admin payload to req.user for downstream use
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, type: 'user' | 'admin', admin_level? }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token.',
    });
  }
};

module.exports = { authenticate };