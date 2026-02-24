const bcrypt         = require('bcrypt');
const pool           = require('../../config/db');
const { sendOTPSms } = require('../../config/sms');

/**
 * SECURITY: Cryptographically secure OTP generation
 * crypto.randomInt() uses OS entropy — not predictable like Math.random()
 */
const generateOTP = () => {
  const { randomInt } = require('crypto');
  return String(randomInt(100000, 999999)); // always 6 digits
};

// Public columns — otp_hash is NEVER returned to the client
const PUBLIC_COLUMNS = `
  o.ownership_id,
  o.vehicle_id,
  o.user_id,
  o.verified,
  o.otp_expires_at,
  o.created_at,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  u.first_name,
  u.last_name,
  u.email
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE OWNERSHIP
//
// Flow:
// 1. User enters a plate number
// 2. System looks up the vehicle by plate number
// 3. System sends OTP to the vehicle's registered owner_phone_number
// 4. User receives OTP on the owner's phone (proves physical possession)
// 5. User submits OTP via /verify endpoint
// 6. On success → ownership record saved as verified
// ─────────────────────────────────────────────────────────────────────────────
const createOwnership = async (userId, plateNumber) => {
  // 1. Look up vehicle by plate number (normalize to uppercase)
  const vehicleResult = await pool.query(
    `SELECT vehicle_id, plate_number, owner_phone_number
     FROM vehicles
     WHERE plate_number = $1`,
    [plateNumber.toUpperCase()]
  );

  if (!vehicleResult.rows[0]) {
    const err = new Error(
      `No vehicle found with plate number "${plateNumber.toUpperCase()}". ` +
      'Please check the plate number and try again.'
    );
    err.statusCode = 404;
    throw err;
  }

  const vehicle = vehicleResult.rows[0];

  // 2. Check if this user already has an ownership record for this vehicle
  const existingCheck = await pool.query(
    `SELECT ownership_id, verified
     FROM vehicle_ownerships
     WHERE vehicle_id = $1 AND user_id = $2`,
    [vehicle.vehicle_id, userId]
  );

  if (existingCheck.rows[0]) {
    const existing = existingCheck.rows[0];

    // Already fully verified — no need to do anything
    if (existing.verified) {
      const err = new Error(
        'You have already verified ownership of this vehicle.'
      );
      err.statusCode = 409;
      throw err;
    }

    // Exists but unverified — refresh OTP and resend to owner phone
    return refreshAndSendOTP(existing.ownership_id, userId, vehicle);
  }

  // 3. Generate OTP and hash it for secure storage
  const otp          = generateOTP();
  const otpHash      = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

  // 4. Create the ownership record (unverified until OTP is confirmed)
  const { rows } = await pool.query(
    `INSERT INTO vehicle_ownerships
       (vehicle_id, user_id, verified, otp_hash, otp_expires_at)
     VALUES ($1, $2, FALSE, $3, $4)
     RETURNING ownership_id, vehicle_id, user_id, verified, otp_expires_at, created_at`,
    [vehicle.vehicle_id, userId, otpHash, otpExpiresAt]
  );

  const record = rows[0];

  // 5. Send OTP to the vehicle's REGISTERED owner phone number
  //    This is the security proof — only someone with access to the
  //    owner's phone can complete the verification
  const smsResult = await sendOTPSms(
    vehicle.owner_phone_number,
    otp,
    vehicle.plate_number
  );

  return {
    ownership_id:   record.ownership_id,
    vehicle_id:     record.vehicle_id,
    plate_number:   vehicle.plate_number,
    verified:       record.verified,
    otp_expires_at: record.otp_expires_at,
    created_at:     record.created_at,
    message:
      `OTP sent to the registered owner's phone number ending in ` +
      `...${vehicle.owner_phone_number.slice(-4)}. ` +
      `Enter it in /vehicle-ownerships/verify to complete ownership. ` +
      `Expires in 15 minutes.`,
    // In dev mode (Twilio not configured), expose OTP in response for testing
    ...(smsResult.dev && {
      otp,
      dev_note: '⚠️ Dev mode — OTP shown here because Twilio is not configured. Remove in production.',
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH OTP  (internal helper)
// Called when unverified ownership already exists — issues a fresh OTP
// ─────────────────────────────────────────────────────────────────────────────
const refreshAndSendOTP = async (ownershipId, userId, vehicle) => {
  const otp          = generateOTP();
  const otpHash      = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const { rows } = await pool.query(
    `UPDATE vehicle_ownerships
     SET otp_hash = $1, otp_expires_at = $2
     WHERE ownership_id = $3 AND user_id = $4
     RETURNING ownership_id, vehicle_id, user_id, verified, otp_expires_at, created_at`,
    [otpHash, otpExpiresAt, ownershipId, userId]
  );

  const smsResult = await sendOTPSms(
    vehicle.owner_phone_number,
    otp,
    vehicle.plate_number
  );

  return {
    ownership_id:   rows[0].ownership_id,
    vehicle_id:     rows[0].vehicle_id,
    plate_number:   vehicle.plate_number,
    verified:       rows[0].verified,
    otp_expires_at: rows[0].otp_expires_at,
    created_at:     rows[0].created_at,
    message:
      `A fresh OTP has been sent to the registered owner's phone number ending in ` +
      `...${vehicle.owner_phone_number.slice(-4)}. Expires in 15 minutes.`,
    ...(smsResult.dev && {
      otp,
      dev_note: '⚠️ Dev mode — OTP shown here because Twilio is not configured. Remove in production.',
    }),
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY OWNERSHIP
// User submits the OTP they received → record marked as verified
// ─────────────────────────────────────────────────────────────────────────────
const verifyOwnership = async (ownershipId, otp, userId) => {
  // 1. Fetch the ownership record
  const { rows } = await pool.query(
    `SELECT ownership_id, user_id, verified, otp_hash, otp_expires_at
     FROM vehicle_ownerships
     WHERE ownership_id = $1`,
    [ownershipId]
  );

  if (!rows[0]) {
    const err = new Error('Ownership record not found.');
    err.statusCode = 404;
    throw err;
  }

  const record = rows[0];

  // 2. Ensure this record belongs to the requesting user
  if (record.user_id !== userId) {
    const err = new Error('Forbidden. This ownership record does not belong to you.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Already verified?
  if (record.verified) {
    const err = new Error('This vehicle ownership has already been verified.');
    err.statusCode = 409;
    throw err;
  }

  // 4. Check OTP expiry
  if (new Date() > new Date(record.otp_expires_at)) {
    const err = new Error(
      'OTP has expired. Please claim the vehicle again to receive a new OTP.'
    );
    err.statusCode = 410;
    throw err;
  }

  // 5. Compare submitted OTP against the stored hash
  const isMatch = await bcrypt.compare(otp, record.otp_hash);
  if (!isMatch) {
    const err = new Error('Incorrect OTP. Please check and try again.');
    err.statusCode = 401;
    throw err;
  }

  // 6. Mark ownership as verified and wipe OTP fields from the database
  const { rows: updated } = await pool.query(
    `UPDATE vehicle_ownerships
     SET verified = TRUE, otp_hash = NULL, otp_expires_at = NULL
     WHERE ownership_id = $1
     RETURNING ownership_id, vehicle_id, user_id, verified, created_at`,
    [ownershipId]
  );

  return {
    ...updated[0],
    message: 'Vehicle ownership verified successfully. You are now a registered owner.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL OWNERSHIPS
// Admins → all records. Users → only their own (scoped automatically).
// ─────────────────────────────────────────────────────────────────────────────
const getAllOwnerships = async (
  { page = 1, limit = 20, verified, vehicle_id, user_id },
  requester
) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let idx = 1;

  if (requester.type === 'user') {
    // Regular users always scoped to their own records only
    conditions.push(`o.user_id = $${idx++}`);
    values.push(requester.id);
  } else {
    // Admins can optionally filter by a specific user
    if (user_id) {
      conditions.push(`o.user_id = $${idx++}`);
      values.push(user_id);
    }
  }

  if (typeof verified === 'boolean') {
    conditions.push(`o.verified = $${idx++}`);
    values.push(verified);
  }

  if (vehicle_id) {
    conditions.push(`o.vehicle_id = $${idx++}`);
    values.push(vehicle_id);
  }

  const where    = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const baseQuery = `
    FROM vehicle_ownerships o
    JOIN vehicles v ON o.vehicle_id = v.vehicle_id
    JOIN users u    ON o.user_id    = u.user_id
    ${where}
  `;

  const countResult = await pool.query(`SELECT COUNT(*) ${baseQuery}`, values);
  const total       = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     ${baseQuery}
     ORDER BY o.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET OWNERSHIP BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getOwnershipById = async (id, requester) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     FROM vehicle_ownerships o
     JOIN vehicles v ON o.vehicle_id = v.vehicle_id
     JOIN users u    ON o.user_id    = u.user_id
     WHERE o.ownership_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Ownership record not found.');
    err.statusCode = 404;
    throw err;
  }

  // Users can only view their own ownership records
  if (requester.type === 'user' && rows[0].user_id !== requester.id) {
    const err = new Error('Forbidden. This ownership record does not belong to you.');
    err.statusCode = 403;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE OWNERSHIP
// ─────────────────────────────────────────────────────────────────────────────
const deleteOwnership = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM vehicle_ownerships WHERE ownership_id = $1 RETURNING ownership_id',
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Ownership record not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    message:      'Ownership record deleted successfully.',
    ownership_id: rows[0].ownership_id,
  };
};

module.exports = {
  createOwnership,
  verifyOwnership,
  getAllOwnerships,
  getOwnershipById,
  deleteOwnership,
};