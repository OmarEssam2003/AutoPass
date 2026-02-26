const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  getAllTickets,
  getTicketById,
  payTicket,
  updateTicket,
  deleteTicket,
} = require('./ticket.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  listTicketsSchema,
  payTicketSchema,
  updateTicketSchema,
  idParamSchema,
} = require('./ticket.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  GET    /tickets            → SUPER_ADMIN, FINANCE_ADMIN, SECURITY_ADMIN (all)
//                               OR any authenticated user (own tickets only)
//  GET    /tickets/:id        → Same as above
//  PATCH  /tickets/:id/pay    → Any authenticated user (their own ticket only)
//  PUT    /tickets/:id        → SUPER_ADMIN, FINANCE_ADMIN (manual override)
//  DELETE /tickets/:id        → SUPER_ADMIN, FINANCE_ADMIN (API only, not dashboard)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: List tickets
 *     description: >
 *       **Admins** (SUPER_ADMIN, FINANCE_ADMIN, SECURITY_ADMIN) receive all tickets
 *       with optional filters.
 *
 *       **Regular users** automatically receive only tickets charged to them —
 *       filters like `charged_user_id` are ignored for non-admin callers.
 *     tags: [Tickets]
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
 *         name: status
 *         schema: { type: string, enum: [UNPAID, PAID, DISPUTED, CANCELLED] }
 *       - in: query
 *         name: charged_user_id
 *         schema: { type: string, format: uuid }
 *         description: Admin filter — ignored for regular users
 *       - in: query
 *         name: vehicle_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: charged_as
 *         schema: { type: string, enum: [OWNER, RENTER] }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *     responses:
 *       200:
 *         description: List of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TicketResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  celebrate(listTicketsSchema),
  getAllTickets
);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get a ticket by ID
 *     description: >
 *       Admins can fetch any ticket.
 *       Regular users can only fetch tickets charged to them — returns 403 otherwise.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ticket data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/TicketResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ticket does not belong to you
 *       404:
 *         description: Ticket not found
 */
router.get(
  '/:id',
  authenticate,
  celebrate(idParamSchema),
  getTicketById
);

/**
 * @swagger
 * /tickets/{id}/pay:
 *   patch:
 *     summary: Pay a ticket (authenticated user — mobile app)
 *     description: >
 *       Called from the mobile app when a user pays their ticket.
 *       Only the user the ticket is charged to can pay it.
 *
 *       **What happens on payment:**
 *       - Final amount is calculated: `rate_per_hour × hours` (capped at `max_daily_cap`)
 *       - Minimum charge is 1 hour
 *       - Ticket status is set to **PAID**
 *       - A **payment record** is automatically created
 *       - Both updates happen in a single DB transaction
 *
 *       Only **UNPAID** tickets can be paid.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the ticket to pay
 *     responses:
 *       200:
 *         description: Ticket paid successfully — payment record created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: object
 *                   properties:
 *                     ticket:
 *                       $ref: '#/components/schemas/TicketResponse'
 *                     payment:
 *                       $ref: '#/components/schemas/PaymentResponse'
 *                     message:
 *                       type: string
 *                       example: "Ticket paid successfully. Amount charged: 15.00 EGP."
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — ticket does not belong to you
 *       404:
 *         description: Ticket not found
 *       409:
 *         description: Ticket is not UNPAID
 */
router.patch(
  '/:id/pay',
  authenticate,
  celebrate(payTicketSchema),
  payTicket
);

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Manually update a ticket (SUPER_ADMIN, FINANCE_ADMIN)
 *     description: >
 *       Admin override for correcting ticket status or amount.
 *       Use cases include marking a ticket as DISPUTED, CANCELLED,
 *       or correcting a billing error.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTicketBody'
 *           example:
 *             status: "CANCELLED"
 *     responses:
 *       200:
 *         description: Ticket updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Ticket updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/TicketResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or FINANCE_ADMIN only
 *       404:
 *         description: Ticket not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN'),
  celebrate(updateTicketSchema),
  updateTicket
);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete a ticket (SUPER_ADMIN, FINANCE_ADMIN — API only)
 *     description: >
 *       Permanently deletes a ticket. Intended for data correction only.
 *       This endpoint is intentionally not exposed in the admin dashboard UI.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Ticket deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:    { type: string, example: success }
 *                 message:   { type: string, example: Ticket deleted successfully. }
 *                 ticket_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or FINANCE_ADMIN only
 *       404:
 *         description: Ticket not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN'),
  celebrate(idParamSchema),
  deleteTicket
);

module.exports = router;