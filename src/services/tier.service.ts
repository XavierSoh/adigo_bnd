// Migrated to Prisma's native model API (prisma.customer.*) — see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 4).
import prismaDb from '../config/prismaClient';
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
            return await prismaDb.$transaction(async (tx) => {
                // Get current customer data. Original used `pgOne` here,
                // which THROWS on 0 rows (bad customer id) — reproduced
                // exactly: findFirst + an explicit throw on null, falling
                // to the outer catch → {success: false, pointsAdded: 0}.
                const customer = await tx.customer.findUnique({
                    where: { id: customerId },
                    select: { id: true, loyalty_points: true, customer_tier: true },
                });
                if (!customer) {
                    throw new Error(`Customer ${customerId} not found`);
                }

                const currentPoints = customer.loyalty_points || 0;
                const currentTier = customer.customer_tier || 'regular';

                // Calculate points earned based on current tier's multiplier
                const pointsEarned = calculatePointsEarned(amount, currentTier);
                const newPoints = currentPoints + pointsEarned;

                // Calculate new tier based on total points
                const newTierConfig = calculateTierFromPoints(newPoints);
                const tierUpgraded = newTierConfig.name !== currentTier;

                // Update customer
                await tx.customer.update({
                    where: { id: customerId },
                    data: { loyalty_points: newPoints, customer_tier: newTierConfig.name, updated_at: new Date() },
                });

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
            const customer = await prismaDb.customer.findUnique({
                where: { id: customerId },
                select: { id: true, loyalty_points: true, customer_tier: true },
            });
            if (!customer) {
                throw new Error(`Customer ${customerId} not found`);
            }

            const currentPoints = customer.loyalty_points || 0;
            const correctTier = calculateTierFromPoints(currentPoints);

            if (correctTier.name !== customer.customer_tier) {
                await prismaDb.customer.update({
                    where: { id: customerId },
                    data: { customer_tier: correctTier.name, updated_at: new Date() },
                });

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
