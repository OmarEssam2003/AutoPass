const { RateLimiterMemory } = require('rate-limiter-flexible');

/**
 * SECURITY: Rate Limiting
 *
 * How it secures the system:
 * - Prevents brute-force attacks on login/auth endpoints by limiting attempts per IP
 * - Prevents API abuse and DDoS by capping general request rates
 * - Two tiers: strict (auth routes) and general (all other routes)
 * - Uses in-memory store; swap to RateLimiterRedis in production for multi-instance support
 */

// ── Strict limiter for sensitive endpoints (login, register) ──────────────────
const authLimiter = new RateLimiterMemory({
  points: 5,           // 5 attempts
  duration: 60 * 15,   // per 15 minutes
  blockDuration: 60 * 15, // block for 15 minutes after exhaustion
});

// ── General limiter for all API routes ───────────────────────────────────────
const generalLimiter = new RateLimiterMemory({
  points: 100,         // 100 requests
  duration: 60,        // per 1 minute
});

const applyAuthLimit = async (req, res, next) => {
  try {
    await authLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({
      status: 'error',
      message: 'Too many attempts. Please try again in 15 minutes.',
    });
  }
};

const applyGeneralLimit = async (req, res, next) => {
  try {
    await generalLimiter.consume(req.ip);
    next();
  } catch {
    res.status(429).json({
      status: 'error',
      message: 'Too many requests. Please slow down.',
    });
  }
};

module.exports = { applyAuthLimit, applyGeneralLimit };