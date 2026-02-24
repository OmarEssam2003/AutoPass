const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createOwnership,
  verifyOwnership,
  getAllOwnerships,
  getOwnershipById,
  deleteOwnership,
} = require('./vehicleownership.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createOwnershipSchema,
  verifyOwnershipSchema,
  listOwnershipsSchema,
  idParamSchema,
} = require('./vehicleownership.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /vehicle-ownerships          → Any authenticated user (links self to vehicle)
//  POST   /vehicle-ownerships/verify   → Any authenticated user (verifies their OTP)
//  GET    /vehicle-ownerships          → Admins (all) OR users (own records only)
//  GET    /vehicle-ownerships/:id      → Admins (any) OR the owning user
//  DELETE /vehicle-ownerships/:id      → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /vehicle-ownerships:
 *   post:
 *     summary: Link yourself to a vehicle and receive an OTP
 *     description: >
 *       Creates an ownership record linking the authenticated user to a vehicle.
 *       A 6-digit OTP is generated and returned (development only — in production
 *       this would be sent via SMS/email). The OTP expires in **15 minutes**.
 *
 *       If an unverified ownership record already exists for this user+vehicle,
 *       a fresh OTP is generated and returned instead of creating a duplicate.
 *     tags: [Vehicle Ownerships]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate_number]
 *             properties:
 *               plate_number:
 *                 type: string
 *                 example: "ABC 1234"
 *                 description: The plate number of the vehicle you are claiming ownership of
 *     responses:
 *       201:
 *         description: Ownership record created — OTP issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/OwnershipOTPResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: Already a verified owner of this vehicle
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  celebrate(createOwnershipSchema),
  createOwnership
);

/**
 * @swagger
 * /vehicle-ownerships/verify:
 *   post:
 *     summary: Verify vehicle ownership using OTP
 *     description: >
 *       Submits the 6-digit OTP to verify ownership of a vehicle.
 *       On success the ownership record is marked as `verified = true`
 *       and the OTP fields are cleared from the database.
 *
 *       **Error cases:**
 *       - `401` — wrong OTP
 *       - `409` — already verified
 *       - `410` — OTP has expired (re-submit vehicle_id to get a new one)
 *     tags: [Vehicle Ownerships]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ownership_id, otp]
 *             properties:
 *               ownership_id:
 *                 type: string
 *                 format: uuid
 *                 example: "f6a7b8c9-d0e1-2345-fabc-456789012345"
 *               otp:
 *                 type: string
 *                 example: "482910"
 *                 description: 6-digit numeric OTP received after creating the ownership record
 *     responses:
 *       200:
 *         description: Ownership verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/OwnershipVerifiedResponse'
 *       401:
 *         description: Invalid OTP
 *       403:
 *         description: Forbidden — this ownership record belongs to another user
 *       404:
 *         description: Ownership record not found
 *       409:
 *         description: Already verified
 *       410:
 *         description: OTP expired — request a new one
 *       422:
 *         description: Validation error
 */
router.post(
  '/verify',
  authenticate,
  celebrate(verifyOwnershipSchema),
  verifyOwnership
);

/**
 * @swagger
 * /vehicle-ownerships:
 *   get:
 *     summary: List ownership records
 *     description: >
 *       **Admins** receive all ownership records with optional filters.
 *       **Regular users** automatically receive only their own records —
 *       the `user_id` filter is ignored for non-admin callers.
 *     tags: [Vehicle Ownerships]
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
 *         name: verified
 *         schema: { type: boolean }
 *         description: Filter by verification status
 *       - in: query
 *         name: vehicle_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by vehicle (admin only)
 *       - in: query
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by user (admin only — ignored for regular users)
 *     responses:
 *       200:
 *         description: List of ownership records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/OwnershipResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  celebrate(listOwnershipsSchema),
  getAllOwnerships
);

/**
 * @swagger
 * /vehicle-ownerships/{id}:
 *   get:
 *     summary: Get an ownership record by ID
 *     description: >
 *       Admins can fetch any ownership record.
 *       Regular users can only fetch their own records — returns 403 otherwise.
 *     tags: [Vehicle Ownerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the ownership record
 *     responses:
 *       200:
 *         description: Ownership record data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/OwnershipResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — not your ownership record
 *       404:
 *         description: Ownership record not found
 */
router.get(
  '/:id',
  authenticate,
  celebrate(idParamSchema),
  getOwnershipById
);

/**
 * @swagger
 * /vehicle-ownerships/{id}:
 *   delete:
 *     summary: Delete an ownership record (SUPER_ADMIN, OPERATOR)
 *     description: Permanently removes a vehicle-user ownership link.
 *     tags: [Vehicle Ownerships]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the ownership record to delete
 *     responses:
 *       200:
 *         description: Ownership record deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:       { type: string, example: success }
 *                 message:      { type: string, example: Ownership record deleted successfully. }
 *                 ownership_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Ownership record not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteOwnership
);

module.exports = router;