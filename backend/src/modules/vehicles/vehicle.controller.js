const vehicleService = require('./vehicle.service');

// ── POST /api/vehicles ────────────────────────────────────────────────────────
const createVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.createVehicle(req.body);
    return res.status(201).json({
      status:  'success',
      message: 'Vehicle created successfully.',
      data:    vehicle,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
const getAllVehicles = async (req, res, next) => {
  try {
    const {
      page, limit, vehicle_type,
      make, color, plate_number, owner_phone_number,
    } = req.query;

    const result = await vehicleService.getAllVehicles({
      page:               page  ? parseInt(page, 10)  : 1,
      limit:              limit ? parseInt(limit, 10) : 20,
      vehicle_type:       vehicle_type       || undefined,
      make:               make               || undefined,
      color:              color              || undefined,
      plate_number:       plate_number       || undefined,
      owner_phone_number: owner_phone_number || undefined,
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicles/:id ─────────────────────────────────────────────────────
const getVehicleById = async (req, res, next) => {
  try {
    // Pass requester info so the service can enforce ownership for users
    const vehicle = await vehicleService.getVehicleById(req.params.id, req.user);
    return res.status(200).json({ status: 'success', data: vehicle });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/vehicles/:id ─────────────────────────────────────────────────────
const updateVehicle = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.updateVehicle(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Vehicle updated successfully.',
      data:    vehicle,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/vehicles/:id ──────────────────────────────────────────────────
const deleteVehicle = async (req, res, next) => {
  try {
    const result = await vehicleService.deleteVehicle(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createVehicle,
  getAllVehicles,
  getVehicleById,
  updateVehicle,
  deleteVehicle,
};