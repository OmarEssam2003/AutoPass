const express       = require('express');
const { celebrate } = require('celebrate');
const router        = express.Router();

const {
  createEnforcement,
  reportStolen,
  withdrawStolenReport,
  getMyStolenReports,
  getAllEnforcements,
  getEnforcementById,
  updateEnforcement,
  deleteEnforcement,
} = require('./vehicleEnforcement.controller');

const { authenticate }             = require('../../middlewares/auth.middleware');
const { requireRole, requireUser } = require('../../middlewares/rbac.middleware');
const {
  createEnforcementSchema,
  reportStolenSchema,
  listEnforcementsSchema,
  listMyStolenReportsSchema,
  updateEnforcementSchema,
  idParamSchema,
} = require('./vehicleEnforcement.validation');

// =============================================================================
// ROUTE SUMMARY
//
//  USER ROUTES  (mobile app — authenticated users only)
//  ─────────────────────────────────────────────────────────────────────────────
//  POST   /vehicle-enforcements/report-stolen       → report own car stolen
//  GET    /vehicle-enforcements/my-stolen-reports   → list own stolen reports
//  PATCH  /vehicle-enforcements/:id/withdraw        → cancel own stolen report
//
//  ADMIN ROUTES  (dashboard — admin roles only)
//  ─────────────────────────────────────────────────────────────────────────────
//  POST   /vehicle-enforcements                     → create enforcement
//  GET    /vehicle-enforcements                     → list all enforcements
//  GET    /vehicle-enforcements/:id                 → get enforcement by id
//  PUT    /vehicle-enforcements/:id                 → update enforcement
//  DELETE /vehicle-enforcements/:id                 → hard delete (any enforcement)
//
// IMPORTANT: static paths (/report-stolen, /my-stolen-reports) are registered
// BEFORE the /:id wildcard so Express never mistakes them for UUID params.
// =============================================================================


// ─────────────────────────────────────────────────────────────────────────────
// USER — Report own vehicle as stolen
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements/report-stolen:
 *   post:
 *     summary: Report your vehicle as stolen (User — mobile app)
 *     description: >
 *       Allows a **verified owner** of a vehicle to report it as stolen.
 *       Immediately creates a **STOP** (priority 3 — highest urgency)
 *       enforcement. No admin approval is required.
 *
 *       - The caller must be a verified owner (vehicle_ownerships.verified = TRUE).
 *       - Only one active enforcement per vehicle is allowed at any time.
 *       - `issued_by` is NULL on the resulting row; `reported_by_user_id` is set
 *         to the caller's user_id — this is by design.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plate_number, reason]
 *             properties:
 *               plate_number:
 *                 type: string
 *                 example: "ABC 1234"
 *               reason:
 *                 type: string
 *                 minLength: 10
 *                 example: "Vehicle stolen from Cairo parking lot on 2026-05-10"
 *               notes:
 *                 type: string
 *                 nullable: true
 *                 example: "Last seen near Tahrir Square"
 *     responses:
 *       201:
 *         description: STOP enforcement created — vehicle flagged as stolen
 *       403:
 *         description: Not a verified owner of this vehicle
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: Vehicle already has an active enforcement
 *       422:
 *         description: Validation error
 */
router.post(
  '/report-stolen',
  authenticate,
  requireUser,
  celebrate(reportStolenSchema),
  reportStolen
);

// ─────────────────────────────────────────────────────────────────────────────
// USER — List own stolen reports
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements/my-stolen-reports:
 *   get:
 *     summary: List your stolen reports (User — mobile app)
 *     description: >
 *       Returns all stolen report enforcements submitted by the calling user,
 *       including previously withdrawn (inactive) ones.
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
 *     responses:
 *       200:
 *         description: Paginated list of the user's stolen reports
 */
router.get(
  '/my-stolen-reports',
  authenticate,
  requireUser,
  celebrate(listMyStolenReportsSchema),
  getMyStolenReports
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Create enforcement
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements:
 *   post:
 *     summary: Create an enforcement flag (SUPER_ADMIN, SECURITY_ADMIN, OPERATOR)
 *     description: >
 *       Flags a vehicle for enforcement at gates. Admin supplies the plate number —
 *       the system resolves the vehicle automatically.
 *
 *       **enforcement_type drives the gate response:**
 *       - `STOP` (priority 3) — physically blocks the barrier
 *       - `AUTO_BLOCK` (priority 2) — automatically denies entry/exit
 *       - `OBSERVE` (priority 1) — gate opens normally but an alert is logged
 *
 *       Priority is auto-derived from the type if not supplied.
 *       Only one active enforcement per vehicle is allowed — returns 409 otherwise.
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
 *             enforcement_type: "STOP"
 *             reason: "Reported stolen vehicle — police case #12345"
 *             notes: "Owner confirmed theft on 2026-01-15"
 *     responses:
 *       201:
 *         description: Enforcement created
 *       404:
 *         description: Vehicle not found
 *       409:
 *         description: Vehicle already has an active enforcement
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(createEnforcementSchema),
  createEnforcement
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — List all enforcements
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements:
 *   get:
 *     summary: List enforcement flags (all admin levels)
 *     description: >
 *       Returns enforcements ordered by priority descending (STOP first), then newest first.
 *       Use `user_reported=true` to see only user self-reported stolen cars.
 *       Use `user_reported=false` to see only admin-created enforcements.
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
 *       - in: query
 *         name: enforcement_type
 *         schema: { type: string, enum: [STOP, AUTO_BLOCK, OBSERVE] }
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *       - in: query
 *         name: issued_by
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: priority
 *         schema: { type: integer, enum: [1, 2, 3] }
 *       - in: query
 *         name: user_reported
 *         schema: { type: boolean }
 *         description: true = user-submitted stolen reports only; false = admin-created only
 *     responses:
 *       200:
 *         description: Paginated list of enforcements
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listEnforcementsSchema),
  getAllEnforcements
);

// ─────────────────────────────────────────────────────────────────────────────
// USER — Withdraw own stolen report
// Registered BEFORE /:id so Express does not match "withdraw" as a UUID param.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements/{id}/withdraw:
 *   patch:
 *     summary: Withdraw your stolen report (User — mobile app)
 *     description: >
 *       Deactivates a stolen report enforcement the calling user submitted.
 *       The record is preserved for audit — only `is_active` is set to FALSE.
 *
 *       Rules:
 *       - `reported_by_user_id` on the enforcement must match the caller.
 *       - Admin-created enforcements (reported_by_user_id IS NULL) cannot be withdrawn this way.
 *       - Already-inactive enforcements return 409.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Stolen report withdrawn — enforcement deactivated
 *       403:
 *         description: This enforcement was not reported by you
 *       404:
 *         description: Enforcement not found
 *       409:
 *         description: Enforcement is already inactive
 */
router.patch(
  '/:id/withdraw',
  authenticate,
  requireUser,
  celebrate(idParamSchema),
  withdrawStolenReport
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Get enforcement by ID
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements/{id}:
 *   get:
 *     summary: Get an enforcement by ID (all admin levels)
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Enforcement data
 *       404:
 *         description: Enforcement not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getEnforcementById
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Update enforcement
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements/{id}:
 *   put:
 *     summary: Update an enforcement (SUPER_ADMIN, SECURITY_ADMIN, OPERATOR)
 *     description: >
 *       Update type, priority, reason, notes, or active status.
 *       If `enforcement_type` is changed without supplying `priority`,
 *       priority is automatically re-derived from the new type.
 *       To deactivate without deleting, set `is_active: false`.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEnforcementBody'
 *           example:
 *             is_active: false
 *     responses:
 *       200:
 *         description: Enforcement updated
 *       404:
 *         description: Enforcement not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(updateEnforcementSchema),
  updateEnforcement
);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — Delete enforcement (any — including user-reported stolen records)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /vehicle-enforcements/{id}:
 *   delete:
 *     summary: Delete an enforcement (SUPER_ADMIN, SECURITY_ADMIN, OPERATOR)
 *     description: >
 *       Permanently removes any enforcement record, including user-reported
 *       stolen reports. Admins can delete regardless of who created it.
 *       Prefer setting `is_active: false` via PUT to preserve audit history.
 *     tags: [Vehicle Enforcements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Enforcement deleted
 *       404:
 *         description: Enforcement not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deleteEnforcement
);

module.exports = router;
