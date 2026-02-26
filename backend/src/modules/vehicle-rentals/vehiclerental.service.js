const pool = require('../../config/db');

// Columns returned in all queries — joins vehicle and both user records
const PUBLIC_COLUMNS = `
  r.rental_id,
  r.vehicle_id,
  r.owner_id,
  r.renter_id,
  r.start_date,
  r.end_date,
  r.status,
  r.created_at,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  owner.first_name  AS owner_first_name,
  owner.last_name   AS owner_last_name,
  owner.email       AS owner_email,
  renter.first_name AS renter_first_name,
  renter.last_name  AS renter_last_name,
  renter.email      AS renter_email
`;

const BASE_JOIN = `
  FROM vehicle_rentals r
  JOIN vehicles v         ON r.vehicle_id = v.vehicle_id
  JOIN users owner        ON r.owner_id   = owner.user_id
  JOIN users renter       ON r.renter_id  = renter.user_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE RENTAL REQUEST
// Only the verified owner of the vehicle can create a rental request
// ─────────────────────────────────────────────────────────────────────────────
const createRental = async (ownerId, data) => {
  const { plate_number, renter_email, start_date, end_date } = data;

  // 1. Look up the vehicle by plate number
  const vehicleResult = await pool.query(
    `SELECT vehicle_id, plate_number FROM vehicles WHERE plate_number = $1`,
    [plate_number.toUpperCase()]
  );

  if (!vehicleResult.rows[0]) {
    const err = new Error(
      `No vehicle found with plate number "${plate_number.toUpperCase()}". ` +
      'Please check the plate number and try again.'
    );
    err.statusCode = 404;
    throw err;
  }

  const vehicle = vehicleResult.rows[0];

  // 2. Verify the requester is a verified owner of this vehicle
  const ownershipCheck = await pool.query(
    `SELECT ownership_id FROM vehicle_ownerships
     WHERE vehicle_id = $1 AND user_id = $2 AND verified = TRUE`,
    [vehicle.vehicle_id, ownerId]
  );

  if (!ownershipCheck.rows[0]) {
    const err = new Error(
      'You are not a verified owner of this vehicle. ' +
      'Only verified owners can create rental requests.'
    );
    err.statusCode = 403;
    throw err;
  }

  // 3. Look up the renter by email
  const renterResult = await pool.query(
    'SELECT user_id FROM users WHERE email = $1 AND is_blocked = FALSE',
    [renter_email.toLowerCase()]
  );

  if (!renterResult.rows[0]) {
    const err = new Error(
      'No active user found with that email address. ' +
      'Please check the email and try again.'
    );
    err.statusCode = 404;
    throw err;
  }

  const renter_id = renterResult.rows[0].user_id;

  // 4. Make sure owner is not trying to rent to themselves
  if (ownerId === renter_id) {
    const err = new Error('You cannot create a rental request for yourself.');
    err.statusCode = 400;
    throw err;
  }

  // 5. Check for overlapping ACCEPTED rentals on this vehicle
  const overlapCheck = await pool.query(
    `SELECT rental_id FROM vehicle_rentals
     WHERE vehicle_id = $1
       AND status = 'ACCEPTED'
       AND NOT (end_date <= $2 OR start_date >= $3)`,
    [vehicle.vehicle_id, start_date, end_date]
  );

  if (overlapCheck.rows[0]) {
    const err = new Error(
      'This vehicle already has an accepted rental that overlaps with the requested dates.'
    );
    err.statusCode = 409;
    throw err;
  }

  // 6. Create the rental — starts as PENDING until renter responds
  const { rows } = await pool.query(
    `INSERT INTO vehicle_rentals
       (vehicle_id, owner_id, renter_id, start_date, end_date, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     RETURNING *`,
    [vehicle.vehicle_id, ownerId, renter_id, start_date, end_date]
  );

  return {
    ...rows[0],
    plate_number: vehicle.plate_number,
    message: 'Rental request created successfully. Waiting for the renter to respond.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE RENTAL STATUS (ACCEPT / REJECT)
// Only the RENTER of this specific rental can call this
// ─────────────────────────────────────────────────────────────────────────────
const updateRentalStatus = async (rentalId, newStatus, requesterId) => {
  // 1. Fetch the rental
  const { rows } = await pool.query(
    'SELECT * FROM vehicle_rentals WHERE rental_id = $1',
    [rentalId]
  );

  if (!rows[0]) {
    const err = new Error('Rental record not found.');
    err.statusCode = 404;
    throw err;
  }

  const rental = rows[0];

  // 2. Only the designated renter can accept or reject
  if (rental.renter_id !== requesterId) {
    const err = new Error(
      'Forbidden. Only the renter this request was sent to can accept or reject it.'
    );
    err.statusCode = 403;
    throw err;
  }

  // 3. Can only respond to PENDING requests
  if (rental.status !== 'PENDING') {
    const err = new Error(
      `This rental request has already been ${rental.status.toLowerCase()}. ` +
      'Only PENDING requests can be accepted or rejected.'
    );
    err.statusCode = 409;
    throw err;
  }

  // 4. If accepting, re-check for overlapping accepted rentals
  //    (another rental for the same car may have been accepted in the meantime)
  if (newStatus === 'ACCEPTED') {
    const overlapCheck = await pool.query(
      `SELECT rental_id FROM vehicle_rentals
       WHERE vehicle_id = $1
         AND status = 'ACCEPTED'
         AND rental_id != $2
         AND NOT (end_date <= $3 OR start_date >= $4)`,
      [rental.vehicle_id, rentalId, rental.start_date, rental.end_date]
    );

    if (overlapCheck.rows[0]) {
      const err = new Error(
        'Cannot accept this rental — another rental for this vehicle ' +
        'with overlapping dates has already been accepted.'
      );
      err.statusCode = 409;
      throw err;
    }
  }

  // 5. Update the status
  const { rows: updated } = await pool.query(
    `UPDATE vehicle_rentals
     SET status = $1
     WHERE rental_id = $2
     RETURNING *`,
    [newStatus, rentalId]
  );

  const statusMessages = {
    ACCEPTED: 'Rental accepted. Any charges during the rental period will be applied to your account.',
    REJECTED: 'Rental request rejected.',
  };

  return {
    ...updated[0],
    message: statusMessages[newStatus],
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL RENTALS
// Admins → all records. Users → only rentals where they are owner OR renter.
// ─────────────────────────────────────────────────────────────────────────────
const getAllRentals = async (
  { page = 1, limit = 20, status, vehicle_id },
  requester
) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let idx = 1;

  // Scope to only the user's own rentals (as owner or renter)
  if (requester.type === 'user') {
    conditions.push(`(r.owner_id = $${idx} OR r.renter_id = $${idx})`);
    values.push(requester.id);
    idx++;
  }

  if (status) {
    conditions.push(`r.status = $${idx++}`);
    values.push(status);
  }

  if (vehicle_id) {
    conditions.push(`r.vehicle_id = $${idx++}`);
    values.push(vehicle_id);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) ${BASE_JOIN} ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS}
     ${BASE_JOIN}
     ${where}
     ORDER BY r.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET RENTAL BY ID
// Admins → any. Users → only if they are owner or renter of this rental.
// ─────────────────────────────────────────────────────────────────────────────
const getRentalById = async (id, requester) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE r.rental_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Rental record not found.');
    err.statusCode = 404;
    throw err;
  }

  const rental = rows[0];

  // Users can only view rentals they are part of
  if (
    requester.type === 'user' &&
    rental.owner_id  !== requester.id &&
    rental.renter_id !== requester.id
  ) {
    const err = new Error('Forbidden. You are not involved in this rental.');
    err.statusCode = 403;
    throw err;
  }

  return rental;
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE RENTAL
// ─────────────────────────────────────────────────────────────────────────────
const deleteRental = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM vehicle_rentals WHERE rental_id = $1 RETURNING rental_id',
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Rental record not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    message:   'Rental record deleted successfully.',
    rental_id: rows[0].rental_id,
  };
};

module.exports = {
  createRental,
  updateRentalStatus,
  getAllRentals,
  getRentalById,
  deleteRental,
};