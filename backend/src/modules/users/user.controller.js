const userService = require('./user.service');

// ── POST /api/users ───────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'User created successfully.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users ────────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, is_blocked, search } = req.query;
    const result = await userService.getAllUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      is_blocked: is_blocked !== undefined ? is_blocked === 'true' : undefined,
      search,
    });
    return res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/users/:id ────────────────────────────────────────────────────────
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/users/:id ────────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'User updated successfully.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/users/:id ─────────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const result = await userService.deleteUser(req.params.id);
    return res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};