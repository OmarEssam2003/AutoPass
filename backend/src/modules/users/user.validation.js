const { Joi, Segments } = require('celebrate');

/**
 * SECURITY: Input Validation & Sanitization
 *
 * How it secures the system:
 * - Every field is strictly typed and bounded before reaching the DB or service layer
 * - Prevents SQL injection attempts, oversized payloads, and malformed data
 * - Strips unknown fields (stripUnknown) so no extra data sneaks into queries
 * - Email normalized to lowercase, strings trimmed
 */

// ── Reusable field definitions ────────────────────────────────────────────────
const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid': 'Invalid user ID format. Must be a valid UUID.',
      'any.required': 'User ID parameter is required.',
    }),
  }),
};

// ── POST /users  (Create User) ────────────────────────────────────────────────
const createUserSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().max(255).required().messages({
      'string.email': 'Please provide a valid email address.',
      'any.required': 'Email is required.',
    }),
    password: Joi.string().min(8).max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters.',
        'string.pattern.base':
          'Password must contain uppercase, lowercase, a number, and a special character.',
        'any.required': 'Password is required.',
      }),
    first_name: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'First name is required.',
    }),
    middle_name: Joi.string().trim().max(100).optional().allow('', null),
    last_name: Joi.string().trim().min(2).max(100).required().messages({
      'any.required': 'Last name is required.',
    }),
    national_id: Joi.string().trim().alphanum().min(5).max(20).required().messages({
      'any.required': 'National ID is required.',
    }),
    phone_number: Joi.string().trim().max(20)
      .pattern(/^\+?[0-9]{7,20}$/)
      .required()
      .messages({
        'string.pattern.base': 'Phone number must be a valid international number.',
        'any.required': 'Phone number is required.',
      }),
    address: Joi.string().trim().max(500).optional().allow('', null),
    date_of_birth: Joi.date().iso().max('now').optional().allow(null).messages({
      'date.max': 'Date of birth cannot be in the future.',
    }),
  }),
};

// ── GET /users  (List Users with optional filters & pagination) ───────────────
const listUsersSchema = {
  [Segments.QUERY]: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    is_blocked: Joi.boolean().optional(),
    search:     Joi.string().trim().max(100).optional(), // search by name/email
  }),
};

// ── PUT /users/:id  (Update User — no password) ───────────────────────────────
const updateUserSchema = {
  ...uuidParam,
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().lowercase().trim().max(255).optional(),
    first_name:    Joi.string().trim().min(2).max(100).optional(),
    middle_name:   Joi.string().trim().max(100).optional().allow('', null),
    last_name:     Joi.string().trim().min(2).max(100).optional(),
    national_id:   Joi.string().trim().alphanum().min(5).max(20).optional(),
    phone_number:  Joi.string().trim().max(20)
      .pattern(/^\+?[0-9]{7,20}$/).optional(),
    address:       Joi.string().trim().max(500).optional().allow('', null),
    date_of_birth: Joi.date().iso().max('now').optional().allow(null),
    // Explicitly forbid password changes through this endpoint
    password: Joi.any().forbidden().messages({
      'any.unknown': 'Password cannot be changed via this endpoint.',
    }),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update.',
  }),
};

// ── GET /users/:id  &  DELETE /users/:id ─────────────────────────────────────
const idParamSchema = uuidParam;

module.exports = {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  idParamSchema,
};