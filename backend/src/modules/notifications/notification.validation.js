const { Joi, Segments } = require('celebrate');

// ── GET /api/notifications ────────────────────────────────────────────────────
const listNotificationsSchema = {
  [Segments.QUERY]: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    type:       Joi.string().valid(
      'STOLEN_DETECTED',
      'ENFORCEMENT_HIT',
      'TICKET_ISSUED',
      'SYSTEM_ERROR',
      'GATE_OFFLINE',
      'PAYMENT_RECEIVED'
    ).optional(),
    severity:   Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').optional(),
    is_read:    Joi.boolean().optional(),
    gate_id:    Joi.string().uuid({ version: 'uuidv4' }).optional(),
    vehicle_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    date_from:  Joi.date().iso().optional(),
    date_to:    Joi.date().iso().optional(),
    sort_by:    Joi.string().valid('created_at', 'type', 'severity', 'is_read').default('created_at'),
    sort_order: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
  }),
};

// ── /api/notifications/:id ────────────────────────────────────────────────────
const notificationIdSchema = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid notification ID format. Must be a valid UUID.',
      'any.required': 'Notification ID parameter is required.',
    }),
  }),
};

module.exports = {
  listNotificationsSchema,
  notificationIdSchema,
};
