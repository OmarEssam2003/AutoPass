const express = require('express');
const Joi = require('joi');
const { createUserSchema, updateUserSchema } = require('../validations/users_validation');
const controller = require('../controllers/users_controller.js');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Users management
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */

router.get('/', controller.getAllUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

router.get('/:id', controller.getUserById);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserInput'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */

router.post('/', async (req, res, next) => {
  try {
    await createUserSchema.validateAsync(req.body);
    controller.createUser(req, res);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateUserInput'
 *     responses:
 *       200:
 *         description: Updated user
 */
router.put('/:id', async (req, res, next) => {
  try {
    await updateUserSchema.validateAsync(req.body);
    controller.updateUser(req, res);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: User UUID
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       404:
 *         description: User not found
 */
router.delete('/:id', controller.deleteUser);

module.exports = router;