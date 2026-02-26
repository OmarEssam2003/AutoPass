const detectionEventService = require('./detectionevent.service');

// ── POST /api/detection-events ────────────────────────────────────────────────
const createDetectionEvent = async (req, res, next) => {
  try {
    const result = await detectionEventService.createDetectionEvent(req.body);
    return res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/detection-events ─────────────────────────────────────────────────
const getAllDetectionEvents = async (req, res, next) => {
  try {
    const {
      page, limit, gate_id, plate_number,
      is_duplicate, from, to, min_confidence,
    } = req.query;

    const result = await detectionEventService.getAllDetectionEvents({
      page:           page   ? parseInt(page, 10)  : 1,
      limit:          limit  ? parseInt(limit, 10) : 20,
      gate_id:        gate_id        || undefined,
      plate_number:   plate_number   || undefined,
      is_duplicate:   is_duplicate !== undefined ? is_duplicate === 'true' : undefined,
      from:           from           || undefined,
      to:             to             || undefined,
      min_confidence: min_confidence ? parseFloat(min_confidence) : undefined,
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/detection-events/:id ─────────────────────────────────────────────
const getDetectionEventById = async (req, res, next) => {
  try {
    const event = await detectionEventService.getDetectionEventById(req.params.id);
    return res.status(200).json({ status: 'success', data: event });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/detection-events/:id ─────────────────────────────────────────
const deleteDetectionEvent = async (req, res, next) => {
  try {
    const result = await detectionEventService.deleteDetectionEvent(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDetectionEvent,
  getAllDetectionEvents,
  getDetectionEventById,
  deleteDetectionEvent,
};