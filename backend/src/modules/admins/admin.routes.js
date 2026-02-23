const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
} = require('./Admin.controller');

const { authenticate }  = require('../../middlewares/auth.middleware');
const { requireRole }   = require('../../middlewares/rbac.middleware');
const {
  createAdminSchema,
  listAdminsSchema,
  updateAdminSchema,
  idParamSchema,
} = require('./Admin.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /admins        → SUPER_ADMIN only
//  GET    /admins        → SUPER_ADMIN only
//  GET    /admins/:id    → SUPER_ADMIN only
//  PUT    /admins/:id    → SUPER_ADMIN only
//  DELETE /admins/:id    → SUPER_ADMIN only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /admins:
 *   post:
 *     summary: Create a new admin (SUPER_ADMIN only)
 *     description: Creates a new admin account with a specified role. Password is hashed before storage. Only SUPER_ADMIN can perform this action.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAdminBody'
 *           example:
 *             email: "security.admin@autopass.com"
 *             password: "SecurePass123!"
 *             first_name: "Sara"
 *             last_name: "Ahmed"
 *             phone_number: "+201009876543"
 *             admin_level: "SECURITY_ADMIN"
 *             is_active: true
 *     responses:
 *       201:
 *         description: Admin created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Admin created successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/AdminResponse'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 *       409:
 *         description: Email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
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
  requireRole('SUPER_ADMIN'),
  celebrate(createAdminSchema),
  createAdmin
);

/**
 * @swagger
 * /admins:
 *   get:
 *     summary: List all admins (SUPER_ADMIN only)
 *     description: Returns a paginated list of all admins. Password hash is never included. Filterable by role and active status.
 *     tags: [Admins]
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
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: admin_level
 *         schema:
 *           type: string
 *           enum: [SUPER_ADMIN, SECURITY_ADMIN, FINANCE_ADMIN, OPERATOR]
 *         description: Filter by admin role
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *     responses:
 *       200:
 *         description: List of admins
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AdminResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(listAdminsSchema),
  getAllAdmins
);

/**
 * @swagger
 * /admins/{id}:
 *   get:
 *     summary: Get an admin by ID (SUPER_ADMIN only)
 *     description: Returns a single admin's data. Password hash is never returned.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the admin
 *         example: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *     responses:
 *       200:
 *         description: Admin data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/AdminResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 *       404:
 *         description: Admin not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(idParamSchema),
  getAdminById
);

/**
 * @swagger
 * /admins/{id}:
 *   put:
 *     summary: Update an admin (SUPER_ADMIN only)
 *     description: >
 *       Updates allowed admin fields. **Password cannot be changed via this endpoint.**
 *       At least one field must be provided.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the admin to update
 *         example: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateAdminBody'
 *           example:
 *             admin_level: "FINANCE_ADMIN"
 *             is_active: false
 *     responses:
 *       200:
 *         description: Admin updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Admin updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/AdminResponse'
 *       400:
 *         description: Password field attempted or no fields provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 *       404:
 *         description: Admin not found
 *       409:
 *         description: Duplicate email
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(updateAdminSchema),
  updateAdmin
);

/**
 * @swagger
 * /admins/{id}:
 *   delete:
 *     summary: Delete an admin (SUPER_ADMIN only)
 *     description: Permanently deletes an admin account. This action is irreversible.
 *     tags: [Admins]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the admin to delete
 *         example: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *     responses:
 *       200:
 *         description: Admin deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:   { type: string, example: success }
 *                 message:  { type: string, example: Admin deleted successfully. }
 *                 admin_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 *       404:
 *         description: Admin not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(idParamSchema),
  deleteAdmin
);

module.exports = router;