const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid ticket ID format. Must be a valid UUID.',
      'any.required': 'Ticket ID parameter is required.',
    }),
  }),
};

// ── GET /tickets ──────────────────────────────────────────────────────────────
const listTicketsSchema = {
  [Segments.QUERY]: Joi.object({
    page:            Joi.number().integer().min(1).default(1),
    limit:           Joi.number().integer().min(1).max(100).default(20),
    status:          Joi.string().valid('UNPAID', 'PAID', 'DISPUTED', 'CANCELLED').optional(),
    charged_user_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    vehicle_id:      Joi.string().uuid({ version: 'uuidv4' }).optional(),
    charged_as:      Joi.string().valid('OWNER', 'RENTER').optional(),
    from:            Joi.date().iso().optional(),
    to:              Joi.date().iso().min(Joi.ref('from')).optional().messages({
      'date.min': '"to" date must be after "from" date.',
    }),
  }),
};

// ── PATCH /tickets/:id/pay ────────────────────────────────────────────────────
// Called by the user from the mobile app to pay their ticket
const payTicketSchema = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid ticket ID format.',
      'any.required': 'Ticket ID is required.',
    }),
  }),
};

// ── PUT /tickets/:id ──────────────────────────────────────────────────────────
// Admin manual update — status override, amount correction, etc.
const updateTicketSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    status: Joi.string().valid('UNPAID', 'PAID', 'DISPUTED', 'CANCELLED').optional(),
    amount: Joi.number().precision(2).min(0).optional().messages({
      'number.min': 'Amount cannot be negative.',
    }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /tickets/:id  &  DELETE /tickets/:id ──────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  listTicketsSchema,
  payTicketSchema,
  updateTicketSchema,
  idParamSchema,
};