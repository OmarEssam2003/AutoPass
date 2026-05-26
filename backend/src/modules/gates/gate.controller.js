const gateService = require('./gate.service');

// ── POST /api/gates ───────────────────────────────────────────────────────────
const createGate = async (req, res, next) => {
  try {
    const gate = await gateService.createGate(req.body);
    return res.status(201).json({
      status:  'success',
      message: 'Gate created successfully.',
      data:    gate,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/gates ────────────────────────────────────────────────────────────
const getAllGates = async (req, res, next) => {
  try {
    const { page, limit, zone_id, direction, is_active, device_serial, search } = req.query;
    const result = await gateService.getAllGates({
      page:          page          ? parseInt(page, 10)  : 1,
      limit:         limit         ? parseInt(limit, 10) : 20,
      zone_id:       zone_id       || undefined,
      direction:     direction     || undefined,
      is_active:     is_active !== undefined ? is_active === 'true' : undefined,
      device_serial: device_serial || undefined,
      search:        search        || undefined,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/gates/:id ────────────────────────────────────────────────────────
const getGateById = async (req, res, next) => {
  try {
    const gate = await gateService.getGateById(req.params.id);
    return res.status(200).json({ status: 'success', data: gate });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/gates/:id ────────────────────────────────────────────────────────
const updateGate = async (req, res, next) => {
  try {
    const gate = await gateService.updateGate(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Gate updated successfully.',
      data:    gate,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/gates/:id ─────────────────────────────────────────────────────
const deleteGate = async (req, res, next) => {
  try {
    const result = await gateService.deleteGate(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGate,
  getAllGates,
  getGateById,
  updateGate,
  deleteGate,
};