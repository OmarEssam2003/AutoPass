const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createRental,
  getAllRentals,
  getRentalById,
  updateRentalStatus,
  deleteRental,
} = require('./vehiclerental.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createRentalSchema,
  listRentalsSchema,
  updateRentalStatusSchema,
  idParamSchema,
} = require('./vehiclerental.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /vehicle-rentals                → Verified vehicle owner (user)
//  GET    /vehicle-rentals                → Admins (all) OR users (own rentals only)
//  GET    /vehicle-rentals/:id            → Admins OR the owner/renter of that rental
//  PATCH  /vehicle-rentals/:id/status     → The renter of that specific rental only
//  DELETE /vehicle-rentals/:id            → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /vehicle-rentals:
 *   post:
 *     summary: Create a rental request (verified vehicle owner only)
 *     description: >
 *       The **vehicle owner** sends a rental request to a specific user (renter).
 *       The owner must be a verified owner of the selected vehicle.
 *       The rental starts as **PENDING** until the renter accepts or rejects it.
 *
 *       **Business rules:**
 *       - Owner cannot rent to themselves
 *       - Cannot create overlapping rentals for the same vehicle
 *       - The renter must be an active (non-blocked) user
 *     tags: [Vehicle Rentals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRentalBody'
 *           example:
 *             plate_number: "ABC 1234"
 *             renter_email: "sara@example.com"
 *             start_date:   "2026-03-01T00:00:00.000Z"
 *             end_date:     "2026-03-15T00:00:00.000Z"
 *     responses:
 *       201:
 *         description: Rental request created — waiting for renter response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/RentalResponse'
 *       400:
 *         description: Owner trying to rent to themselves
 *       403:
 *         description: You are not a verified owner of this vehicle
 *       404:
 *         description: Vehicle or renter not found
 *       409:
 *         description: Overlapping accepted rental already exists
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  celebrate(createRentalSchema),
  createRental
);

/**
 * @swagger
 * /vehicle-rentals:
 *   get:
 *     summary: List rental records
 *     description: >
 *       **Admins** receive all rental records with optional filters.
 *       **Regular users** automatically receive only rentals where they are
 *       the **owner** or the **renter** — no other rentals are visible to them.
 *     tags: [Vehicle Rentals]
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
 *         name: status
 *         schema: { type: string, enum: [PENDING, ACCEPTED, REJECTED] }
 *         description: Filter by rental status
 *       - in: query
 *         name: vehicle_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by vehicle
 *     responses:
 *       200:
 *         description: List of rental records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RentalResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  celebrate(listRentalsSchema),
  getAllRentals
);

/**
 * @swagger
 * /vehicle-rentals/{id}:
 *   get:
 *     summary: Get a rental record by ID
 *     description: >
 *       Admins can fetch any rental.
 *       Regular users can only fetch rentals they are the **owner** or **renter** of.
 *     tags: [Vehicle Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the rental record
 *     responses:
 *       200:
 *         description: Rental record data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/RentalResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — you are not involved in this rental
 *       404:
 *         description: Rental not found
 */
router.get(
  '/:id',
  authenticate,
  celebrate(idParamSchema),
  getRentalById
);

/**
 * @swagger
 * /vehicle-rentals/{id}/status:
 *   patch:
 *     summary: Accept or reject a rental request (renter only)
 *     description: >
 *       Only the **renter** that the request was sent to can accept or reject it.
 *       Only **PENDING** rentals can be updated.
 *
 *       - **ACCEPTED** → Any charges during the rental period are billed to the renter
 *       - **REJECTED** → Request is closed, no charges applied
 *
 *       Accepting re-validates for date overlaps in case another rental was
 *       accepted in the meantime.
 *     tags: [Vehicle Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the rental to respond to
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACCEPTED, REJECTED]
 *                 example: ACCEPTED
 *     responses:
 *       200:
 *         description: Rental status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/RentalResponse'
 *       403:
 *         description: Forbidden — only the designated renter can respond
 *       404:
 *         description: Rental not found
 *       409:
 *         description: Already responded to, or overlapping accepted rental exists
 *       422:
 *         description: Validation error
 */
router.patch(
  '/:id/status',
  authenticate,
  celebrate(updateRentalStatusSchema),
  updateRentalStatus
);

/**
 * @swagger
 * /vehicle-rentals/{id}:
 *   delete:
 *     summary: Delete a rental record (SUPER_ADMIN, OPERATOR)
 *     description: Permanently removes a rental record. This action is irreversible.
 *     tags: [Vehicle Rentals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the rental to delete
 *     responses:
 *       200:
 *         description: Rental deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:    { type: string, example: success }
 *                 message:   { type: string, example: Rental record deleted successfully. }
 *                 rental_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Rental not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteRental
);

module.exports = router;