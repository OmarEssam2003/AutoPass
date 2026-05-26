const zoneService = require('./zone.service');

// ── POST /api/zones ───────────────────────────────────────────────────────────
const createZone = async (req, res, next) => {
  try {
    const zone = await zoneService.createZone(req.body);
    return res.status(201).json({
      status: 'success',
      message: 'Zone created successfully.',
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/zones ────────────────────────────────────────────────────────────
const getAllZones = async (req, res, next) => {
  try {
    const { page, limit, search } = req.query;
    const result = await zoneService.getAllZones({
      page:  page  ? parseInt(page, 10)  : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/zones/:id ────────────────────────────────────────────────────────
const getZoneById = async (req, res, next) => {
  try {
    const zone = await zoneService.getZoneById(req.params.id);
    return res.status(200).json({ status: 'success', data: zone });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/zones/:id ────────────────────────────────────────────────────────
const updateZone = async (req, res, next) => {
  try {
    const zone = await zoneService.updateZone(req.params.id, req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Zone updated successfully.',
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/zones/:id ─────────────────────────────────────────────────────
const deleteZone = async (req, res, next) => {
  try {
    const result = await zoneService.deleteZone(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createZone,
  getAllZones,
  getZoneById,
  updateZone,
  deleteZone,
};