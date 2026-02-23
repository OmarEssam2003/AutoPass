/**
 * SECURITY: Role-Based Access Control (RBAC) Middleware
 *
 * How it secures the system:
 * - Enforces that only specific admin roles can perform sensitive operations
 * - Even with a valid JWT, a FINANCE_ADMIN cannot delete users (only SUPER_ADMIN can)
 * - Principle of least privilege: each role only gets what it needs
 * - Admin levels: SUPER_ADMIN > SECURITY_ADMIN > FINANCE_ADMIN > OPERATOR
 */

/**
 * Require that the requester is any authenticated admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.type !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Forbidden. Admin access required.',
    });
  }
  next();
};

/**
 * Require that the requester is one of the specified admin levels
 * @param  {...string} levels - e.g. 'SUPER_ADMIN', 'SECURITY_ADMIN'
 */
const requireRole = (...levels) => {
  return (req, res, next) => {
    if (!req.user || req.user.type !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden. Admin access required.',
      });
    }

    if (!levels.includes(req.user.admin_level)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden. Required role(s): ${levels.join(', ')}. Your role: ${req.user.admin_level}.`,
      });
    }

    next();
  };
};

/**
 * Allow the request if the caller is the owner of the resource (user_id match)
 * OR if the caller is an admin with one of the allowed levels.
 * Used for endpoints like GET /users/:id where both the user and admins can access.
 * @param  {...string} adminLevels
 */
const requireSelfOrRole = (...adminLevels) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' });
    }

    const isSelf =
      req.user.type === 'user' && req.user.id === req.params.id;

    const isAllowedAdmin =
      req.user.type === 'admin' && adminLevels.includes(req.user.admin_level);

    if (isSelf || isAllowedAdmin) {
      return next();
    }

    return res.status(403).json({
      status: 'error',
      message: 'Forbidden. You can only access your own data.',
    });
  };
};

module.exports = { requireAdmin, requireRole, requireSelfOrRole };