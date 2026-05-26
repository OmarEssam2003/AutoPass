const { Joi, Segments } = require('celebrate');

// ── Alert types ───────────────────────────────────────────────────────────────
// User-facing (user_id set, admin_id null)  → mobile app bell icon
// Admin-facing (admin_id set, user_id null) → dashboard
const ALERT_TYPES = [
  // User-facing
  'TICKET_ISSUED',
  'PAYMENT_RECEIVED',
  'RENTAL_REQUEST',
  'RENTAL_ACCEPTED',
  'RENTAL_REJECTED',
  'RENTAL_CANCELLED',
  'VEHICLE_VERIFIED',
  'BALANCE_LOW',
  'GENERAL',
  // Admin-facing
  'STOLEN_DETECTED',
  'ENFORCEMENT_HIT',
  'SYSTEM_ERROR',
  'GATE_OFFLINE',
];

// ── GET /api/alerts  (admin — all alerts with filters) ────────────────────────
const listAlertsSchema = {
  [Segments.QUERY]: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    type:       Joi.string().valid(...ALERT_TYPES).optional(),
    is_read:    Joi.boolean().optional(),
    user_id:    Joi.string().uuid({ version: 'uuidv4' }).optional(),
    admin_id:   Joi.string().uuid({ version: 'uuidv4' }).optional(),
    sort_by:    Joi.string().valid('created_at', 'type', 'is_read').default('created_at'),
    sort_order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
  }),
};

// ── GET /api/alerts/my  (user — own bell alerts) ──────────────────────────────
const listMyAlertsSchema = {
  [Segments.QUERY]: Joi.object({
    page:    Joi.number().integer().min(1).default(1),
    limit:   Joi.number().integer().min(1).max(100).default(20),
    type:    Joi.string().valid(...ALERT_TYPES).optional(),
    is_read: Joi.boolean().optional(),
  }),
};

// ── POST /api/alerts  (admin manual create) ───────────────────────────────────
// Only columns that actually exist: user_id, admin_id, type, message
const createAlertSchema = {
  [Segments.BODY]: Joi.object({
    user_id:  Joi.string().uuid({ version: 'uuidv4' }).allow(null).optional(),
    admin_id: Joi.string().uuid({ version: 'uuidv4' }).allow(null).optional(),
    type:     Joi.string().valid(...ALERT_TYPES).required().messages({
      'any.required': 'Alert type is required.',
      'any.only':     'Invalid alert type.',
    }),
    message:  Joi.string().max(2000).required().messages({
      'any.required': 'Message is required.',
    }),
  }),
};

// ── /api/alerts/:id ───────────────────────────────────────────────────────────
const alertIdSchema = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid alert ID format. Must be a valid UUID.',
      'any.required': 'Alert ID parameter is required.',
    }),
  }),
};

// ── PATCH /api/alerts/:id/read ────────────────────────────────────────────────
const updateAlertStatusSchema = alertIdSchema;

module.exports = {
  listAlertsSchema,
  listMyAlertsSchema,
  createAlertSchema,
  updateAlertStatusSchema,
  alertIdSchema,
};
