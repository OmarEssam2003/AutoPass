const express        = require('express');
const { celebrate }  = require('celebrate');
const router         = express.Router();

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  getAllAlerts,
  getMyAlerts,
  getUnreadCount,
  getAlertById,
  createAlert,
  markAsRead,
  markAllAsRead,
  deleteAlert,
} = require('./alert.controller');
const {
  listAlertsSchema,
  listMyAlertsSchema,
  createAlertSchema,
  updateAlertStatusSchema,
  alertIdSchema,
} = require('./alert.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  GET    /alerts/my              → Any authenticated user (own alerts only)
//  GET    /alerts/unread-count    → Any authenticated user or admin (scoped by role)
//  PATCH  /alerts/mark-all-read   → Any authenticated user or admin (scoped by role)
//  PATCH  /alerts/:id/read        → Any authenticated user or admin
//  GET    /alerts                 → SUPER_ADMIN, OPERATOR (all alerts)
//  GET    /alerts/:id             → SUPER_ADMIN, OPERATOR OR owning user
//  POST   /alerts                 → SUPER_ADMIN, OPERATOR (manual create)
//  DELETE /alerts/:id             → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

// ── User-facing routes (mobile app bell icon) ─────────────────────────────────

// GET  /api/alerts/my
router.get(
  '/my',
  authenticate,
  celebrate(listMyAlertsSchema),
  getMyAlerts
);

// GET  /api/alerts/unread-count
router.get(
  '/unread-count',
  authenticate,
  getUnreadCount
);

// PATCH /api/alerts/mark-all-read
router.patch(
  '/mark-all-read',
  authenticate,
  markAllAsRead
);

// PATCH /api/alerts/:id/read
router.patch(
  '/:id/read',
  authenticate,
  celebrate(alertIdSchema),
  markAsRead
);

// ── Admin routes ──────────────────────────────────────────────────────────────

// GET  /api/alerts
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(listAlertsSchema),
  getAllAlerts
);

// POST /api/alerts
router.post(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(createAlertSchema),
  createAlert
);

// GET  /api/alerts/:id
router.get(
  '/:id',
  authenticate,
  celebrate(alertIdSchema),
  getAlertById
);

// DELETE /api/alerts/:id
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(alertIdSchema),
  deleteAlert
);

module.exports = router;
