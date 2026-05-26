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
//  POST   /pricing-rules       → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  GET    /pricing-rules       → All admin levels
//  GET    /pricing-rules/:id   → All admin levels
//  PUT    /pricing-rules/:id   → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
//  DELETE /pricing-rules/:id   → SUPER_ADMIN, FINANCE_ADMIN, OPERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /pricing-rules:
 *   post:
 *     summary: Create a pricing rule (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: >
 *       Creates a zone-level pricing rule for a specific vehicle type.
 *
 *       **Schema:**
 *       - `rate_per_hour` — **required** (NOT NULL in DB). Base hourly charge.
 *       - `price` — optional flat fee. If set, **overrides** rate_per_hour at billing time.
 *       - `max_daily_cap` — optional. Must be ≥ rate_per_hour. NULL = no cap.
 *       - `valid_from` — optional. Schedule a future effective date. NULL = effective immediately.
 *
 *       **Business rules:**
 *       - Only one active rule per `zone_id + vehicle_type` — deactivate existing one first (409 otherwise).
 *       - `created_by` is auto-set to the authenticated admin.
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePricingRuleBody'
 *           examples:
 *             hourly:
 *               summary: Hourly billing with daily cap
 *               value:
 *                 zone_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 vehicle_type: "Sedan"
 *                 rate_per_hour: 5.00
 *                 max_daily_cap: 40.00
 *                 price: 20.00
 *                 valid_from: 2026-02-26T19:53:58.417Z 
 *             flat_fee_override:
 *               summary: Hourly base + flat fee override (flat fee takes effect at billing)
 *               value:
 *                 zone_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 vehicle_type: "Truck"
 *                 rate_per_hour: 10.00
 *                 price: 25.00
 *             scheduled:
 *               summary: Scheduled future rule
 *               value:
 *                 zone_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 vehicle_type: "Sedan"
 *                 rate_per_hour: 7.50
 *                 max_daily_cap: 50.00
 *                 valid_from: "2026-03-01T00:00:00Z"
 *     responses:
 *       201:
 *         description: Pricing rule created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:  { type: string, example: success }
 *                 message: { type: string, example: Pricing rule created successfully. }
 *                 data:    { $ref: '#/components/schemas/PricingRuleResponse' }
 *       404:
 *         description: Zone not found
 *       409:
 *         description: Active rule already exists for this zone + vehicle_type
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(createPricingRuleSchema),
  createPricingRule
);

/**
 * @swagger
 * /pricing-rules:
 *   get:
 *     summary: List pricing rules (all admin levels)
 *     description: Returns rules ordered by zone name → vehicle type → newest first.
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
 *       - in: query
 *         name: vehicle_type
 *         schema: { type: string, example: Sedan }
 *         description: Partial match, case-insensitive
 *       - in: query
 *         name: is_active
 *         schema: { type: boolean }
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
 *                   items: { $ref: '#/components/schemas/PricingRuleResponse' }
 *                 meta: { $ref: '#/components/schemas/PaginationMeta' }
 */
router.get(
  '/',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(listPricingRulesSchema),
  getAllPricingRules
);

/**
 * @swagger
 * /pricing-rules/{id}:
 *   get:
 *     summary: Get a pricing rule by ID (all admin levels)
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Pricing rule data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:   { $ref: '#/components/schemas/PricingRuleResponse' }
 *       404:
 *         description: Pricing rule not found
 */
router.get(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'SECURITY_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  getPricingRuleById
);

/**
 * @swagger
 * /pricing-rules/{id}:
 *   put:
 *     summary: Update a pricing rule (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: >
 *       Update any pricing fields. At least one field required.
 *
 *       **Notes:**
 *       - `rate_per_hour` cannot be set to null (NOT NULL in DB).
 *       - Set `price: null` to remove the flat fee override and fall back to hourly billing.
 *       - If `rate_per_hour` changes, `max_daily_cap` is re-validated against the new rate.
 *       - Set `is_active: false` to deactivate without deleting.
 *     tags: [Pricing Rules]
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
 *             $ref: '#/components/schemas/UpdatePricingRuleBody'
 *           examples:
 *             raise_rate:
 *               summary: Raise hourly rate and cap
 *               value:
 *                 rate_per_hour: 7.50
 *                 max_daily_cap: 50.00
 *             add_flat_fee:
 *               summary: Add flat fee override
 *               value:
 *                 price: 25.00
 *             remove_flat_fee:
 *               summary: Remove flat fee — fall back to hourly
 *               value:
 *                 price: null
 *             deactivate:
 *               summary: Deactivate rule
 *               value:
 *                 is_active: false
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
 *                 data:    { $ref: '#/components/schemas/PricingRuleResponse' }
 *       400:
 *         description: max_daily_cap < rate_per_hour, or attempted to null rate_per_hour
 *       404:
 *         description: Pricing rule not found
 *       422:
 *         description: Validation error
 */
router.put(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(updatePricingRuleSchema),
  updatePricingRule
);

/**
 * @swagger
 * /pricing-rules/{id}:
 *   delete:
 *     summary: Delete a pricing rule (SUPER_ADMIN, FINANCE_ADMIN, OPERATOR)
 *     description: >
 *       Permanently removes the pricing rule. Prefer `is_active: false` via PUT to preserve history.
 *     tags: [Pricing Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
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
 *       404:
 *         description: Pricing rule not found
 */
router.delete(
  '/:id',
  authenticate,
  requireRole('SUPER_ADMIN', 'FINANCE_ADMIN', 'OPERATOR'),
  celebrate(idParamSchema),
  deletePricingRule
);

module.exports = router;