const detectionEventService = require('./detectionEvent.service');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/detection-events/test  (admin — testing only)
//
// Accepts plate_number as TEXT and runs the FULL detection pipeline:
//   - plate → vehicle lookup
//   - active enforcement check (STOP/AUTO_BLOCK/OBSERVE)
//   - charged user resolution (renter > owner)
//   - pricing rule lookup
//   - deduplication window check
//   - event + ticket insert
//   - user + admin alerts
// ─────────────────────────────────────────────────────────────────────────────
const testDetection = async (req, res, next) => {
  try {
    const { gate_id, plate_number } = req.body;
    const result = await detectionEventService.processDetectionByPlate({
      gate_id,
      plate_number,
    });
    return res.status(201).json({
      status:  'success',
      message: 'Detection pipeline executed.',
      data:    result,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/detection-events  (Raspberry Pi — production with image)
// ─────────────────────────────────────────────────────────────────────────────
const createDetectionEvent = async (req, res, next) => {
  try {
    const event = await detectionEventService.createDetectionEvent(req.body, req.file);
    return res.status(201).json({
      status:  'success',
      message: 'Detection event recorded.',
      data:    event,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/detection-events
// ─────────────────────────────────────────────────────────────────────────────
const getAllDetectionEvents = async (req, res, next) => {
  try {
    const {
      page, limit,
      gate_id, vehicle_id, plate_number,
      detection_stage, decision, is_duplicate,
      from, to,
    } = req.query;

    const result = await detectionEventService.getAllDetectionEvents({
      page:            page            ? parseInt(page, 10)  : 1,
      limit:           limit           ? parseInt(limit, 10) : 20,
      gate_id:         gate_id         || undefined,
      vehicle_id:      vehicle_id      || undefined,
      plate_number:    plate_number    || undefined,
      detection_stage: detection_stage || undefined,
      decision:        decision        || undefined,
      is_duplicate:    is_duplicate !== undefined ? is_duplicate === 'true' : undefined,
      from:            from            || undefined,
      to:              to              || undefined,
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

const getDetectionEventById = async (req, res, next) => {
  try {
    const event = await detectionEventService.getDetectionEventById(req.params.id);
    return res.status(200).json({ status: 'success', data: event });
  } catch (err) {
    next(err);
  }
};

const updateDetectionEvent = async (req, res, next) => {
  try {
    const event = await detectionEventService.updateDetectionEvent(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Detection event updated successfully.',
      data:    event,
    });
  } catch (err) {
    next(err);
  }
};

const deleteDetectionEvent = async (req, res, next) => {
  try {
    const result = await detectionEventService.deleteDetectionEvent(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  testDetection,           // ← NEW
  createDetectionEvent,
  getAllDetectionEvents,
  getDetectionEventById,
  updateDetectionEvent,
  deleteDetectionEvent,
};
