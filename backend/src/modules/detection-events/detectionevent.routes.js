const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createDetectionEvent,
  getAllDetectionEvents,
  getDetectionEventById,
  deleteDetectionEvent,
} = require('./detectionevent.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createDetectionEventSchema,
  listDetectionEventsSchema,
  idParamSchema,
} = require('./detectionevent.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /detection-events      → Any authenticated request (ANPR camera devices)
//  GET    /detection-events      → All admin levels
//  GET    /detection-events/:id  → All admin levels
//  DELETE /detection-events/:id  → SUPER_ADMIN only (hidden from dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /detection-events:
 *   post:
 *     summary: Record a plate detection event (ANPR camera device)
 *     description: >
 *       Posted by ANPR camera devices when a plate is detected at a gate.
 *       This endpoint runs the full ANPR processing pipeline:
 *
 *       1. **Validates** the gate exists and is active
 *       2. **Deduplication check** — if the same plate was detected in the same
 *          zone within the zone's `deduplication_window_minutes`, the event is
 *          marked as `is_duplicate = true` and no ticket is created
 *       3. **Saves** the detection event
 *       4. **Enforcement check** — flags if vehicle has an active enforcement record
 *       5. **Auto-creates a ticket** if a matching pricing rule exists for the zone
 *          and vehicle type
 *       6. **Charge resolution** — if vehicle is under an active rental at detection
 *          time, the ticket is charged to the **renter**, otherwise to the **owner**
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDetectionEventBody'
 *           example:
 *             gate_id:          "d4e5f6a7-b8c9-0123-defa-234567890123"
 *             plate_number:     "ABC 1234"
 *             detected_at:      "2026-03-01T08:32:00.000Z"
 *             snapshot_url:     "https://cdn.autopass.com/snapshots/abc1234-20260301.jpg"
 *             confidence_score: 97.50
 *     responses:
 *       201:
 *         description: Detection event recorded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/DetectionEventResponse'
 *       400:
 *         description: Gate is inactive
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Gate not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  celebrate(createDetectionEventSchema),
  createDetectionEvent
);

/**
 * @swagger
 * /detection-events:
 *   get:
 *     summary: List detection events (All admin levels)
 *     description: Returns a paginated list of detection events with gate and zone info.
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: gate_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by gate
 *       - in: query
 *         name: plate_number
 *         schema: { type: string }
 *         description: Search by plate number (partial match)
 *       - in: query
 *         name: is_duplicate
 *         schema: { type: boolean }
 *         description: Filter duplicate events
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Filter events detected from this date/time
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Filter events detected up to this date/time
 *       - in: query
 *         name: min_confidence
 *         schema: { type: number }
 *         description: Filter by minimum confidence score
 *     responses:
 *       200:
 *         description: List of detection events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/DetectionEventResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin access required
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listDetectionEventsSchema),
  getAllDetectionEvents
);

/**
 * @swagger
 * /detection-events/{id}:
 *   get:
 *     summary: Get a detection event by ID (All admin levels)
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the detection event
 *     responses:
 *       200:
 *         description: Detection event data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/DetectionEventResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — admin access required
 *       404:
 *         description: Detection event not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getDetectionEventById
);

/**
 * @swagger
 * /detection-events/{id}:
 *   delete:
 *     summary: Delete a detection event (SUPER_ADMIN only — not exposed in dashboard)
 *     description: >
 *       Permanently deletes a detection event. Detection events are intended to be
 *       immutable — this endpoint exists only for administrative data correction
 *       and is intentionally not exposed in the admin dashboard UI.
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the detection event to delete
 *     responses:
 *       200:
 *         description: Detection event deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:   { type: string, example: success }
 *                 message:  { type: string, example: Detection event deleted successfully. }
 *                 event_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN only
 *       404:
 *         description: Detection event not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(idParamSchema),
  deleteDetectionEvent
);

module.exports = router;