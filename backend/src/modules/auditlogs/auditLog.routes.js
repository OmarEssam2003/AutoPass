const express = require('express');
const router  = express.Router();
const { getAllAuditLogs } = require('./auditLog.controller');
const { authenticate }   = require('../../middlewares/auth.middleware');
const { requireRole }    = require('../../middlewares/rbac.middleware');

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     summary: List audit logs (SUPER_ADMIN, FINANCE_ADMIN)
 *     description: >
 *       Immutable append-only record of every admin action.
 *       Audit logs are never modified or deleted.
 *     tags: [Audit Logs]
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
 *         name: action_type
 *         schema: { type: string, example: UPDATE_ENFORCEMENT }
 *         description: Partial match on action type
 *       - in: query
 *         name: entity_type
 *         schema: { type: string, example: tickets }
 *         description: Partial match on entity/table name
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time, example: "2026-01-01T00:00:00Z" }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time, example: "2026-12-31T23:59:59Z" }
 *     responses:
 *       200:
 *         description: List of audit log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/AuditLogResponse' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'FINANCE_ADMIN'), getAllAuditLogs);

module.exports = router;
