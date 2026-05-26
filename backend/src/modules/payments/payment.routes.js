
const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  payTicket,
  payAll,
  refundPayment,
  getAllPayments,
  getPaymentById,
  getMyPayments,   // ← ADD
} = require('./payment.controller');

const { authenticate }        = require('../../middlewares/auth.middleware');
const { requireRole }         = require('../../middlewares/rbac.middleware');
const { requireUser }         = require('../../middlewares/rbac.middleware');
const {
  payTicketSchema,
  payAllSchema,
  refundSchema,
  listPaymentsSchema,
  idParamSchema,
} = require('./payment.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST /payments/pay          → Authenticated USER (mobile app)
//  POST /payments/pay-all      → Authenticated USER (mobile app)
//  POST /payments/:id/refund   → SUPER_ADMIN only
//  GET  /payments              → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  GET  /payments/:id          → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//
// NOTE: /pay and /pay-all must be registered BEFORE /:id
//       to prevent Express matching "pay" as a UUID param.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /payments/pay:
 *   post:
 *     summary: Pay a single ticket (User — mobile app)
 *     description: >
 *       Pays one specific ticket. The authenticated user must be the
 *       `charged_user_id` on the ticket.
 *
 *       **Business rules:**
 *       - Ticket must be **UNPAID**
 *       - Ticket must have a **price set** (non-zero)
 *       - User must be the **charged user** on the ticket
 *
 *       All DB writes (payment record + junction row + ticket status update)
 *       happen inside a single transaction — either all succeed or all roll back.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayTicketBody'
 *           example:
 *             ticket_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             payment_method: "MOBILE_APP"
 *     responses:
 *       201:
 *         description: Ticket paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResultResponse'
 *       403:
 *         description: Ticket not assigned to your account
 *       404:
 *         description: Ticket not found
 *       409:
 *         description: Ticket is not UNPAID, or has no price set
 *       422:
 *         description: Validation error
 */
router.post(
  '/pay',
  authenticate,
  requireUser,
  celebrate(payTicketSchema),
  payTicket
);

/**
 * @swagger
 * /payments/pay-all:
 *   post:
 *     summary: Pay all unpaid tickets for a vehicle (User — mobile app)
 *     description: >
 *       Pays all UNPAID tickets for the specified vehicle that are assigned
 *       to the authenticated user in a single transaction.
 *
 *       **Business rules:**
 *       - Only tickets where `charged_user_id` = the authenticated user are included
 *       - Only tickets with `status = UNPAID` and a valid price are included
 *       - At least one eligible ticket must exist
 *       - One payment record is created covering all tickets
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayAllBody'
 *           example:
 *             vehicle_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *             payment_method: "MOBILE_APP"
 *     responses:
 *       201:
 *         description: All tickets paid successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResultResponse'
 *       404:
 *         description: No unpaid tickets found for this vehicle assigned to your account
 *       422:
 *         description: Validation error
 */
router.post(
  '/pay-all',
  authenticate,
  requireUser,
  celebrate(payAllSchema),
  payAll
);

/**
 * @swagger
 * /payments/{id}/refund:
 *   post:
 *     summary: Refund a payment (SUPER_ADMIN only)
 *     description: >
 *       Marks a COMPLETED payment as REFUNDED and sets all linked tickets
 *       back to UNPAID.
 *
 *       **Business rules:**
 *       - Payment must be **COMPLETED** — cannot refund FAILED or already REFUNDED payments
 *       - All linked tickets are reverted to UNPAID in the same transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Payment ID to refund
 *     responses:
 *       200:
 *         description: Payment refunded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 payment: { $ref: '#/components/schemas/PaymentResponse' }
 *                 message: { type: string, example: "Payment refunded. 2 ticket(s) set back to UNPAID." }
 *       404:
 *         description: Payment not found
 *       409:
 *         description: Payment is not COMPLETED
 */
router.post(
  '/:id/refund',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(refundSchema),
  refundPayment
);

/**
 * @swagger
 * /payments/my:
 *   get:
 *     summary: Get my payment history (User — mobile app)
 *     description: Returns all payments made by the authenticated user.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: User's payment history
 */
router.get('/my', authenticate, requireUser, getMyPayments);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: List payments (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: Returns all payments ordered newest first.
 *     tags: [Payments]
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
 *         name: user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [COMPLETED, FAILED, REFUNDED] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time, example: "2026-01-01T00:00:00Z" }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time, example: "2026-12-31T23:59:59Z" }
 *     responses:
 *       200:
 *         description: List of payments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/PaymentResponse' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listPaymentsSchema),
  getAllPayments
);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get a payment by ID with full ticket breakdown (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Full payment detail including ticket breakdown
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/PaymentDetailResponse' }
 *       404:
 *         description: Payment not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getPaymentById
);

module.exports = router;