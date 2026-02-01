import pgpDb from '../config/pgdb';
import { kCustomer } from '../utils/table_names';
import { calculateTierFromPoints, calculatePointsEarned, TIER_CONFIGS } from '../config/tier.config';

export class TierService {
    /**
     * Add loyalty points to a customer and update their tier if needed
     */
    static async addLoyaltyPoints(
        customerId: number,
        amount: number,
        description: string
    ): Promise<{ success: boolean; pointsAdded: number; newTier?: string; tierUpgraded?: boolean }> {
        try {
            return await pgpDb.tx(async (t) => {
                // Get current customer data
                const customer = await t.one(
                    `SELECT id, loyalty_points, customer_tier FROM ${kCustomer} WHERE id = $1`,
                    [customerId]
                );

                const currentPoints = customer.loyalty_points || 0;
                const currentTier = customer.customer_tier || 'regular';

                // Calculate points earned based on current tier's multiplier
                const pointsEarned = calculatePointsEarned(amount, currentTier);
                const newPoints = currentPoints + pointsEarned;

                // Calculate new tier based on total points
                const newTierConfig = calculateTierFromPoints(newPoints);
                const tierUpgraded = newTierConfig.name !== currentTier;

                // Update customer
                await t.none(
                    `UPDATE ${kCustomer}
                     SET loyalty_points = $1,
                         customer_tier = $2,
                         updated_at = NOW()
                     WHERE id = $3`,
                    [newPoints, newTierConfig.name, customerId]
                );

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
        } catch (error) {
            console.error('❌ Error adding loyalty points:', error);
            return { success: false, pointsAdded: 0 };
        }
    }

    /**
     * Recalculate tier for a customer based on their current points
     */
    static async recalculateTier(customerId: number): Promise<{ success: boolean; tier?: string }> {
        try {
            const customer = await pgpDb.one(
                `SELECT id, loyalty_points, customer_tier FROM ${kCustomer} WHERE id = $1`,
                [customerId]
            );

            const currentPoints = customer.loyalty_points || 0;
            const correctTier = calculateTierFromPoints(currentPoints);

            if (correctTier.name !== customer.customer_tier) {
                await pgpDb.none(
                    `UPDATE ${kCustomer} SET customer_tier = $1, updated_at = NOW() WHERE id = $2`,
                    [correctTier.name, customerId]
                );

                console.log(`🔄 Tier recalculated for customer ${customerId}: ${customer.customer_tier} → ${correctTier.name}`);
            }

            return { success: true, tier: correctTier.name };
        } catch (error) {
            console.error('❌ Error recalculating tier:', error);
            return { success: false };
        }
    }

    /**
     * Get tier configuration endpoint (for mobile app)
     */
    static getTierConfigs() {
        return TIER_CONFIGS;
    }
}
