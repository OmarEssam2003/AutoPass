const rentalService = require('./vehiclerental.service');

// ── POST /api/vehicle-rentals ─────────────────────────────────────────────────
const createRental = async (req, res, next) => {
  try {
    const result = await rentalService.createRental(req.user.id, req.body);
    return res.status(201).json({
      status: 'success',
      data:   result,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-rentals ──────────────────────────────────────────────────
const getAllRentals = async (req, res, next) => {
  try {
    const { page, limit, status, vehicle_id } = req.query;
    const result = await rentalService.getAllRentals(
      {
        page:       page       ? parseInt(page, 10)  : 1,
        limit:      limit      ? parseInt(limit, 10) : 20,
        status:     status     || undefined,
        vehicle_id: vehicle_id || undefined,
      },
      req.user
    );
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-rentals/:id ──────────────────────────────────────────────
const getRentalById = async (req, res, next) => {
  try {
    const rental = await rentalService.getRentalById(req.params.id, req.user);
    return res.status(200).json({ status: 'success', data: rental });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/vehicle-rentals/:id/status ─────────────────────────────────────
const updateRentalStatus = async (req, res, next) => {
  try {
    const result = await rentalService.updateRentalStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/vehicle-rentals/:id ──────────────────────────────────────────
const deleteRental = async (req, res, next) => {
  try {
    const result = await rentalService.deleteRental(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createRental,
  getAllRentals,
  getRentalById,
  updateRentalStatus,
  deleteRental,
};