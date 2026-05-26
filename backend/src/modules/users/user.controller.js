const userService                  = require('./user.service');
const { verifyAndStoreNationalId } = require('../../services/nationalId.service');

// ── POST /api/users ───────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    // Multer puts the file in req.file — req.body contains text fields
    if (!req.file) {
      return res.status(422).json({
        status:  'error',
        message: 'National ID image is required. Please upload a clear image of your national ID.',
      });
    }

    // Run OCR verification + store in MongoDB if match passes.
    // Throws 422 with user-friendly message if:
    //   - No 14-digit number found in image
    //   - Extracted number doesn't match national_id in body
    const mongoDocId = await verifyAndStoreNationalId(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      req.body.national_id,
    );

    // Register user in PostgreSQL with MongoDB doc ID as image link
    const user = await userService.createUser({
      ...req.body,
      national_id_image_link: mongoDocId,
    });

    return res.status(201).json({
      status:  'success',
      message: 'User registered successfully. National ID verified.',
      data:    user,
    });
  } catch (err) {
    console.error('[createUser] Error after OCR match:', err.message, err.stack);
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

// ── GET /api/users/me  (user JWT) ─────────────────────────────────────────────
const getSelf = async (req, res, next) => {
  try {
    const user = await userService.getSelf(req.user.id);
    return res.status(200).json({ status: 'success', data: user });
  } catch (err) { next(err); }
};

// ── PUT /api/users/me  (user JWT — update own profile) ───────────────────────
const updateSelf = async (req, res, next) => {
  try {
    const user = await userService.updateUser(req.user.id, req.body);
    return res.status(200).json({ status: 'success', message: 'Profile updated.', data: user });
  } catch (err) { next(err); }
};

// ── PUT /api/users/me/password  (user JWT) ────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const result = await userService.changePassword(req.user.id, current_password, new_password);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) { next(err); }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getSelf,
  updateSelf,
  changePassword,
};