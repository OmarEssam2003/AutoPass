const adminService = require('./Admin.service');

// ── POST /api/admins ──────────────────────────────────────────────────────────
const createAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.createAdmin(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Admin created successfully.',
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/admins ───────────────────────────────────────────────────────────
const getAllAdmins = async (req, res, next) => {
  try {
    const { page, limit, is_active, admin_level, search } = req.query;
    const result = await adminService.getAllAdmins({
      page:        page ? parseInt(page, 10) : 1,
      limit:       limit ? parseInt(limit, 10) : 20,
      is_active:   is_active !== undefined ? is_active === 'true' : undefined,
      admin_level: admin_level || undefined,
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

// ── GET /api/admins/:id ───────────────────────────────────────────────────────
const getAdminById = async (req, res, next) => {
  try {
    const admin = await adminService.getAdminById(req.params.id);
    return res.status(200).json({
      status: 'success',
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/admins/:id ───────────────────────────────────────────────────────
const updateAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.updateAdmin(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Admin updated successfully.',
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/admins/:id ────────────────────────────────────────────────────
const deleteAdmin = async (req, res, next) => {
  try {
    const result = await adminService.deleteAdmin(req.params.id);
    return res.status(200).json({
      status: 'success',
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createAdmin,
  getAllAdmins,
  getAdminById,
  updateAdmin,
  deleteAdmin,
};