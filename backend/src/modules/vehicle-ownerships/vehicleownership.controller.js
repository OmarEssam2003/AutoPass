const ownershipService = require('./vehicle-ownerships.service');

// ── POST /api/vehicle-ownerships ──────────────────────────────────────────────
const createOwnership = async (req, res, next) => {
  try {
    const result = await ownershipService.createOwnership(
      req.user.id,            // user_id from JWT
      req.body.plate_number   // plate number entered by the user
    );
    return res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/vehicle-ownerships/verify ───────────────────────────────────────
const verifyOwnership = async (req, res, next) => {
  try {
    const { ownership_id, otp } = req.body;
    const result = await ownershipService.verifyOwnership(
      ownership_id,
      otp,
      req.user.id   // ensure user can only verify their own
    );
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-ownerships ───────────────────────────────────────────────
const getAllOwnerships = async (req, res, next) => {
  try {
    const { page, limit, verified, vehicle_id, user_id } = req.query;
    const result = await ownershipService.getAllOwnerships(
      {
        page:       page   ? parseInt(page, 10)   : 1,
        limit:      limit  ? parseInt(limit, 10)  : 20,
        verified:   verified !== undefined ? verified === 'true' : undefined,
        vehicle_id: vehicle_id || undefined,
        user_id:    user_id    || undefined,
      },
      req.user  // pass requester so service can scope results for users
    );
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/vehicle-ownerships/:id ───────────────────────────────────────────
const getOwnershipById = async (req, res, next) => {
  try {
    const record = await ownershipService.getOwnershipById(req.params.id, req.user);
    return res.status(200).json({ status: 'success', data: record });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/vehicle-ownerships/:id ────────────────────────────────────────
const deleteOwnership = async (req, res, next) => {
  try {
    const result = await ownershipService.deleteOwnership(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createOwnership,
  verifyOwnership,
  getAllOwnerships,
  getOwnershipById,
  deleteOwnership,
};