require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec  = require('./config/swagger');
const authRoutes            = require('./modules/auth/auth.routes');
const userRoutes            = require('./modules/users/user.routes');
const adminRoutes           = require('./modules/admins/admin.routes');
const zoneRoutes            = require('./modules/zones/zone.routes');
const gateRoutes            = require('./modules/gates/gate.routes');
const vehicleRoutes         = require('./modules/vehicles/vehicle.routes');
const ownershipRoutes       = require('./modules/vehicle-ownerships/vehicleOwnership.routes');
const rentalRoutes          = require('./modules/vehicle-rentals/vehicleRental.routes');
const enforcementRoutes     = require('./modules/vehicle-enforcements/vehicleEnforcement.routes');
const pricingRuleRoutes     = require('./modules/pricing-rules/pricingRule.routes');
const detectionEventRoutes  = require('./modules/detection-events/detectionevent.routes');
const ticketRoutes          = require('./modules/tickets/ticket.routes');
const errorHandler = require('./middlewares/error.middleware');
const { applyGeneralLimit } = require('./middlewares/rateLimiter.middleware');

const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SECURITY: Helmet – HTTP Security Headers
 * Sets headers like X-Content-Type-Options, X-Frame-Options, HSTS,
 * Referrer-Policy, etc. Blocks a wide range of common web attacks.
 */
app.use(helmet());

/**
 * SECURITY: CORS – Cross-Origin Resource Sharing Policy
 * Only whitelisted origins can call this API.
 * Prevents malicious websites from making requests on behalf of your users.
 */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

/**
 * SECURITY: General Rate Limiting
 * Applied globally — 100 requests/minute per IP before throttling.
 */
app.use(applyGeneralLimit);

// ─────────────────────────────────────────────────────────────────────────────
// STANDARD MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────

// Parse JSON bodies — limit set to prevent oversized payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logging (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ─────────────────────────────────────────────────────────────────────────────
// API DOCUMENTATION
// ─────────────────────────────────────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'AutoPass API Docs',
    swaggerOptions: {
      persistAuthorization: true, // keeps JWT token across page refreshes
      docExpansion: 'list',
    },
  })
);

// Expose raw swagger JSON (useful for code generators)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/auth',                 authRoutes);
app.use('/api/users',                userRoutes);
app.use('/api/admins',               adminRoutes);
app.use('/api/zones',                zoneRoutes);
app.use('/api/gates',                gateRoutes);
app.use('/api/vehicles',             vehicleRoutes);
app.use('/api/vehicle-ownerships',   ownershipRoutes);
app.use('/api/vehicle-rentals',      rentalRoutes);
app.use('/api/vehicle-enforcements', enforcementRoutes);
app.use('/api/pricing-rules',        pricingRuleRoutes);
app.use('/api/detection-events',     detectionEventRoutes);
app.use('/api/tickets',              ticketRoutes);
app.use('/api/gates',  gateRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'AutoPass Backend',
    timestamp: new Date().toISOString(),
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER (must be last)
// ─────────────────────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;