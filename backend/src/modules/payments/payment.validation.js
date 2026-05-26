const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid payment ID format. Must be a valid UUID.',
      'any.required': 'Payment ID parameter is required.',
    }),
  }),
};

// ── POST /payments/pay  (single ticket) ───────────────────────────────────────
const payTicketSchema = {
  [Segments.BODY]: Joi.object({
    ticket_id: Joi.string().uuid().required().messages({
      'string.guid':  'ticket_id must be a valid UUID.',
      'any.required': 'ticket_id is required.',
    }),
    payment_method: Joi.string().trim().max(30).optional().default('MOBILE_APP'),
  }),
};

// ── POST /payments/pay-all  (all unpaid tickets for a vehicle) ────────────────
const payAllSchema = {
  [Segments.BODY]: Joi.object({
    vehicle_id: Joi.string().uuid().required().messages({
      'string.guid':  'vehicle_id must be a valid UUID.',
      'any.required': 'vehicle_id is required.',
    }),
    payment_method: Joi.string().trim().max(30).optional().default('MOBILE_APP'),
  }),
};

// ── POST /payments/:id/refund  (SUPER_ADMIN only) ─────────────────────────────
const refundSchema = {
  ...uuidParam,
};

// ── GET /payments  (admin) ────────────────────────────────────────────────────
const listPaymentsSchema = {
  [Segments.QUERY]: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    user_id:    Joi.string().uuid({ version: 'uuidv4' }).optional(),
    status:     Joi.string().valid('COMPLETED', 'FAILED', 'REFUNDED').optional(),
    from:       Joi.date().iso().optional(),
    to:         Joi.date().iso().min(Joi.ref('from')).optional().messages({
      'date.min': '"to" must be after "from".',
    }),
  }),
};

// ── GET /payments/:id ─────────────────────────────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  payTicketSchema,
  payAllSchema,
  refundSchema,
  listPaymentsSchema,
  idParamSchema,
};