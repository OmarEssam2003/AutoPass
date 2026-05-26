const { Joi, Segments } = require('celebrate');

// ── GET /payment-tickets ──────────────────────────────────────────────────────
// ticket_id is required — this endpoint exists solely to answer
// "which payment covered this ticket?"
const listPaymentTicketsSchema = {
  [Segments.QUERY]: Joi.object({
    ticket_id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'ticket_id must be a valid UUID.',
      'any.required': 'ticket_id is required.',
    }),
  }),
};

module.exports = { listPaymentTicketsSchema };