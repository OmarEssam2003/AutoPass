const { isCelebrateError } = require('celebrate');

/**
 * SECURITY: Centralized Error Handler
 *
 * How it secures the system:
 * - Prevents stack traces and internal error details from leaking to clients
 *   (attackers use stack traces to map the system and find vulnerabilities)
 * - Formats Joi/Celebrate validation errors into a clean, consistent structure
 * - Handles PostgreSQL unique constraint violations gracefully
 * - In production, generic messages are returned; details stay in server logs only
 */
const errorHandler = (err, req, res, next) => {
  // ── Celebrate / Joi Validation Errors ──────────────────────────────────────
  if (isCelebrateError(err)) {
    const details = [];
    for (const [, joiError] of err.details.entries()) {
      joiError.details.forEach((d) => {
        details.push({
          field: d.path.join('.'),
          message: d.message,
        });
      });
    }
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed',
      details,
    });
  }

  // ── PostgreSQL Unique Violation (code 23505) ───────────────────────────────
  if (err.code === '23505') {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    return res.status(409).json({
      status: 'error',
      message: `A record with this ${field} already exists.`,
    });
  }

  // ── PostgreSQL Foreign Key Violation (code 23503) ─────────────────────────
  if (err.code === '23503') {
    return res.status(400).json({
      status: 'error',
      message: 'Referenced record does not exist.',
    });
  }

  // ── Custom App Errors (thrown with a statusCode) ──────────────────────────
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  // ── Catch-All: Unknown Errors ─────────────────────────────────────────────
  console.error('Unhandled error:', err); // log full error server-side only
  return res.status(500).json({
    status: 'error',
    message:
      process.env.NODE_ENV === 'production'
        ? 'An internal server error occurred.'
        : err.message, // show real message in dev only
  });
};

module.exports = errorHandler;