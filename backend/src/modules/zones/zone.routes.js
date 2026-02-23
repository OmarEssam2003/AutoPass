const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone,
} = require('./zone.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createZoneSchema,
  listZonesSchema,
  updateZoneSchema,
  idParamSchema,
} = require('./zone.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /zones      → SUPER_ADMIN, OPERATOR
//  GET    /zones      → All admin levels
//  GET    /zones/:id  → All admin levels
//  PUT    /zones/:id  → SUPER_ADMIN, OPERATOR
//  DELETE /zones/:id  → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /zones:
 *   post:
 *     summary: Create a new zone (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Creates a new zone. Zones group gates together and define a
 *       deduplication window — the minimum number of minutes that must
 *       pass before the same vehicle can generate a new ticket in the
 *       same zone. Defaults to 15 minutes if not provided.
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateZoneBody'
 *           example:
 *             zone_name: "Main Entrance Zone"
 *             deduplication_window_minutes: 15
 *     responses:
 *       201:
 *         description: Zone created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Zone created successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/ZoneResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
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
  celebrate(createZoneSchema),
  createZone
);

/**
 * @swagger
 * /zones:
 *   get:
 *     summary: List all zones (All admin levels)
 *     description: Returns a paginated, searchable list of all zones.
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Results per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by zone name
 *     responses:
 *       200:
 *         description: List of zones
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ZoneResponse'
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
  celebrate(listZonesSchema),
  getAllZones
);

/**
 * @swagger
 * /zones/{id}:
 *   get:
 *     summary: Get a zone by ID (All admin levels)
 *     description: Returns a single zone's details.
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the zone
 *         example: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *     responses:
 *       200:
 *         description: Zone data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/ZoneResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin access required
 *       404:
 *         description: Zone not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getZoneById
);

/**
 * @swagger
 * /zones/{id}:
 *   put:
 *     summary: Update a zone (SUPER_ADMIN, OPERATOR)
 *     description: Updates zone name and/or deduplication window. At least one field required.
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the zone to update
 *         example: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateZoneBody'
 *           example:
 *             zone_name: "North Gate Zone"
 *             deduplication_window_minutes: 30
 *     responses:
 *       200:
 *         description: Zone updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Zone updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/ZoneResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Zone not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(updateZoneSchema),
  updateZone
);

/**
 * @swagger
 * /zones/{id}:
 *   delete:
 *     summary: Delete a zone (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Permanently deletes a zone. Note that gates referencing this zone
 *       will have their zone_id set to NULL (foreign key with no CASCADE).
 *       Make sure to reassign or deactivate related gates before deleting.
 *     tags: [Zones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the zone to delete
 *         example: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *     responses:
 *       200:
 *         description: Zone deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Zone deleted successfully. }
 *                 zone_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Zone not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteZone
);

module.exports = router;