const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const { login } = require('./auth.controller');
const { loginSchema } = require('./auth.validation');
const { applyAuthLimit } = require('../../middlewares/rateLimiter.middleware');

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login for users and admins
 *     description: >
 *       Single login endpoint for both users and admins. The system checks the
 *       users table first, then the admins table. Returns a JWT token to use
 *       in the Authorization header for all protected endpoints.
 *
 *       **How to use the token:**
 *       Copy the `token` from the response, click the **Authorize** button
 *       at the top of this page, and paste it in as: `Bearer <your_token>`
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: superadmin@autopass.com
 *               password:
 *                 type: string
 *                 example: SuperAdmin123!
 *     responses:
 *       200:
 *         description: Login successful — copy the token and use it in Authorize
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Login successful.
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 account:
 *                   type: object
 *                   properties:
 *                     id:          { type: string, format: uuid }
 *                     email:       { type: string, example: superadmin@autopass.com }
 *                     type:        { type: string, enum: [user, admin] }
 *                     admin_level: { type: string, example: SUPER_ADMIN, nullable: true }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Account is blocked or inactive
 *       422:
 *         description: Validation error
 *       429:
 *         description: Too many login attempts — try again in 15 minutes
 */
router.post('/login', applyAuthLimit, celebrate(loginSchema), login);

module.exports = router;