const paymentTicketService = require('./paymentTicket.service');

// ── GET /api/payment-tickets?ticket_id=... ────────────────────────────────────
const getPaymentByTicketId = async (req, res, next) => {
  try {
    const result = await paymentTicketService.getPaymentByTicketId(req.query.ticket_id);
    return res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPaymentByTicketId };