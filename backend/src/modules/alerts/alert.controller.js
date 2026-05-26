const alertService = require('./alert.service');

// ── GET /api/alerts  (admin — all alerts) ─────────────────────────────────────
const getAllAlerts = async (req, res, next) => {
  try {
    const {
      page, limit, type, severity, is_read,
      user_id, target_audience, sort_by, sort_order,
    } = req.query;

    const result = await alertService.getAllAlerts({
      page:            page  ? parseInt(page, 10)  : 1,
      limit:           limit ? parseInt(limit, 10) : 20,
      type:            type            || null,
      severity:        severity        || null,
      is_read:         is_read !== undefined ? is_read : null,
      user_id:         user_id         || null,
      target_audience: target_audience || null,
      sort_by:         sort_by         || 'created_at',
      sort_order:      sort_order      || 'DESC',
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/alerts/my  (user — own alerts scoped by JWT) ─────────────────────
const getMyAlerts = async (req, res, next) => {
  try {
    const { page, limit, type, is_read } = req.query;

    const result = await alertService.getAllAlerts({
      page:            page  ? parseInt(page, 10)  : 1,
      limit:           limit ? parseInt(limit, 10) : 20,
      type:            type    || null,
      is_read:         is_read !== undefined ? is_read : null,
      user_id:         req.user.id,
      target_audience: 'USER',
      sort_by:         'created_at',
      sort_order:      'DESC',
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/alerts/unread-count ──────────────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const isAdmin   = req.user.type === 'admin';
    const userId    = isAdmin ? null      : req.user.id;
    const audience  = isAdmin ? 'ADMIN'   : 'USER';
    const result    = await alertService.getUnreadCount(userId, audience);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/alerts/:id ───────────────────────────────────────────────────────
const getAlertById = async (req, res, next) => {
  try {
    const result = await alertService.getAlertById(req.params.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/alerts  (admin manual create) ───────────────────────────────────
const createAlert = async (req, res, next) => {
  try {
    const result = await alertService.createAlert(req.body);
    return res.status(201).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/alerts/:id/read ────────────────────────────────────────────────
const markAsRead = async (req, res, next) => {
  try {
    const result = await alertService.markAsRead(req.params.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/alerts/mark-all-read ──────────────────────────────────────────
const markAllAsRead = async (req, res, next) => {
  try {
    const isAdmin  = req.user.type === 'admin';
    const userId   = isAdmin ? null    : req.user.id;
    const audience = isAdmin ? 'ADMIN' : 'USER';
    const result   = await alertService.markAllAsRead(userId, audience);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/alerts/:id ────────────────────────────────────────────────────
const deleteAlert = async (req, res, next) => {
  try {
    const result = await alertService.deleteAlert(req.params.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllAlerts,
  getMyAlerts,
  getUnreadCount,
  getAlertById,
  createAlert,
  markAsRead,
  markAllAsRead,
  deleteAlert,
};
