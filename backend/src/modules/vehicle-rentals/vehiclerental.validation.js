const { Joi, Segments } = require('celebrate');

const uuidParam = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid rental ID format. Must be a valid UUID.',
      'any.required': 'Rental ID parameter is required.',
    }),
  }),
};

// ── POST /vehicle-rentals ─────────────────────────────────────────────────────
// Created by the vehicle OWNER — they enter their car plate number, renter email, and dates
const createRentalSchema = {
  [Segments.BODY]: Joi.object({
    plate_number: Joi.string().trim().min(2).max(20).required().messages({
      'any.required': 'Plate number is required.',
      'string.min':   'Plate number must be at least 2 characters.',
      'string.max':   'Plate number cannot exceed 20 characters.',
    }),
    renter_email: Joi.string().email().lowercase().trim().required().messages({
      'string.email': 'Please provide a valid email address for the renter.',
      'any.required': 'Renter email is required.',
    }),
    start_date: Joi.date().iso().greater('now').required().messages({
      'date.greater': 'Start date must be in the future.',
      'any.required': 'Start date is required.',
    }),
    end_date: Joi.date().iso().greater(Joi.ref('start_date')).required().messages({
      'date.greater': 'End date must be after start date.',
      'any.required': 'End date is required.',
    }),
  }),
};

// ── GET /vehicle-rentals ──────────────────────────────────────────────────────
const listRentalsSchema = {
  [Segments.QUERY]: Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    status:     Joi.string().valid('PENDING', 'ACCEPTED', 'REJECTED').optional(),
    vehicle_id: Joi.string().uuid({ version: 'uuidv4' }).optional(),
  }),
};

// ── PATCH /vehicle-rentals/:id/status ────────────────────────────────────────
// Only the RENTER can call this — to accept or reject the request sent to them
const updateRentalStatusSchema = {
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
      'string.guid':  'Invalid rental ID format.',
      'any.required': 'Rental ID is required.',
    }),
  }),
  [Segments.BODY]: Joi.object({
    status: Joi.string().valid('ACCEPTED', 'REJECTED').required().messages({
      'any.only':     'Status must be either ACCEPTED or REJECTED.',
      'any.required': 'Status is required.',
    }),
  }),
};

// ── GET /vehicle-rentals/:id  &  DELETE /vehicle-rentals/:id ─────────────────
const idParamSchema = uuidParam;

module.exports = {
  createRentalSchema,
  listRentalsSchema,
  updateRentalStatusSchema,
  idParamSchema,
};