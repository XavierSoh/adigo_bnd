"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierController = void 0;
const tier_service_1 = require("../services/tier.service");
const tier_config_1 = require("../config/tier.config");
const customer_repository_1 = require("../repository/customer.repository");
class TierController {
    /**
     * Get all tier configurations
     */
    static async getTierConfigs(req, res) {
        try {
            res.status(200).json({
                status: true,
                message: 'Tier configurations retrieved',
                body: tier_config_1.TIER_CONFIGS,
                code: 200
            });
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: 'Error retrieving tier configurations',
                code: 500
            });
        }
    }
    /**
     * Get customer's current tier and progress to next tier
     */
    static async getCustomerTierProgress(req, res) {
        try {
            const customerId = parseInt(req.params.customerId);
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid customer ID',
                    code: 400
                });
                return;
            }
            // Get customer data
            const customerResult = await customer_repository_1.CustomerRepository.findById(customerId);
            if (!customerResult.status) {
                res.status(customerResult.code).json(customerResult);
                return;
            }
            const customer = customerResult.body;
            const currentPoints = customer.loyalty_points || 0;
            const currentTier = customer.customer_tier || 'regular';
            // Calculate progress to next tier
            const { nextTier, pointsNeeded } = (0, tier_config_1.getPointsToNextTier)(currentPoints);
            res.status(200).json({
                status: true,
                message: 'Customer tier progress retrieved',
                body: {
                    currentTier,
                    currentPoints,
                    nextTier: nextTier ? nextTier.name : null,
                    pointsNeeded,
                    nextTierMinPoints: nextTier ? nextTier.minPoints : null
                },
                code: 200
            });
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: 'Error retrieving customer tier progress',
                code: 500
            });
        }
    }
    /**
     * Manually recalculate customer tier (admin/debug endpoint)
     */
    static async recalculateCustomerTier(req, res) {
        try {
            const customerId = parseInt(req.params.customerId);
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid customer ID',
                    code: 400
                });
                return;
            }
            const result = await tier_service_1.TierService.recalculateTier(customerId);
            if (result.success) {
                res.status(200).json({
                    status: true,
                    message: 'Tier recalculated successfully',
                    body: { tier: result.tier },
                    code: 200
                });
            }
            else {
                res.status(500).json({
                    status: false,
                    message: 'Error recalculating tier',
                    code: 500
                });
            }
        }
        catch (error) {
            res.status(500).json({
                status: false,
                message: 'Error recalculating tier',
                code: 500
            });
        }
    }
}
exports.TierController = TierController;
