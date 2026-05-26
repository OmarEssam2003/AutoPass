const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const { getPaymentByTicketId } = require('./paymentTicket.controller');
const { authenticate }         = require('../../middlewares/auth.middleware');
const { requireRole }          = require('../../middlewares/rbac.middleware');
const { listPaymentTicketsSchema } = require('./paymentTicket.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  GET /payment-tickets?ticket_id=... → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//
//  Single endpoint — answers "which payment covered this ticket?"
//  Returns the full payment record + all tickets covered in that payment.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /payment-tickets:
 *   get:
 *     summary: Get the payment that covered a ticket (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: >
 *       Looks up which payment covered a specific ticket and returns the full
 *       payment record along with all other tickets included in the same payment.
 *
 *       **Use cases:**
 *       - Admin looks up a ticket and wants to see the receipt/payment it was settled in
 *       - Checking if a pay-all batch included other tickets alongside this one
 *
 *       Returns 404 if the ticket exists but has not been paid yet.
 *     tags: [Payment Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: ticket_id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: The ticket ID to look up
 *     responses:
 *       200:
 *         description: Payment that covered this ticket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     payment_id:         { type: string, format: uuid }
 *                     user_id:            { type: string, format: uuid, nullable: true }
 *                     first_name:         { type: string, example: John, nullable: true }
 *                     last_name:          { type: string, example: Doe, nullable: true }
 *                     email:              { type: string, example: john@example.com, nullable: true }
 *                     amount:             { type: number, example: 35.00 }
 *                     payment_method:     { type: string, example: MOBILE_APP }
 *                     status:             { type: string, enum: [COMPLETED, FAILED, REFUNDED] }
 *                     paid_at:            { type: string, format: date-time }
 *                     queried_ticket_id:  { type: string, format: uuid, description: The ticket ID you searched for }
 *                     ticket_count:       { type: integer, example: 3, description: Total tickets in this payment }
 *                     tickets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ticket_id:      { type: string, format: uuid }
 *                           price:          { type: number, example: 15.00, nullable: true }
 *                           status:         { type: string, example: PAID }
 *                           issued_at:      { type: string, format: date-time }
 *                           plate_number:   { type: string, example: "ABC 1234" }
 *                           make:           { type: string, example: Toyota, nullable: true }
 *                           model:          { type: string, example: Corolla, nullable: true }
 *                           gate_name:      { type: string, example: "North Entrance Gate A", nullable: true }
 *                           gate_direction: { type: string, enum: [IN, OUT], nullable: true }
 *                           zone_name:      { type: string, example: "Main Entrance Zone", nullable: true }
 *       404:
 *         description: Ticket not found, or ticket has not been paid yet
 *       422:
 *         description: ticket_id is missing or not a valid UUID
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listPaymentTicketsSchema),
  getPaymentByTicketId
);

module.exports = router;