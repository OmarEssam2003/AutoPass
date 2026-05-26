const auditLogService = require('./auditLog.service');

const getAllAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, action_type, entity_type, from, to } = req.query;
    const result = await auditLogService.getAllAuditLogs({
      page:        page        ? parseInt(page, 10)  : 1,
      limit:       limit       ? parseInt(limit, 10) : 20,
      action_type: action_type || undefined,
      entity_type: entity_type || undefined,
      from:        from        || undefined,
      to:          to          || undefined,
    });
    return res.status(200).json({ status: 'success', ...result });
  } catch (err) { next(err); }
};

module.exports = { getAllAuditLogs };
