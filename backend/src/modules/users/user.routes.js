const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSelf,
  updateSelf,
  changePassword,
} = require('./user.controller');

const { authenticate }  = require('../../middlewares/auth.middleware');
const { upload }        = require('../../config/multer');
const { requireRole, requireSelfOrRole, requireUser } = require('../../middlewares/rbac.middleware');
const {
  validateCreateUser,
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
 *     description: >
 *       Creates a new user account with national ID verification via OCR.
 *
 *       **Request format:** `multipart/form-data` (not JSON) — because an image file is required.
 *
 *       **How to test in Swagger:**
 *       1. Click **Try it out**
 *       2. Fill in all text fields
 *       3. Click **Choose File** on the `national_id_image` field and select a JPEG or PNG
 *       4. Click **Execute**
 *
 *       **OCR flow (server-side):**
 *       - Image is sent to Mindee OCR
 *       - Server extracts the 14-digit national ID from the image
 *       - Extracted ID is compared to the `national_id` field you entered
 *       - If they match → image is stored in MongoDB → user is created in PostgreSQL
 *       - If they don't match → 422 error with instructions to retry
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - first_name
 *               - last_name
 *               - national_id
 *               - phone_number
 *               - national_id_image
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: SecurePass123!
 *                 description: Min 8 chars, must include uppercase, lowercase, number, special character
 *               first_name:
 *                 type: string
 *                 example: John
 *               middle_name:
 *                 type: string
 *                 example: A.
 *               last_name:
 *                 type: string
 *                 example: Doe
 *               national_id:
 *                 type: string
 *                 example: "29901010123456"
 *                 description: Must be exactly 14 digits — must match what is visible in the uploaded image
 *               phone_number:
 *                 type: string
 *                 example: "+201001234567"
 *               address:
 *                 type: string
 *                 example: "12 Tahrir St, Cairo"
 *               date_of_birth:
 *                 type: string
 *                 format: date
 *                 example: "1999-01-15"
 *               national_id_image:
 *                 type: string
 *                 format: binary
 *                 description: Clear JPEG or PNG image of the national ID (max 5MB)
 *     responses:
 *       201:
 *         description: User registered — national ID verified and image stored
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: User registered successfully. National ID verified. }
 *                 data:    { $ref: '#/components/schemas/UserResponse' }
 *       409:
 *         description: Email, national_id, or phone_number already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       422:
 *         description: >
 *           Validation error — or OCR mismatch. Possible messages:
 *           - "National ID image is required."
 *           - "Could not extract a 14-digit national ID from the image. Please make sure the image is clear."
 *           - "The national ID in the image does not match the national ID you entered manually."
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  upload.single('national_id_image'),  // multer parses multipart FIRST
  validateCreateUser,                  // manual Joi validation AFTER multer
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
// ── User self-service routes (user JWT — no admin role needed) ───────────────
router.get('/me',          authenticate, requireUser, getSelf);
router.put('/me',          authenticate, requireUser, updateSelf);
router.put('/me/password', authenticate, requireUser, (req, res, next) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(422).json({ status: 'error', message: 'current_password and new_password are required.' });
  }
  if (new_password.length < 8) {
    return res.status(422).json({ status: 'error', message: 'new_password must be at least 8 characters.' });
  }
  next();
}, changePassword);

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