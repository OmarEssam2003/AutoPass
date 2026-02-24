const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
} = require('./vehicle.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createVehicleSchema,
  listVehiclesSchema,
  updateVehicleSchema,
  idParamSchema,
} = require('./vehicle.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /vehicles      → Any authenticated user or admin
//  GET    /vehicles      → Admins only (all vehicles)
//  GET    /vehicles/:id  → Admins (any) OR user who owns the vehicle
//  PUT    /vehicles/:id  → SUPER_ADMIN, OPERATOR
//  DELETE /vehicles/:id  → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /vehicles:
 *   post:
 *     summary: Register a new vehicle (Any authenticated user or admin)
 *     description: >
 *       Registers a new vehicle in the system. Any authenticated user or admin
 *       can register a vehicle. After registration, a user should create a
 *       vehicle ownership record to link themselves to this vehicle.
 *       Plate numbers are automatically normalized to uppercase.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateVehicleBody'
 *           example:
 *             plate_number: "ABC 1234"
 *             vehicle_type: "Sedan"
 *             make: "Toyota"
 *             model: "Corolla"
 *             color: "White"
 *             owner_phone_number: "+201001234567"
 *     responses:
 *       201:
 *         description: Vehicle registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Vehicle created successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/VehicleResponse'
 *       401:
 *         description: Unauthorized — must be logged in
 *       409:
 *         description: Plate number already registered
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
  celebrate(createVehicleSchema),
  createVehicle
);

/**
 * @swagger
 * /vehicles:
 *   get:
 *     summary: List all vehicles (Admins only)
 *     description: >
 *       Returns a paginated list of all vehicles in the system.
 *       Accessible by all admin levels. Regular users cannot access this endpoint —
 *       they use GET /vehicles/:id to access their own vehicle.
 *     tags: [Vehicles]
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
 *         name: vehicle_type
 *         schema: { type: string }
 *         description: Filter by vehicle type (partial match)
 *       - in: query
 *         name: make
 *         schema: { type: string }
 *         description: Filter by manufacturer (partial match)
 *       - in: query
 *         name: color
 *         schema: { type: string }
 *         description: Filter by color (partial match)
 *       - in: query
 *         name: plate_number
 *         schema: { type: string }
 *         description: Search by plate number (partial match)
 *       - in: query
 *         name: owner_phone_number
 *         schema: { type: string }
 *         description: Filter by owner phone number (partial match)
 *     responses:
 *       200:
 *         description: List of vehicles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VehicleResponse'
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
  celebrate(listVehiclesSchema),
  getAllVehicles
);

/**
 * @swagger
 * /vehicles/{id}:
 *   get:
 *     summary: Get a vehicle by ID (Admins or verified vehicle owner)
 *     description: >
 *       Returns a single vehicle's details.
 *       - **Admins** (any level) can fetch any vehicle.
 *       - **Regular users** can only fetch vehicles they are a verified owner of
 *         (checked against vehicle_ownerships table). Returns 403 otherwise.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the vehicle
 *         example: "e5f6a7b8-c9d0-1234-efab-345678901234"
 *     responses:
 *       200:
 *         description: Vehicle data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/VehicleResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — not a verified owner of this vehicle
 *       404:
 *         description: Vehicle not found
 */
router.get(
  '/:id',
  authenticate,
  celebrate(idParamSchema),
  getVehicleById
);

/**
 * @swagger
 * /vehicles/{id}:
 *   put:
 *     summary: Update a vehicle (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Updates vehicle details. All fields are optional but at least one must
 *       be provided. Plate numbers are normalized to uppercase automatically.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the vehicle to update
 *         example: "e5f6a7b8-c9d0-1234-efab-345678901234"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateVehicleBody'
 *           example:
 *             color: "Black"
 *             model: "Camry"
 *     responses:
 *       200:
 *         description: Vehicle updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Vehicle updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/VehicleResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: Plate number already in use
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(updateVehicleSchema),
  updateVehicle
);

/**
 * @swagger
 * /vehicles/{id}:
 *   delete:
 *     summary: Delete a vehicle (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Permanently deletes a vehicle and all related records
 *       (ownerships, rentals, enforcements) due to ON DELETE CASCADE.
 *       This action is irreversible.
 *     tags: [Vehicles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the vehicle to delete
 *         example: "e5f6a7b8-c9d0-1234-efab-345678901234"
 *     responses:
 *       200:
 *         description: Vehicle deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:      { type: string, example: success }
 *                 message:     { type: string, example: Vehicle deleted successfully. }
 *                 vehicle_id:  { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Vehicle not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteVehicle
);

module.exports = router;