require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const morgan     = require('morgan');
const swaggerUi  = require('swagger-ui-express');

const swaggerSpec           = require('./config/swagger');
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
const detectionEventRoutes  = require('./modules/detection-events/detectionEvent.routes');   // fixed casing
const ticketRoutes          = require('./modules/tickets/ticket.routes');
const paymentRoutes         = require('./modules/payments/payment.routes');
const paymentTicketRoutes   = require('./modules/paymenttickets/paymentTicket.routes');     // fixed path + casing
const alertRoutes           = require('./modules/alerts/alert.routes');
const auditLogRoutes        = require('./modules/auditlogs/auditLog.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const dashboardRouter = require('./dashboard.router');
const errorHandler          = require('./middlewares/error.middleware');
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
      // Allow:
      //  - No origin (mobile apps, Postman, curl)
      //  - null origin (HTML files opened directly from filesystem via file://)
      //  - Whitelisted origins from ALLOWED_ORIGINS env variable
      if (!origin || origin === 'null' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],  // x-api-key for Raspberry Pi
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
      persistAuthorization: true,
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
app.use('/api/gates',                gateRoutes);          // registered once only
app.use('/api/vehicles',             vehicleRoutes);
app.use('/api/vehicle-ownerships',   ownershipRoutes);
app.use('/api/vehicle-rentals',      rentalRoutes);
app.use('/api/vehicle-enforcements', enforcementRoutes);
app.use('/api/pricing-rules',        pricingRuleRoutes);
app.use('/api/detection-events',     detectionEventRoutes);
app.use('/api/tickets',              ticketRoutes);
app.use('/api/payments',             paymentRoutes);
app.use('/api/payment-tickets',      paymentTicketRoutes);
app.use('/api/alerts',               alertRoutes);
app.use('/api/audit-logs',           auditLogRoutes);
app.use('/api/notifications',        notificationRoutes);
app.use('/dashboard',                dashboardRouter);  // add BEFORE your /api routes

// Note: Gate routes are registered once here, not nested under zones, to keep
// the API simpler and more consistent. The gate controller will still enforce
// that gates belong to the correct zones.

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:    'ok',
    service:   'AutoPass Backend',
    timestamp: new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 404 HANDLER
// ─────────────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    status:  'error',
    message: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ERROR HANDLER (must be last)
// ─────────────────────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
