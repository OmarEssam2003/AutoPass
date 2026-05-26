const ticketService = require('./ticket.service');

// ── GET /api/tickets ──────────────────────────────────────────────────────────
const getAllTickets = async (req, res, next) => {
  try {
    const {
      page, limit, status, charged_user_id,
      vehicle_id, charged_as, from, to,
    } = req.query;

    const result = await ticketService.getAllTickets(
      {
        page:            page   ? parseInt(page, 10)  : 1,
        limit:           limit  ? parseInt(limit, 10) : 20,
        status:          status          || undefined,
        charged_user_id: charged_user_id || undefined,
        vehicle_id:      vehicle_id      || undefined,
        charged_as:      charged_as      || undefined,
        from:            from            || undefined,
        to:              to              || undefined,
      },
      req.user
    );

    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/tickets/:id ──────────────────────────────────────────────────────
const getTicketById = async (req, res, next) => {
  try {
    const ticket = await ticketService.getTicketById(req.params.id, req.user);
    return res.status(200).json({ status: 'success', data: ticket });
  } catch (err) {
    next(err);
  }
};

// ── PATCH /api/tickets/:id/pay ────────────────────────────────────────────────
const payTicket = async (req, res, next) => {
  try {
    const result = await ticketService.payTicket(req.params.id, req.user.id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/tickets/:id ──────────────────────────────────────────────────────
const updateTicket = async (req, res, next) => {
  try {
    const ticket = await ticketService.updateTicket(req.params.id, req.body);
    return res.status(200).json({
      status:  'success',
      message: 'Ticket updated successfully.',
      data:    ticket,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /api/tickets/:id ───────────────────────────────────────────────────
const deleteTicket = async (req, res, next) => {
  try {
    const result = await ticketService.deleteTicket(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllTickets,
  getTicketById,
  payTicket,
  updateTicket,
  deleteTicket,
};