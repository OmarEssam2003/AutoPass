const express        = require('express');
const { celebrate }  = require('celebrate');
const router         = express.Router();

const { authenticate }  = require('../../middlewares/auth.middleware');
const { requireRole }   = require('../../middlewares/rbac.middleware');
const {
  getAllNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification,
} = require('./notification.controller');
const {
  listNotificationsSchema,
  notificationIdSchema,
} = require('./notification.validation');

// ── All routes require admin authentication ───────────────────────────────────

// GET  /api/notifications/unread-count
router.get(
  '/unread-count',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  getUnreadCount
);

// PATCH /api/notifications/mark-all-read
router.patch(
  '/mark-all-read',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  markAllNotificationsAsRead
);

// GET  /api/notifications
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(listNotificationsSchema),
  getAllNotifications
);

// GET  /api/notifications/:id
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(notificationIdSchema),
  getNotificationById
);

// PATCH /api/notifications/:id/read
router.patch(
  '/:id/read',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(notificationIdSchema),
  markNotificationAsRead
);

// DELETE /api/notifications/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(notificationIdSchema),
  deleteNotification
);

module.exports = router;
