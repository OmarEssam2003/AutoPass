const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createGate,
  getAllGates,
  getGateById,
  updateGate,
  deleteGate,
} = require('./gate.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createGateSchema,
  listGatesSchema,
  updateGateSchema,
  idParamSchema,
} = require('./gate.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /gates      → SUPER_ADMIN, OPERATOR
//  GET    /gates      → All admin levels
//  GET    /gates/:id  → All admin levels
//  PUT    /gates/:id  → SUPER_ADMIN, OPERATOR
//  DELETE /gates/:id  → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /gates:
 *   post:
 *     summary: Create a new gate (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Creates a new gate and optionally assigns it to a zone.
 *       The `zone_id` must refer to an existing zone.
 *       `device_serial` must be unique across all gates.
 *     tags: [Gates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGateBody'
 *           example:
 *             location_name: "North Entrance Gate A"
 *             direction: "IN"
 *             zone_id: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *             device_serial: "RPI-001-2024"
 *             is_active: true
 *     responses:
 *       201:
 *         description: Gate created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Gate created successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/GateResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Zone not found
 *       409:
 *         description: device_serial already exists
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(createGateSchema),
  createGate
);

/**
 * @swagger
 * /gates:
 *   get:
 *     summary: List all gates (All admin levels)
 *     description: >
 *       Returns a paginated list of all gates, joined with their zone name.
 *       Supports filtering by zone, direction, active status, and device serial.
 *     tags: [Gates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: zone_id
 *         schema: { type: string, format: uuid }
 *         description: Filter gates by zone
 *       - in: query
 *         name: direction
 *         schema: { type: string, enum: [IN, OUT] }
 *         description: Filter by gate direction
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *         description: Filter by active status
 *       - in: query
 *         name: device_serial
 *         schema: { type: string }
 *         description: Filter by device serial (partial match)
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by location name
 *     responses:
 *       200:
 *         description: List of gates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GateResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin access required
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listGatesSchema),
  getAllGates
);

/**
 * @swagger
 * /gates/{id}:
 *   get:
 *     summary: Get a gate by ID (All admin levels)
 *     description: Returns a single gate's details including its zone name.
 *     tags: [Gates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the gate
 *         example: "d4e5f6a7-b8c9-0123-defa-234567890123"
 *     responses:
 *       200:
 *         description: Gate data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/GateResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin access required
 *       404:
 *         description: Gate not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getGateById
);

/**
 * @swagger
 * /gates/{id}:
 *   put:
 *     summary: Update a gate (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Updates any gate field. All fields are optional but at least one must
 *       be provided. If updating `zone_id`, it must reference an existing zone.
 *     tags: [Gates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the gate to update
 *         example: "d4e5f6a7-b8c9-0123-defa-234567890123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateGateBody'
 *           example:
 *             is_active: false
 *             direction: "OUT"
 *     responses:
 *       200:
 *         description: Gate updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Gate updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/GateResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Gate or Zone not found
 *       409:
 *         description: device_serial already in use
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(updateGateSchema),
  updateGate
);

/**
 * @swagger
 * /gates/{id}:
 *   delete:
 *     summary: Delete a gate (SUPER_ADMIN, OPERATOR)
 *     description: Permanently deletes a gate. Ensure no active detection events are linked before deleting.
 *     tags: [Gates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the gate to delete
 *         example: "d4e5f6a7-b8c9-0123-defa-234567890123"
 *     responses:
 *       200:
 *         description: Gate deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Gate deleted successfully. }
 *                 gate_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Gate not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteGate
);

module.exports = router;