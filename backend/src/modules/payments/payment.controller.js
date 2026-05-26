const paymentService = require('./payment.service');

// ── POST /api/payments/pay  (user JWT) ────────────────────────────────────────
const payTicket = async (req, res, next) => {
  try {
    const result = await paymentService.payTicket(req.user.id, req.body);
    return res.status(201).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/payments/pay-all  (user JWT) ────────────────────────────────────
const payAll = async (req, res, next) => {
  try {
    const result = await paymentService.payAll(req.user.id, req.body);
    return res.status(201).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/payments/:id/refund  (SUPER_ADMIN only) ─────────────────────────
const refundPayment = async (req, res, next) => {
  try {
    const result = await paymentService.refundPayment(req.params.id);
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/payments  (admin) ────────────────────────────────────────────────
const getAllPayments = async (req, res, next) => {
  try {
    const { page, limit, user_id, status, from, to } = req.query;
    const result = await paymentService.getAllPayments({
      page:    page    ? parseInt(page, 10)  : 1,
      limit:   limit   ? parseInt(limit, 10) : 20,
      user_id: user_id || undefined,
      status:  status  || undefined,
      from:    from    || undefined,
      to:      to      || undefined,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/payments/my  (user JWT) ──────────────────────────────────────────
const getMyPayments = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await paymentService.getMyPayments(req.user.id, {
      page:  page  ? parseInt(page,  10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
};




// ── GET /api/payments/:id  (admin) ────────────────────────────────────────────
const getPaymentById = async (req, res, next) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    return res.status(200).json({ status: 'success', data: payment });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  payTicket,
  payAll,
  refundPayment,
  getAllPayments,
  getPaymentById,
  getMyPayments,   // ← ADD
};