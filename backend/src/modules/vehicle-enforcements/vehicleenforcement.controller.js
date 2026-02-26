const enforcementService = require('./vehicleenforcement.service');

// ── POST /api/vehicle-enforcements ────────────────────────────────────────────
const createEnforcement = async (req, res, next) => {
  try {
    const result = await enforcementService.createEnforcement(
      req.user.id,  // admin ID from JWT
      req.body
    );
    return res.status(201).json({
      status:  'success',
      message: result.message,
      data:    result,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-enforcements ─────────────────────────────────────────────
const getAllEnforcements = async (req, res, next) => {
  try {
    const { page, limit, plate_number, is_active, reported_by } = req.query;
    const result = await enforcementService.getAllEnforcements({
      page:         page   ? parseInt(page, 10)  : 1,
      limit:        limit  ? parseInt(limit, 10) : 20,
      plate_number: plate_number || undefined,
      is_active:    is_active !== undefined ? is_active === 'true' : undefined,
      reported_by:  reported_by || undefined,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-enforcements/:id ─────────────────────────────────────────
const getEnforcementById = async (req, res, next) => {
  try {
    const record = await enforcementService.getEnforcementById(req.params.id);
    return res.status(200).json({ status: 'success', data: record });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/vehicle-enforcements/:id ─────────────────────────────────────────
const updateEnforcement = async (req, res, next) => {
  try {
    const record = await enforcementService.updateEnforcement(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Enforcement record updated successfully.',
      data:    record,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/vehicle-enforcements/:id ──────────────────────────────────────
const deleteEnforcement = async (req, res, next) => {
  try {
    const result = await enforcementService.deleteEnforcement(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createEnforcement,
  getAllEnforcements,
  getEnforcementById,
  updateEnforcement,
  deleteEnforcement,
};