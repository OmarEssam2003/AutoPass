const enforcementService = require('./vehicleEnforcement.service');

// ── POST /api/vehicle-enforcements  (admin) ───────────────────────────────────
const createEnforcement = async (req, res, next) => {
  try {
    const enforcement = await enforcementService.createEnforcement(req.body, req.user.id);
    return res.status(201).json({
      status:  'success',
      message: 'Enforcement created successfully.',
      data:    enforcement,
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/vehicle-enforcements/report-stolen  (user) ─────────────────────
const reportStolen = async (req, res, next) => {
  try {
    const enforcement = await enforcementService.reportStolen(req.body, req.user.id);
    return res.status(201).json({
      status:  'success',
      message: 'Your vehicle has been reported as stolen. A STOP enforcement has been activated immediately.',
      data:    enforcement,
    });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/vehicle-enforcements/:id/withdraw  (user) ─────────────────────
const withdrawStolenReport = async (req, res, next) => {
  try {
    const enforcement = await enforcementService.withdrawStolenReport(req.params.id, req.user.id);
    return res.status(200).json({
      status:  'success',
      message: 'Stolen report withdrawn. The enforcement has been deactivated.',
      data:    enforcement,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-enforcements/my-stolen-reports  (user) ──────────────────
const getMyStolenReports = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await enforcementService.getMyStolenReports(req.user.id, {
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-enforcements  (admin) ────────────────────────────────────
const getAllEnforcements = async (req, res, next) => {
  try {
    const {
      page, limit, plate_number, enforcement_type,
      is_active, issued_by, priority, user_reported,
    } = req.query;

    const result = await enforcementService.getAllEnforcements({
      page:             page             ? parseInt(page,  10)  : 1,
      limit:            limit            ? parseInt(limit, 10)  : 20,
      plate_number:     plate_number     || undefined,
      enforcement_type: enforcement_type || undefined,
      is_active:        is_active        !== undefined ? is_active === 'true'       : undefined,
      issued_by:        issued_by        || undefined,
      priority:         priority         ? parseInt(priority, 10) : undefined,
      user_reported:    user_reported    !== undefined ? user_reported === 'true'   : undefined,
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-enforcements/:id  (admin) ────────────────────────────────
const getEnforcementById = async (req, res, next) => {
  try {
    const enforcement = await enforcementService.getEnforcementById(req.params.id);
    return res.status(200).json({ status: 'success', data: enforcement });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/vehicle-enforcements/:id  (admin) ────────────────────────────────
const updateEnforcement = async (req, res, next) => {
  try {
    const enforcement = await enforcementService.updateEnforcement(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Enforcement updated successfully.',
      data:    enforcement,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/vehicle-enforcements/:id  (admin) ─────────────────────────────
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
  reportStolen,
  withdrawStolenReport,
  getMyStolenReports,
  getAllEnforcements,
  getEnforcementById,
  updateEnforcement,
  deleteEnforcement,
};
