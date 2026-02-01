"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TierService = void 0;
const pgdb_1 = __importDefault(require("../config/pgdb"));
const table_names_1 = require("../utils/table_names");
const tier_config_1 = require("../config/tier.config");
class TierService {
    /**
     * Add loyalty points to a customer and update their tier if needed
     */
    static async addLoyaltyPoints(customerId, amount, description) {
        try {
            return await pgdb_1.default.tx(async (t) => {
                // Get current customer data
                const customer = await t.one(`SELECT id, loyalty_points, customer_tier FROM ${table_names_1.kCustomer} WHERE id = $1`, [customerId]);
                const currentPoints = customer.loyalty_points || 0;
                const currentTier = customer.customer_tier || 'regular';
                // Calculate points earned based on current tier's multiplier
                const pointsEarned = (0, tier_config_1.calculatePointsEarned)(amount, currentTier);
                const newPoints = currentPoints + pointsEarned;
                // Calculate new tier based on total points
                const newTierConfig = (0, tier_config_1.calculateTierFromPoints)(newPoints);
                const tierUpgraded = newTierConfig.name !== currentTier;
                // Update customer
                await t.none(`UPDATE ${table_names_1.kCustomer}
                     SET loyalty_points = $1,
                         customer_tier = $2,
                         updated_at = NOW()
                     WHERE id = $3`, [newPoints, newTierConfig.name, customerId]);
                console.log(`✨ Loyalty points updated for customer ${customerId}:`);
                console.log(`   Points: ${currentPoints} → ${newPoints} (+${pointsEarned})`);
                console.log(`   Tier: ${currentTier} → ${newTierConfig.name}${tierUpgraded ? ' 🎉 UPGRADED!' : ''}`);
                console.log(`   Reason: ${description}`);
                return {
                    success: true,
                    pointsAdded: pointsEarned,
                    newTier: newTierConfig.name,
                    tierUpgraded
                };
            });
        }
        catch (error) {
            console.error('❌ Error adding loyalty points:', error);
            return { success: false, pointsAdded: 0 };
        }
    }
    /**
     * Recalculate tier for a customer based on their current points
     */
    static async recalculateTier(customerId) {
        try {
            const customer = await pgdb_1.default.one(`SELECT id, loyalty_points, customer_tier FROM ${table_names_1.kCustomer} WHERE id = $1`, [customerId]);
            const currentPoints = customer.loyalty_points || 0;
            const correctTier = (0, tier_config_1.calculateTierFromPoints)(currentPoints);
            if (correctTier.name !== customer.customer_tier) {
                await pgdb_1.default.none(`UPDATE ${table_names_1.kCustomer} SET customer_tier = $1, updated_at = NOW() WHERE id = $2`, [correctTier.name, customerId]);
                console.log(`🔄 Tier recalculated for customer ${customerId}: ${customer.customer_tier} → ${correctTier.name}`);
            }
            return { success: true, tier: correctTier.name };
        }
        catch (error) {
            console.error('❌ Error recalculating tier:', error);
            return { success: false };
        }
    }
    /**
     * Get tier configuration endpoint (for mobile app)
     */
    static getTierConfigs() {
        return tier_config_1.TIER_CONFIGS;
    }
}
exports.TierService = TierService;
