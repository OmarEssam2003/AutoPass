const pool         = require('../../config/db');
const alertService = require('../alerts/alert.service');

// Optional — only required for production POST endpoint (with image)
let storeDetectionImage = null;
try {
  storeDetectionImage = require('../../services/detectionImage.service').storeDetectionImage;
} catch (_) {
  // If the image service module doesn't exist in your build, the testEvent flow still works.
}

const PUBLIC_COLUMNS = `
  e.event_id,
  e.gate_id,
  g.location_name   AS gate_name,
  g.direction       AS gate_direction,
  z.zone_id,
  z.zone_name,
  e.vehicle_id,
  v.plate_number,
  v.make,
  v.model,
  v.color,
  v.vehicle_type,
  e.image_url,
  e.plate_detected,
  e.detection_stage,
  e.template_confidence,
  e.ocr_text,
  e.ocr_confidence,
  e.decision,
  e.failure_reason,
  e.is_duplicate,
  e.created_at
`;

const BASE_JOIN = `
  FROM detection_events e
  JOIN       gates    g ON e.gate_id    = g.gate_id
  LEFT JOIN  zones    z ON g.zone_id    = z.zone_id
  LEFT JOIN  vehicles v ON e.vehicle_id = v.vehicle_id
`;

// ═════════════════════════════════════════════════════════════════════════════
// FULL DETECTION PIPELINE (TEST ENDPOINT — plate as text, no image)
//
// Pipeline (all wrapped in a single DB transaction):
//
//   1. Validate gate exists and is active
//   2. Resolve plate → vehicle (404 if unknown)
//   3. Check active enforcements on the vehicle
//        - STOP / AUTO_BLOCK → decision=DENY, create admin alert,
//          skip pricing/ticket (the vehicle is being held at the gate)
//        - OBSERVE → decision=OPEN, create admin alert, continue to pricing
//   4. Determine charged user:
//        a. Active ACCEPTED rental covering today → renter
//        b. Otherwise → verified owner
//        c. No owner found → ticket gets charged_as=UNASSIGNED
//   5. Look up pricing rule (zone + vehicle_type, valid_from <= now, is_active)
//        - No rule → ticket created with NULL price (admin will set later)
//   6. Check deduplication window (zone-level)
//        - Duplicate → record event with is_duplicate=true, NO ticket
//   7. Insert detection event
//   8. Insert ticket (if not duplicate, not denied for STOP)
//   9. Create alerts:
//        - User: TICKET_ISSUED (with ticket details)
//        - Admin: STOLEN_DETECTED / ENFORCEMENT_HIT (if enforcement matched)
//        - Admin: DETECTION_FAILED (if plate not in DB)
//
// Returns the full event record + ticket info + decision summary.
// ═════════════════════════════════════════════════════════════════════════════
const processDetectionByPlate = async ({ gate_id, plate_number }) => {
  const client = await pool.connect();
  const summary = {
    decision:       'OPEN',
    failure_reason: null,
    is_duplicate:   false,
    enforcement:    null,
    ticket:         null,
    charged_user:   null,
    alerts_created: [],
  };

  try {
    await client.query('BEGIN');

    // ─── 1. Validate gate ─────────────────────────────────────────────────────
    const gateResult = await client.query(
      `SELECT g.gate_id, g.zone_id, g.location_name, g.direction, g.is_active,
              z.zone_name, z.deduplication_window_minutes
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
      const err = new Error('Gate is inactive and cannot accept detection events.');
      err.statusCode = 403;
      throw err;
    }

    const normalizedPlate = String(plate_number).trim().toUpperCase();

    // ─── 2. Resolve plate → vehicle ───────────────────────────────────────────
    const vehicleResult = await client.query(
      'SELECT vehicle_id, plate_number, vehicle_type FROM vehicles WHERE plate_number = $1',
      [normalizedPlate]
    );

    let vehicle_id = null;
    let vehicle    = null;

    if (vehicleResult.rows[0]) {
      vehicle    = vehicleResult.rows[0];
      vehicle_id = vehicle.vehicle_id;
    } else {
      // Plate not in DB — record event and notify admins; no ticket can be issued.
      summary.decision       = 'DENY';
      summary.failure_reason = `Plate ${normalizedPlate} is not registered in the system.`;
    }

    // ─── 3. Active enforcements ───────────────────────────────────────────────
    let enforcement = null;
    if (vehicle_id) {
      const enfResult = await client.query(
        `SELECT enforcement_id, enforcement_type, priority, reason, notes,
                reported_by_user_id, issued_by
         FROM vehicle_enforcements
         WHERE vehicle_id = $1
           AND is_active  = TRUE
         ORDER BY priority DESC
         LIMIT 1`,
        [vehicle_id]
      );
      if (enfResult.rows[0]) {
        enforcement         = enfResult.rows[0];
        summary.enforcement = enforcement;

        if (enforcement.enforcement_type === 'STOP' ||
            enforcement.enforcement_type === 'AUTO_BLOCK') {
          summary.decision       = 'DENY';
          summary.failure_reason = `${enforcement.enforcement_type} enforcement active: ${enforcement.reason}`;
        }
      }
    }

    // ─── 4. Determine charged user (renter wins over owner) ───────────────────
    let charged_user_id = null;
    let charged_as      = 'UNASSIGNED';
    let rental_id       = null;

    if (vehicle_id && summary.decision === 'OPEN') {
      // 4a. Look for an active ACCEPTED rental covering RIGHT NOW
      const rentalResult = await client.query(
        `SELECT rental_id, renter_id
         FROM vehicle_rentals
         WHERE vehicle_id = $1
           AND status     = 'ACCEPTED'
           AND start_date <= NOW()
           AND end_date   >= NOW()
         ORDER BY start_date DESC
         LIMIT 1`,
        [vehicle_id]
      );

      if (rentalResult.rows[0]) {
        charged_user_id = rentalResult.rows[0].renter_id;
        charged_as      = 'RENTER';
        rental_id       = rentalResult.rows[0].rental_id;
      } else {
        // 4b. Fall back to verified owner (most recent)
        const ownerResult = await client.query(
          `SELECT user_id
           FROM vehicle_ownerships
           WHERE vehicle_id = $1
             AND verified   = TRUE
           ORDER BY created_at DESC
           LIMIT 1`,
          [vehicle_id]
        );
        if (ownerResult.rows[0]) {
          charged_user_id = ownerResult.rows[0].user_id;
          charged_as      = 'OWNER';
        }
      }
      summary.charged_user = { user_id: charged_user_id, charged_as };
    }

    // ─── 5. Look up pricing rule ──────────────────────────────────────────────
    let rule_id = null;
    let price   = null;

    if (vehicle_id && summary.decision === 'OPEN' && vehicle.vehicle_type && gate.zone_id) {
      const ruleResult = await client.query(
        `SELECT rule_id, price
         FROM pricing_rules
         WHERE zone_id      = $1
           AND vehicle_type = $2
           AND is_active    = TRUE
           AND (valid_from IS NULL OR valid_from <= NOW())
         ORDER BY created_at DESC
         LIMIT 1`,
        [gate.zone_id, vehicle.vehicle_type]
      );
      if (ruleResult.rows[0]) {
        rule_id = ruleResult.rows[0].rule_id;
        price   = ruleResult.rows[0].price;
      }
    }

    // ─── 6. Deduplication check ───────────────────────────────────────────────
    let is_duplicate = false;
    if (vehicle_id && gate.zone_id) {
      const dedupResult = await client.query(
        `SELECT e.event_id
         FROM detection_events e
         JOIN gates g ON e.gate_id = g.gate_id
         WHERE e.vehicle_id    = $1
           AND g.zone_id       = $2
           AND e.is_duplicate  = FALSE
           AND e.created_at   >= NOW() - ($3 * INTERVAL '1 minute')
         LIMIT 1`,
        [vehicle_id, gate.zone_id, gate.deduplication_window_minutes || 15]
      );
      if (dedupResult.rows[0]) {
        is_duplicate = true;
      }
    }
    summary.is_duplicate = is_duplicate;

    // ─── 7. Insert detection event ────────────────────────────────────────────
    const detectionStage = vehicle_id ? 'SUCCESS' : 'OCR_FAIL';
    const plateDetected  = true;

    const eventResult = await client.query(
      `INSERT INTO detection_events
         (gate_id, vehicle_id, image_url,
          plate_detected, detection_stage,
          template_confidence, ocr_text, ocr_confidence,
          decision, failure_reason, is_duplicate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING event_id`,
      [
        gate_id,
        vehicle_id,
        'TEST_NO_IMAGE',                // placeholder for image_url (test mode)
        plateDetected,
        detectionStage,
        null,                            // template_confidence
        normalizedPlate,
        null,                            // ocr_confidence
        summary.decision,
        summary.failure_reason,
        is_duplicate,
      ]
    );
    const event_id = eventResult.rows[0].event_id;

    // ─── 8. Create ticket (if not duplicate, not denied, vehicle known) ───────
    let ticket_id = null;
    if (vehicle_id && summary.decision === 'OPEN' && !is_duplicate) {
      const ticketResult = await client.query(
        `INSERT INTO tickets
           (event_id, vehicle_id, rule_id, rental_id,
            charged_user_id, charged_as,
            gate_id, zone_id, direction, price, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'UNPAID')
         RETURNING ticket_id`,
        [
          event_id,
          vehicle_id,
          rule_id,
          rental_id,
          charged_user_id,
          charged_as,
          gate_id,
          gate.zone_id,
          gate.direction,
          price,
        ]
      );
      ticket_id      = ticketResult.rows[0].ticket_id;
      summary.ticket = {
        ticket_id,
        price,
        charged_user_id,
        charged_as,
      };
    }

    // ─── 9. Create alerts ─────────────────────────────────────────────────────

    // 9a. User alert — ticket was issued to them
    if (ticket_id && charged_user_id) {
      const alertId = await alertService.createAlertInTransaction(client, {
        user_id:    charged_user_id,
        type:       'TICKET_ISSUED',
        title:      `New ticket — ${normalizedPlate}`,
        message:    price !== null
                      ? `A new toll ticket of ${parseFloat(price).toFixed(2)} LE has been issued for ${normalizedPlate} at ${gate.location_name}.`
                      : `A new toll ticket has been issued for ${normalizedPlate} at ${gate.location_name}. Price pending.`,
        severity:   'INFO',
        vehicle_id,
        gate_id,
        event_id,
        ticket_id,
      });
      summary.alerts_created.push({ id: alertId, kind: 'user_ticket' });
    }

    // 9b. Admin alert — stolen-vehicle detection (user-reported STOP)
    if (enforcement && enforcement.enforcement_type === 'STOP' && enforcement.reported_by_user_id) {
      const alertId = await alertService.createAlertInTransaction(client, {
        user_id:        null,
        admin_id:       null,                       // system-wide event
        type:           'STOLEN_DETECTED',
        title:          `🚨 Stolen vehicle ${normalizedPlate} detected`,
        message:        `Stolen vehicle ${normalizedPlate} was detected at ${gate.location_name} (${gate.direction}). Gate denied entry. Reason: ${enforcement.reason}`,
        severity:       'CRITICAL',
        vehicle_id,
        gate_id,
        event_id,
        enforcement_id: enforcement.enforcement_id,
      });
      summary.alerts_created.push({ id: alertId, kind: 'admin_stolen' });
    }
    // 9c. Admin alert — general enforcement hit (admin-issued STOP / AUTO_BLOCK)
    else if (enforcement && (enforcement.enforcement_type === 'STOP' || enforcement.enforcement_type === 'AUTO_BLOCK')) {
      const alertId = await alertService.createAlertInTransaction(client, {
        type:           'ENFORCEMENT_HIT',
        title:          `${enforcement.enforcement_type} enforcement hit — ${normalizedPlate}`,
        message:        `${enforcement.enforcement_type} enforcement triggered for ${normalizedPlate} at ${gate.location_name}. Reason: ${enforcement.reason}`,
        severity:       enforcement.enforcement_type === 'STOP' ? 'CRITICAL' : 'WARNING',
        vehicle_id,
        gate_id,
        event_id,
        enforcement_id: enforcement.enforcement_id,
      });
      summary.alerts_created.push({ id: alertId, kind: 'admin_enforcement' });
    }
    // 9d. Admin alert — OBSERVE (informational)
    else if (enforcement && enforcement.enforcement_type === 'OBSERVE') {
      const alertId = await alertService.createAlertInTransaction(client, {
        type:           'ENFORCEMENT_HIT',
        title:          `OBSERVE flag — ${normalizedPlate}`,
        message:        `Vehicle ${normalizedPlate} (under OBSERVE) passed ${gate.location_name}. Reason: ${enforcement.reason}`,
        severity:       'INFO',
        vehicle_id,
        gate_id,
        event_id,
        enforcement_id: enforcement.enforcement_id,
      });
      summary.alerts_created.push({ id: alertId, kind: 'admin_observe' });
    }

    // 9e. Admin alert — unknown plate (couldn't resolve to a vehicle)
    if (!vehicle_id) {
      const alertId = await alertService.createAlertInTransaction(client, {
        type:        'DETECTION_FAILED',
        title:       `Unknown plate detected — ${normalizedPlate}`,
        message:     `Plate ${normalizedPlate} was detected at ${gate.location_name} but is not registered in the system.`,
        severity:    'WARNING',
        gate_id,
        event_id,
      });
      summary.alerts_created.push({ id: alertId, kind: 'admin_unknown' });
    }

    await client.query('COMMIT');

    // Re-fetch the full event record for the response
    const event = await getDetectionEventById(event_id);

    return {
      event,
      summary,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// CREATE DETECTION EVENT  (legacy — Raspberry Pi w/ image upload)
//
// Kept as-is. The new pipeline above (processDetectionByPlate) is the
// preferred entry point for testing and for non-image-based detection sources.
// ═════════════════════════════════════════════════════════════════════════════
const createDetectionEvent = async (data, imageFile) => {
  const {
    gate_id,
    plate_detected      = null,
    detection_stage     = null,
    template_confidence = null,
    ocr_text            = null,
    ocr_confidence      = null,
    decision            = null,
    failure_reason      = null,
  } = data;

  const gateResult = await pool.query(
    'SELECT gate_id, zone_id, is_active FROM gates WHERE gate_id = $1',
    [gate_id]
  );
  if (!gateResult.rows[0]) {
    const err = new Error('Gate not found.');
    err.statusCode = 404;
    throw err;
  }
  if (!gateResult.rows[0].is_active) {
    const err = new Error('Gate is inactive and cannot accept detection events.');
    err.statusCode = 403;
    throw err;
  }
  const zone_id = gateResult.rows[0].zone_id;

  if (!storeDetectionImage) {
    const err = new Error('Image storage service is not configured on this server.');
    err.statusCode = 500;
    throw err;
  }

  const image_url = await storeDetectionImage(
    imageFile.buffer,
    imageFile.mimetype,
    imageFile.originalname,
    gate_id,
  );

  let vehicle_id = null;
  const normalizedPlate = ocr_text ? ocr_text.trim().toUpperCase() : null;

  if (detection_stage === 'SUCCESS' && normalizedPlate) {
    const vehicleResult = await pool.query(
      'SELECT vehicle_id FROM vehicles WHERE plate_number = $1',
      [normalizedPlate]
    );
    if (vehicleResult.rows[0]) {
      vehicle_id = vehicleResult.rows[0].vehicle_id;
    }
  }

  let is_duplicate = false;
  if (vehicle_id && zone_id) {
    const dedupResult = await pool.query(
      `SELECT e.event_id
       FROM detection_events e
       JOIN gates g ON e.gate_id = g.gate_id
       JOIN zones z ON g.zone_id = z.zone_id
       WHERE e.vehicle_id = $1
         AND g.zone_id    = $2
         AND e.is_duplicate = FALSE
         AND e.created_at >= NOW() - (z.deduplication_window_minutes * INTERVAL '1 minute')
       LIMIT 1`,
      [vehicle_id, zone_id]
    );
    if (dedupResult.rows[0]) is_duplicate = true;
  }

  const { rows } = await pool.query(
    `INSERT INTO detection_events
       (gate_id, vehicle_id, image_url,
        plate_detected, detection_stage,
        template_confidence, ocr_text, ocr_confidence,
        decision, failure_reason, is_duplicate)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING event_id`,
    [
      gate_id, vehicle_id, image_url,
      plate_detected, detection_stage,
      template_confidence, normalizedPlate, ocr_confidence,
      decision, failure_reason || null, is_duplicate,
    ]
  );

  return getDetectionEventById(rows[0].event_id);
};

// ═════════════════════════════════════════════════════════════════════════════
// READ / UPDATE / DELETE  (unchanged from the original service)
// ═════════════════════════════════════════════════════════════════════════════
const getAllDetectionEvents = async ({
  page = 1, limit = 20,
  gate_id, vehicle_id, plate_number,
  detection_stage, decision, is_duplicate,
  from, to,
}) => {
  const offset     = (page - 1) * limit;
  const conditions = [];
  const values     = [];
  let   idx        = 1;

  if (gate_id) { conditions.push(`e.gate_id = $${idx++}`); values.push(gate_id); }

  if (vehicle_id) {
    conditions.push(`e.vehicle_id = $${idx++}`);
    values.push(vehicle_id);
  } else if (plate_number) {
    conditions.push(`v.plate_number = $${idx++}`);
    values.push(plate_number.toUpperCase());
  }

  if (detection_stage) { conditions.push(`e.detection_stage = $${idx++}`); values.push(detection_stage); }
  if (decision)        { conditions.push(`e.decision        = $${idx++}`); values.push(decision); }
  if (typeof is_duplicate === 'boolean') {
    conditions.push(`e.is_duplicate = $${idx++}`); values.push(is_duplicate);
  }
  if (from) { conditions.push(`e.created_at >= $${idx++}`); values.push(new Date(from)); }
  if (to)   { conditions.push(`e.created_at <= $${idx++}`); values.push(new Date(to)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await pool.query(
    `SELECT COUNT(*) ${BASE_JOIN} ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await pool.query(
    `SELECT ${PUBLIC_COLUMNS} ${BASE_JOIN} ${where}
     ORDER BY e.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    meta: { total, page, limit, total_pages: Math.ceil(total / limit) },
  };
};

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

const updateDetectionEvent = async (id, data) => {
  await getDetectionEventById(id);
  const allowed = [
    'plate_detected', 'detection_stage',
    'template_confidence', 'ocr_text', 'ocr_confidence',
    'decision', 'failure_reason', 'is_duplicate',
  ];
  const fields = [];
  const values = [];
  let   idx    = 1;

  for (const key of allowed) {
    if (key in data) {
      fields.push(`${key} = $${idx++}`);
      values.push(data[key] ?? null);
    }
  }

  if (!fields.length) {
    const err = new Error('No valid fields provided for update.');
    err.statusCode = 400;
    throw err;
  }

  values.push(id);
  await pool.query(
    `UPDATE detection_events SET ${fields.join(', ')} WHERE event_id = $${idx}`,
    values
  );
  return getDetectionEventById(id);
};

const deleteDetectionEvent = async (id) => {
  await getDetectionEventById(id);
  const linked = await pool.query(
    'SELECT COUNT(*) FROM tickets WHERE event_id = $1', [id]
  );
  if (parseInt(linked.rows[0].count, 10) > 0) {
    const err = new Error(
      'Cannot delete this detection event — it has tickets linked to it. ' +
      'Cancel or delete the linked tickets first.'
    );
    err.statusCode = 409;
    throw err;
  }
  await pool.query('DELETE FROM detection_events WHERE event_id = $1', [id]);
  return { message: 'Detection event deleted successfully.', event_id: id };
};

module.exports = {
  processDetectionByPlate,   // ← NEW: full pipeline, text-only plate input
  createDetectionEvent,       // ← legacy: Raspberry Pi w/ image
  getAllDetectionEvents,
  getDetectionEventById,
  updateDetectionEvent,
  deleteDetectionEvent,
};
