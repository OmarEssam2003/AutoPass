const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid ownership ID format. Must be a valid UUID.',
      'any.required': 'Ownership ID parameter is required.',
    }),
  }),
};

// ── POST /vehicle-ownerships ──────────────────────────────────────────────────
// User enters the PLATE NUMBER of the car they are claiming — not a UUID
const createOwnershipSchema = {
  [Segments.BODY]: Joi.object({
    plate_number: Joi.string().trim().min(2).max(20).required().messages({
      'any.required': 'Plate number is required.',
      'string.min':   'Plate number must be at least 2 characters.',
      'string.max':   'Plate number cannot exceed 20 characters.',
    }),
  }),
};

// ── POST /vehicle-ownerships/verify ───────────────────────────────────────────
const verifyOwnershipSchema = {
  [Segments.BODY]: Joi.object({
    ownership_id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid ownership ID format. Must be a valid UUID.',
      'any.required': 'Ownership ID is required.',
    }),
    otp: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
      'string.length':       'OTP must be exactly 6 digits.',
      'string.pattern.base': 'OTP must contain only digits.',
      'any.required':        'OTP is required.',
    }),
  }),
};

// ── GET /vehicle-ownerships ───────────────────────────────────────────────────
const listOwnershipsSchema = {
  [Segments.QUERY]: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    verified:   Joi.boolean().optional(),
    vehicle_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
    user_id:    Joi.string().uuid({ version: 'uuidv4' }).optional(),
  }),
};

// ── GET /vehicle-ownerships/:id  &  DELETE /vehicle-ownerships/:id ────────────
const idParamSchema = uuidParam;

module.exports = {
  createOwnershipSchema,
  verifyOwnershipSchema,
  listOwnershipsSchema,
  idParamSchema,
};