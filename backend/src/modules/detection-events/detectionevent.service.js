const pool = require('../../config/db');

const PUBLIC_COLUMNS = `
  e.event_id,
  e.gate_id,
  e.plate_number,
  e.detected_at,
  e.snapshot_url,
  e.confidence_score,
  e.is_duplicate,
  g.location_name AS gate_location,
  g.direction     AS gate_direction,
  z.zone_id,
  z.zone_name
`;

const BASE_JOIN = `
  FROM detection_events e
  JOIN gates g ON e.gate_id  = g.gate_id
  LEFT JOIN zones z ON g.zone_id = z.zone_id
`;

// ─────────────────────────────────────────────────────────────────────────────
// CREATE DETECTION EVENT
//
// This is the core ANPR processing pipeline. When a camera detects a plate:
//  1. Validate the gate exists and is active
//  2. Normalize plate number
//  3. Check deduplication window (zone-level cooldown)
//  4. Check for active enforcement on this vehicle
//  5. Save the detection event
//  6. If not duplicate → auto-create a ticket
// ─────────────────────────────────────────────────────────────────────────────
const createDetectionEvent = async (data) => {
  const {
    gate_id,
    plate_number,
    detected_at,
    snapshot_url,
    confidence_score,
  } = data;

  const normalizedPlate = plate_number.toUpperCase();
  const detectedAt      = detected_at ? new Date(detected_at) : new Date();

  // ── Step 1: Validate gate exists and is active ────────────────────────────
  const gateResult = await pool.query(
    `SELECT g.gate_id, g.location_name, g.direction, g.zone_id, g.is_active,
            z.deduplication_window_minutes
     FROM gates g
     LEFT JOIN zones z ON g.zone_id = z.zone_id
     WHERE g.gate_id = $1`,
    [gate_id]
  );

  if (!gateResult.rows[0]) {
    const err = new Error('Gate not found.');
    err.statusCode = 404;
    throw err;
  }

  const gate = gateResult.rows[0];

  if (!gate.is_active) {
    const err = new Error('Gate is inactive. Detection events cannot be recorded for inactive gates.');
    err.statusCode = 400;
    throw err;
  }

  // ── Step 2: Check deduplication window ────────────────────────────────────
  // If the same plate was detected in the same zone within the dedup window,
  // mark this event as a duplicate and skip ticket creation
  let isDuplicate = false;

  if (gate.zone_id && gate.deduplication_window_minutes) {
    const dedupWindowMs  = gate.deduplication_window_minutes * 60 * 1000;
    const windowStart    = new Date(detectedAt.getTime() - dedupWindowMs);

    const dedupCheck = await pool.query(
      `SELECT e.event_id
       FROM detection_events e
       JOIN gates g ON e.gate_id = g.gate_id
       WHERE e.plate_number = $1
         AND g.zone_id      = $2
         AND e.detected_at  >= $3
         AND e.detected_at  < $4
         AND e.is_duplicate = FALSE
       ORDER BY e.detected_at DESC
       LIMIT 1`,
      [normalizedPlate, gate.zone_id, windowStart, detectedAt]
    );

    if (dedupCheck.rows[0]) {
      isDuplicate = true;
    }
  }

  // ── Step 3: Save the detection event ─────────────────────────────────────
  const { rows: eventRows } = await pool.query(
    `INSERT INTO detection_events
       (gate_id, plate_number, detected_at, snapshot_url, confidence_score, is_duplicate)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      gate_id,
      normalizedPlate,
      detectedAt,
      snapshot_url || null,
      confidence_score ?? null,
      isDuplicate,
    ]
  );

  const event = eventRows[0];

  // ── Step 4: If duplicate → return early, no ticket ───────────────────────
  if (isDuplicate) {
    return {
      ...event,
      gate_location: gate.location_name,
      gate_direction: gate.direction,
      ticket_created: false,
      message: 'Duplicate detection within deduplication window. No ticket issued.',
    };
  }

  // ── Step 5: Check for active enforcement on this vehicle ──────────────────
  const enforcementCheck = await pool.query(
    `SELECT e.enforcement_id, e.reason
     FROM vehicle_enforcements e
     JOIN vehicles v ON e.vehicle_id = v.vehicle_id
     WHERE v.plate_number = $1
       AND e.is_active    = TRUE`,
    [normalizedPlate]
  );

  const enforcement = enforcementCheck.rows[0] || null;

  // ── Step 6: Attempt to auto-create a ticket ───────────────────────────────
  let ticket = null;

  if (gate.zone_id) {
    ticket = await autoCreateTicket(event, gate, enforcement);
  }

  return {
    ...event,
    gate_location:    gate.location_name,
    gate_direction:   gate.direction,
    zone_id:          gate.zone_id,
    ticket_created:   !!ticket,
    ticket_id:        ticket?.ticket_id || null,
    enforcement_flag: enforcement
      ? { enforcement_id: enforcement.enforcement_id, reason: enforcement.reason }
      : null,
    message: ticket
      ? `Detection recorded. Ticket created (ID: ${ticket.ticket_id}).`
      : 'Detection recorded. No matching pricing rule found — no ticket issued.',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTO CREATE TICKET  (internal helper)
//
// Finds the applicable pricing rule for this zone + vehicle type,
// resolves who to charge (owner or active renter), and creates the ticket.
// ─────────────────────────────────────────────────────────────────────────────
const autoCreateTicket = async (event, gate, enforcement) => {
  // 1. Look up the vehicle to get its type and find owners
  const vehicleResult = await pool.query(
    `SELECT v.vehicle_id, v.vehicle_type, v.plate_number
     FROM vehicles v
     WHERE v.plate_number = $1`,
    [event.plate_number]
  );

  // Vehicle not registered in system — no ticket possible
  if (!vehicleResult.rows[0]) return null;

  const vehicle = vehicleResult.rows[0];

  // 2. Find applicable active pricing rule for this zone + vehicle type
  const ruleResult = await pool.query(
    `SELECT rule_id, rate_per_hour, max_daily_cap
     FROM pricing_rules
     WHERE zone_id      = $1
       AND vehicle_type ILIKE $2
       AND is_active    = TRUE
     LIMIT 1`,
    [gate.zone_id, vehicle.vehicle_type || '%']
  );

  // No pricing rule → no ticket
  if (!ruleResult.rows[0]) return null;

  const rule = ruleResult.rows[0];

  // 3. Resolve who gets charged — check if vehicle is under an active rental
  //    at the time of detection
  const rentalResult = await pool.query(
    `SELECT rental_id, renter_id
     FROM vehicle_rentals
     WHERE vehicle_id = $1
       AND status     = 'ACCEPTED'
       AND start_date <= $2
       AND end_date   >= $2`,
    [vehicle.vehicle_id, event.detected_at]
  );

  let chargedUserId = null;
  let chargedAs     = 'OWNER';
  let rentalId      = null;

  if (rentalResult.rows[0]) {
    // Active rental at detection time → charge the renter
    chargedUserId = rentalResult.rows[0].renter_id;
    chargedAs     = 'RENTER';
    rentalId      = rentalResult.rows[0].rental_id;
  } else {
    // No active rental → charge the verified owner
    const ownerResult = await pool.query(
      `SELECT user_id FROM vehicle_ownerships
       WHERE vehicle_id = $1 AND verified = TRUE
       LIMIT 1`,
      [vehicle.vehicle_id]
    );
    chargedUserId = ownerResult.rows[0]?.user_id || null;
  }

  // 4. Create the ticket
  const { rows: ticketRows } = await pool.query(
    `INSERT INTO tickets
       (event_id, vehicle_id, rule_id, rental_id, charged_user_id,
        charged_as, enforcement_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'UNPAID')
     RETURNING ticket_id`,
    [
      event.event_id,
      vehicle.vehicle_id,
      rule.rule_id,
      rentalId,
      chargedUserId,
      chargedAs,
      enforcement?.enforcement_id || null,
    ]
  );

  return ticketRows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL DETECTION EVENTS  (paginated + all filters)
// ─────────────────────────────────────────────────────────────────────────────
const getAllDetectionEvents = async ({
  page = 1, limit = 20,
  gate_id, plate_number, is_duplicate, from, to, min_confidence,
}) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let idx = 1;

  if (gate_id) {
    conditions.push(`e.gate_id = $${idx++}`);
    values.push(gate_id);
  }

  if (plate_number) {
    conditions.push(`e.plate_number ILIKE $${idx++}`);
    values.push(`%${plate_number}%`);
  }

  if (typeof is_duplicate === 'boolean') {
    conditions.push(`e.is_duplicate = $${idx++}`);
    values.push(is_duplicate);
  }

  if (from) {
    conditions.push(`e.detected_at >= $${idx++}`);
    values.push(new Date(from));
  }

  if (to) {
    conditions.push(`e.detected_at <= $${idx++}`);
    values.push(new Date(to));
  }

  if (min_confidence !== undefined) {
    conditions.push(`e.confidence_score >= $${idx++}`);
    values.push(min_confidence);
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
     ORDER BY e.detected_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET DETECTION EVENT BY ID
// ─────────────────────────────────────────────────────────────────────────────
const getDetectionEventById = async (id) => {
  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} WHERE e.event_id = $1`,
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Detection event not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE DETECTION EVENT  (SUPER_ADMIN only — hidden from dashboard)
// ─────────────────────────────────────────────────────────────────────────────
const deleteDetectionEvent = async (id) => {
  const { rows } = await pool.query(
    'DELETE FROM detection_events WHERE event_id = $1 RETURNING event_id',
    [id]
  );

  if (!rows[0]) {
    const err = new Error('Detection event not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    message:  'Detection event deleted successfully.',
    event_id: rows[0].event_id,
  };
};

module.exports = {
  createDetectionEvent,
  getAllDetectionEvents,
  getDetectionEventById,
  deleteDetectionEvent,
};