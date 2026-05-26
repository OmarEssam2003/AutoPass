const notificationService = require('./notification.service');

// ── GET /api/notifications ────────────────────────────────────────────────────
const getAllNotifications = async (req, res, next) => {
  try {
    const {
      page, limit, type, severity, is_read,
      gate_id, vehicle_id, date_from, date_to,
      sort_by, sort_order,
    } = req.query;

    const result = await notificationService.getAllNotifications({
      page:       page       ? parseInt(page, 10)  : 1,
      limit:      limit      ? parseInt(limit, 10) : 20,
      type:       type       || null,
      severity:   severity   || null,
      is_read:    is_read !== undefined ? is_read : null,
      gate_id:    gate_id    || null,
      vehicle_id: vehicle_id || null,
      date_from:  date_from  || null,
      date_to:    date_to    || null,
      sort_by:    sort_by    || 'created_at',
      sort_order: sort_order || 'DESC',
    });

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/notifications/unread-count ───────────────────────────────────────
const getUnreadCount = async (req, res, next) => {
  try {
    const result = await notificationService.getUnreadCount();
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/notifications/:id ────────────────────────────────────────────────
const getNotificationById = async (req, res, next) => {
  try {
    const result = await notificationService.getNotificationById(req.params.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
const markNotificationAsRead = async (req, res, next) => {
  try {
    // Pass admin ID so read_by gets populated
    const adminId = req.user?.id || null;
    const result  = await notificationService.markAsRead(req.params.id, adminId);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/notifications/mark-all-read ────────────────────────────────────
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const adminId = req.user?.id || null;
    const result  = await notificationService.markAllAsRead(adminId);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const result = await notificationService.deleteNotification(req.params.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
};
