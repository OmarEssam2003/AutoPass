const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} = require('./user.controller');

const { authenticate }  = require('../../middlewares/auth.middleware');
const { requireRole, requireSelfOrRole } = require('../../middlewares/rbac.middleware');
const {
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
  idParamSchema,
} = require('./user.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /users          → Public (registration) — no auth needed
//  GET    /users          → Admins only (SUPER_ADMIN, SECURITY_ADMIN, OPERATOR)
//  GET    /users/:id      → The user themselves  OR  any admin
//  PUT    /users/:id      → The user themselves  OR  SUPER_ADMIN / SECURITY_ADMIN
//  DELETE /users/:id      → SUPER_ADMIN only
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account. Password is hashed before storage. Public endpoint — no authentication required.
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserBody'
 *           example:
 *             email: "john.doe@example.com"
 *             password: "SecurePass123!"
 *             first_name: "John"
 *             middle_name: "A."
 *             last_name: "Doe"
 *             national_id: "29901010123456"
 *             phone_number: "+201001234567"
 *             address: "12 Tahrir St, Cairo"
 *             date_of_birth: "1999-01-15"
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: User created successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       409:
 *         description: Email, national_id, or phone_number already exists
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
  celebrate(createUserSchema),
  createUser
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (Admin only)
 *     description: Returns a paginated list of all users. Password hash is never included. Accessible only by SUPER_ADMIN, SECURITY_ADMIN, and OPERATOR.
 *     tags: [Users]
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
 *         name: is_blocked
 *         schema:
 *           type: boolean
 *         description: Filter by blocked status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by first name, last name, or email
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Insufficient role
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(listUsersSchema),
  getAllUsers
);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get a user by ID
 *     description: Returns a single user's data (no password). The requesting user can only fetch their own data; admins can fetch any user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — not your own account and not an admin
 *       404:
 *         description: User not found
 */
router.get(
  '/:id',
  authenticate,
  requireSelfOrRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getUserById
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     description: >
 *       Updates allowed user fields. **Password cannot be changed via this endpoint.**
 *       At least one field must be provided. A user can update their own profile;
 *       SUPER_ADMIN and SECURITY_ADMIN can update any user.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user to update
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateUserBody'
 *           example:
 *             first_name: "Jane"
 *             address: "5 Nasr City, Cairo"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: User updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Password field attempted or no fields provided
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: User not found
 *       409:
 *         description: Duplicate email/national_id/phone
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireSelfOrRole('SUPER_ADMIN', 'SECURITY_ADMIN'),
  celebrate(updateUserSchema),
  updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete a user (SUPER_ADMIN only)
 *     description: Permanently deletes a user account. This action is irreversible. Only SUPER_ADMIN can perform this operation.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID of the user to delete
 *         example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *     responses:
 *       200:
 *         description: User deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:   { type: string, example: success }
 *                 message:  { type: string, example: User deleted successfully. }
 *                 user_id:  { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 *       404:
 *         description: User not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(idParamSchema),
  deleteUser
);

module.exports = router;