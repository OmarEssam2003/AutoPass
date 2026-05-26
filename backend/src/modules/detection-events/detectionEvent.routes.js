const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  testDetection,                  // ← NEW
  createDetectionEvent,
  getAllDetectionEvents,
  getDetectionEventById,
  updateDetectionEvent,
  deleteDetectionEvent,
} = require('./detectionEvent.controller');

const { authenticate }   = require('../../middlewares/auth.middleware');
const { requireRole }    = require('../../middlewares/rbac.middleware');
const { validateApiKey } = require('../../middlewares/apiKey.middleware');
const { upload }         = require('../../config/multer');
const {
  testDetectionSchema,             // ← NEW
  validateCreateDetectionEvent,
  listDetectionEventsSchema,
  updateDetectionEventSchema,
  idParamSchema,
} = require('./detectionEvent.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /detection-events/test  → SUPER_ADMIN, SECURITY_ADMIN, OPERATOR
//                                   (testing endpoint — runs full pipeline
//                                    from a plain text plate number)
//  POST   /detection-events       → Raspberry Pi device (x-api-key header)
//  GET    /detection-events       → SUPER_ADMIN, SECURITY_ADMIN, OPERATOR
//  GET    /detection-events/:id   → SUPER_ADMIN, SECURITY_ADMIN, OPERATOR
//  PUT    /detection-events/:id   → SUPER_ADMIN only
//  DELETE /detection-events/:id   → SUPER_ADMIN only
//
// NOTE: /test must be registered BEFORE /:id so Express doesn't match "test"
//       as a UUID param.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /detection-events/test:
 *   post:
 *     summary: Run the full detection pipeline from a plate string (Admin testing)
 *     description: >
 *       **Testing endpoint** — simulates a complete ANPR detection event
 *       without an image. Useful for QA, demos, and integration tests.
 *
 *       Runs the full pipeline:
 *       1. Validates gate is active
 *       2. Resolves plate → vehicle
 *       3. Checks active enforcements (STOP / AUTO_BLOCK / OBSERVE)
 *       4. Determines charged user (active renter > verified owner)
 *       5. Looks up pricing rule for the zone + vehicle_type
 *       6. Applies deduplication window
 *       7. Inserts detection event + ticket
 *       8. Creates user alert (TICKET_ISSUED) + admin alerts as appropriate
 *
 *       All writes occur inside a single transaction.
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [gate_id, plate_number]
 *             properties:
 *               gate_id:
 *                 type: string
 *                 format: uuid
 *                 description: UUID of any active gate
 *               plate_number:
 *                 type: string
 *                 description: Plate string to detect (case-insensitive)
 *                 example: "ABC 1234"
 *     responses:
 *       201:
 *         description: Pipeline executed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string }
 *                 data:
 *                   type: object
 *                   properties:
 *                     event:   { $ref: '#/components/schemas/DetectionEventResponse' }
 *                     summary:
 *                       type: object
 *                       properties:
 *                         decision:        { type: string, enum: [OPEN, DENY] }
 *                         failure_reason:  { type: string, nullable: true }
 *                         is_duplicate:    { type: boolean }
 *                         enforcement:     { type: object, nullable: true }
 *                         ticket:          { type: object, nullable: true }
 *                         charged_user:    { type: object, nullable: true }
 *                         alerts_created:  { type: array }
 *       403:
 *         description: Gate is inactive
 *       404:
 *         description: Gate not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/test',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(testDetectionSchema),
  testDetection
);

/**
 * @swagger
 * /detection-events:
 *   post:
 *     summary: Record a detection event (Raspberry Pi device — x-api-key)
 *     description: Production endpoint — called by the Pi after each ANPR scan.
 *     tags: [Detection Events]
 *     security:
 *       - apiKeyAuth: []
 */
router.post(
  '/',
  validateApiKey,
  upload.single('gate_image'),
  validateCreateDetectionEvent,
  createDetectionEvent
);

/**
 * @swagger
 * /detection-events:
 *   get:
 *     summary: List detection events (SUPER_ADMIN, SECURITY_ADMIN, OPERATOR)
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(listDetectionEventsSchema),
  getAllDetectionEvents
);

/**
 * @swagger
 * /detection-events/{id}:
 *   get:
 *     summary: Get a detection event by ID
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getDetectionEventById
);

/**
 * @swagger
 * /detection-events/{id}:
 *   put:
 *     summary: Correct a detection event (SUPER_ADMIN only)
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(updateDetectionEventSchema),
  updateDetectionEvent
);

/**
 * @swagger
 * /detection-events/{id}:
 *   delete:
 *     summary: Delete a detection event (SUPER_ADMIN only)
 *     tags: [Detection Events]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(idParamSchema),
  deleteDetectionEvent
);

module.exports = router;
