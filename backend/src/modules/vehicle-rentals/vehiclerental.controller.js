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

const cancelRental = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the rental
    const rental = await pool.query(
      'SELECT * FROM vehicle_rentals WHERE rental_id = $1',
      [id]
    );

    if (rental.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Rental not found.' });
    }

    const r = rental.rows[0];

    // Only the owner can cancel
    if (r.owner_id !== userId) {
      return res.status(403).json({
        status: 'error',
        message: 'Only the owner can cancel this rental.',
      });
    }

    // Only PENDING rentals can be cancelled
    if (r.status !== 'PENDING') {
      return res.status(409).json({
        status: 'error',
        message: `Cannot cancel a rental that is already ${r.status}.`,
      });
    }

    await pool.query(
      'DELETE FROM vehicle_rentals WHERE rental_id = $1',
      [id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Rental request cancelled successfully.',
      rental_id: id,
    });
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
  cancelRental,   // ← ADD THIS
};