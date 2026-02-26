const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createEnforcement,
  getAllEnforcements,
  getEnforcementById,
  updateEnforcement,
  deleteEnforcement,
} = require('./vehicleenforcement.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createEnforcementSchema,
  listEnforcementsSchema,
  updateEnforcementSchema,
  idParamSchema,
} = require('./vehicleenforcement.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /vehicle-enforcements      → SUPER_ADMIN, OPERATOR
//  GET    /vehicle-enforcements      → All admin levels
//  GET    /vehicle-enforcements/:id  → All admin levels
//  PUT    /vehicle-enforcements/:id  → SUPER_ADMIN, OPERATOR
//  DELETE /vehicle-enforcements/:id  → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /vehicle-enforcements:
 *   post:
 *     summary: Flag a vehicle for enforcement (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Creates an enforcement record for a vehicle using its plate number.
 *       Enforced vehicles will be flagged at gates during detection events.
 *
 *       **Rules:**
 *       - Plate number must exist in the vehicles table
 *       - A vehicle can only have one **active** enforcement at a time
 *       - Deactivate the existing record before creating a new one
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEnforcementBody'
 *           example:
 *             plate_number: "ABC 1234"
 *             reason: "Vehicle reported stolen by owner"
 *             notes: "Owner reported at Cairo police station on 2026-02-20"
 *             is_active: true
 *     responses:
 *       201:
 *         description: Enforcement record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Enforcement record created for vehicle ABC 1234. }
 *                 data:
 *                   $ref: '#/components/schemas/EnforcementResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Vehicle with that plate number not found
 *       409:
 *         description: Vehicle already has an active enforcement record
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(createEnforcementSchema),
  createEnforcement
);

/**
 * @swagger
 * /vehicle-enforcements:
 *   get:
 *     summary: List all enforcement records (All admin levels)
 *     description: >
 *       Returns a paginated list of enforcement records.
 *       Supports filtering by plate number, active status, and reporting admin.
 *     tags: [Vehicle Enforcements]
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
 *         name: plate_number
 *         schema: { type: string }
 *         description: Search by plate number (partial match)
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *         description: Filter by active status
 *       - in: query
 *         name: reported_by
 *         schema: { type: string, format: uuid }
 *         description: Filter by the admin who created the record
 *     responses:
 *       200:
 *         description: List of enforcement records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EnforcementResponse'
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
  celebrate(listEnforcementsSchema),
  getAllEnforcements
);

/**
 * @swagger
 * /vehicle-enforcements/{id}:
 *   get:
 *     summary: Get an enforcement record by ID (All admin levels)
 *     description: Returns full details of a single enforcement record including vehicle and reporting admin info.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the enforcement record
 *     responses:
 *       200:
 *         description: Enforcement record data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/EnforcementResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin access required
 *       404:
 *         description: Enforcement record not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getEnforcementById
);

/**
 * @swagger
 * /vehicle-enforcements/{id}:
 *   put:
 *     summary: Update an enforcement record (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Updates the reason, notes, or active status of an enforcement record.
 *       To lift an enforcement, set `is_active` to `false`.
 *       At least one field must be provided.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the enforcement record to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEnforcementBody'
 *           example:
 *             is_active: false
 *             notes: "Vehicle recovered — enforcement lifted on 2026-02-25"
 *     responses:
 *       200:
 *         description: Enforcement record updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Enforcement record updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/EnforcementResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Enforcement record not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(updateEnforcementSchema),
  updateEnforcement
);

/**
 * @swagger
 * /vehicle-enforcements/{id}:
 *   delete:
 *     summary: Delete an enforcement record (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Permanently deletes an enforcement record.
 *       Consider using `PUT` to set `is_active: false` instead,
 *       to preserve the audit trail.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the enforcement record to delete
 *     responses:
 *       200:
 *         description: Enforcement record deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:         { type: string, example: success }
 *                 message:        { type: string, example: Enforcement record deleted successfully. }
 *                 enforcement_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Enforcement record not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteEnforcement
);

module.exports = router;