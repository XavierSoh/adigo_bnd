export declare class TierService {
    /**
     * Add loyalty points to a customer and update their tier if needed
     */
    static addLoyaltyPoints(customerId: number, amount: number, description: string): Promise<{
        success: boolean;
        pointsAdded: number;
        newTier?: string;
        tierUpgraded?: boolean;
    }>;
    /**
     * Recalculate tier for a customer based on their current points
     */
    static recalculateTier(customerId: number): Promise<{
        success: boolean;
        tier?: string;
    }>;
    /**
     * Get tier configuration endpoint (for mobile app)
     */
    static getTierConfigs(): import("../config/tier.config").TierConfig[];
}
