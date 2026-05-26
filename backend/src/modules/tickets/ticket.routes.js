const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  getAllTickets,
  getTicketById,
  updateTicket,
  deleteTicket,
} = require('./ticket.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole, requireUser } = require('../../middlewares/rbac.middleware');
const {
  listTicketsSchema,
  updateTicketSchema,
  idParamSchema,
} = require('./ticket.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  GET    /tickets       → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  GET    /tickets/:id   → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  PUT    /tickets/:id   → SUPER_ADMIN only
//  DELETE /tickets/:id   → SUPER_ADMIN only
//
//  No POST — tickets are auto-created by the detection pipeline.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /tickets/my:
 *   get:
 *     summary: Get my tickets (User — mobile app)
 *     description: Returns all tickets assigned to the authenticated user, newest first.
 *     tags: [Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [UNPAID, PAID, DISPUTED, CANCELLED] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: User's tickets
 */
router.get(
  '/my',
  authenticate,
  requireUser,
  async (req, res, next) => {
    try {
      const ticketService = require('./ticket.service');
      const { page, limit, status } = req.query;
      const result = await ticketService.getAllTickets({
        page:            page   ? parseInt(page, 10)  : 1,
        limit:           limit  ? parseInt(limit, 10) : 20,
        charged_user_id: req.user.id,
        status:          status || undefined,
      });
      return res.status(200).json({ status: 'success', ...result });
    } catch (err) { next(err); }
  }
);

/**
 * @swagger
 * /tickets:
 *   get:
 *     summary: List tickets (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: >
 *       Returns tickets ordered newest first.
 *       `vehicle_id` and `plate_number` are mutually exclusive — `vehicle_id` takes priority if both sent.
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
 *         name: vehicle_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: plate_number
 *         schema: { type: string, example: "ABC 1234" }
 *         description: Ignored if vehicle_id is also provided
 *       - in: query
 *         name: charged_user_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [UNPAID, PAID, DISPUTED, CANCELLED] }
 *       - in: query
 *         name: charged_as
 *         schema: { type: string, enum: [OWNER, RENTER, UNASSIGNED] }
 *       - in: query
 *         name: zone_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: gate_id
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time, example: "2026-01-01T00:00:00Z" }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time, example: "2026-12-31T23:59:59Z" }
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
 *                   items: { $ref: '#/components/schemas/TicketResponse' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listTicketsSchema),
  getAllTickets
);

/**
 * @swagger
 * /tickets/{id}:
 *   get:
 *     summary: Get a ticket by ID (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: >
 *       Returns full ticket detail including vehicle, charged user,
 *       gate, zone, and pricing rule info.
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
 *                 data:   { $ref: '#/components/schemas/TicketResponse' }
 *       404:
 *         description: Ticket not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getTicketById
);

/**
 * @swagger
 * /tickets/{id}:
 *   put:
 *     summary: Update a ticket (SUPER_ADMIN only)
 *     description: >
 *       Manual admin override for correcting ticket data.
 *       Updatable fields: `status`, `price`, `charged_user_id`, `charged_as`.
 *
 *       **Business rules:**
 *       - Cannot change status of a **PAID** ticket — issue a refund via the payments module instead.
 *       - Cannot modify a **CANCELLED** ticket in any way.
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
 *           examples:
 *             dispute:
 *               summary: Mark as disputed
 *               value:
 *                 status: "DISPUTED"
 *             cancel:
 *               summary: Cancel ticket
 *               value:
 *                 status: "CANCELLED"
 *             correct_price:
 *               summary: Correct price
 *               value:
 *                 price: 12.50
 *             reassign:
 *               summary: Reassign charge to owner
 *               value:
 *                 charged_as: "OWNER"
 *                 charged_user_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
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
 *                 data:    { $ref: '#/components/schemas/TicketResponse' }
 *       409:
 *         description: Cannot modify a PAID or CANCELLED ticket
 *       404:
 *         description: Ticket not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(updateTicketSchema),
  updateTicket
);

/**
 * @swagger
 * /tickets/{id}:
 *   delete:
 *     summary: Delete a ticket (SUPER_ADMIN only)
 *     description: >
 *       Permanently deletes a ticket.
 *
 *       **Blocked if PAID** — paid tickets are financial records and cannot be deleted.
 *       Cancel the ticket instead (`status: CANCELLED` via PUT).
 *
 *       Linked `payment_tickets` rows are removed automatically via `ON DELETE CASCADE`.
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
 *       409:
 *         description: Cannot delete a PAID ticket
 *       404:
 *         description: Ticket not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN'),
  celebrate(idParamSchema),
  deleteTicket
);

module.exports = router;