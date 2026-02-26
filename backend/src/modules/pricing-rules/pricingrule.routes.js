const express = require('express');
const { celebrate } = require('celebrate');
const router = express.Router();

const {
  createPricingRule,
  getAllPricingRules,
  getPricingRuleById,
  updatePricingRule,
  deletePricingRule,
} = require('./pricingrule.controller');

const { authenticate } = require('../../middlewares/auth.middleware');
const { requireRole }  = require('../../middlewares/rbac.middleware');
const {
  createPricingRuleSchema,
  listPricingRulesSchema,
  updatePricingRuleSchema,
  idParamSchema,
} = require('./pricingrule.validation');

// ─────────────────────────────────────────────────────────────────────────────
// WHO CAN DO WHAT:
//
//  POST   /pricing-rules      → SUPER_ADMIN, OPERATOR
//  GET    /pricing-rules      → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  GET    /pricing-rules/:id  → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  PUT    /pricing-rules/:id  → SUPER_ADMIN, OPERATOR
//  DELETE /pricing-rules/:id  → SUPER_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /pricing-rules:
 *   post:
 *     summary: Create a pricing rule (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Creates a pricing rule for a specific zone and vehicle type combination.
 *       This rule is used when calculating ticket charges for detection events.
 *
 *       **Business rules:**
 *       - Zone must exist
 *       - Only one **active** rule per zone + vehicle_type combination is allowed
 *       - `max_daily_cap` must be greater than or equal to `rate_per_hour` if provided
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePricingRuleBody'
 *           example:
 *             zone_id: "c3d4e5f6-a7b8-9012-cdef-123456789012"
 *             vehicle_type: "Sedan"
 *             rate_per_hour: 5.00
 *             max_daily_cap: 40.00
 *             is_active: true
 *     responses:
 *       201:
 *         description: Pricing rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Pricing rule created successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/PricingRuleResponse'
 *       400:
 *         description: Max daily cap is less than rate per hour
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Zone not found
 *       409:
 *         description: Active rule for this zone + vehicle type already exists
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(createPricingRuleSchema),
  createPricingRule
);

/**
 * @swagger
 * /pricing-rules:
 *   get:
 *     summary: List pricing rules (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: Returns a paginated list of pricing rules joined with zone names.
 *     tags: [Pricing Rules]
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
 *         name: zone_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by zone
 *       - in: query
 *         name: vehicle_type
 *         schema: { type: string }
 *         description: Filter by vehicle type (partial match)
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of pricing rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PricingRuleResponse'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(listPricingRulesSchema),
  getAllPricingRules
);

/**
 * @swagger
 * /pricing-rules/{id}:
 *   get:
 *     summary: Get a pricing rule by ID (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the pricing rule
 *     responses:
 *       200:
 *         description: Pricing rule data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/PricingRuleResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Pricing rule not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getPricingRuleById
);

/**
 * @swagger
 * /pricing-rules/{id}:
 *   put:
 *     summary: Update a pricing rule (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Updates any field on a pricing rule. At least one field required.
 *       To replace a rule, consider deactivating the old one (`is_active: false`)
 *       and creating a new one to preserve billing history accuracy.
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the pricing rule to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePricingRuleBody'
 *           example:
 *             rate_per_hour: 6.50
 *             max_daily_cap: 45.00
 *     responses:
 *       200:
 *         description: Pricing rule updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Pricing rule updated successfully. }
 *                 data:
 *                   $ref: '#/components/schemas/PricingRuleResponse'
 *       400:
 *         description: Max daily cap is less than rate per hour
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Pricing rule or zone not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(updatePricingRuleSchema),
  updatePricingRule
);

/**
 * @swagger
 * /pricing-rules/{id}:
 *   delete:
 *     summary: Delete a pricing rule (SUPER_ADMIN, OPERATOR)
 *     description: >
 *       Permanently deletes a pricing rule.
 *       Consider using `PUT` to set `is_active: false` instead,
 *       to preserve historical billing accuracy.
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID of the pricing rule to delete
 *     responses:
 *       200:
 *         description: Pricing rule deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Pricing rule deleted successfully. }
 *                 rule_id: { type: string, format: uuid }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden — SUPER_ADMIN or OPERATOR only
 *       404:
 *         description: Pricing rule not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deletePricingRule
);

module.exports = router;