export interface TierConfig {
    name: 'regular' | 'silver' | 'gold' | 'platinum';
    minPoints: number;
    maxPoints: number | null;
    color: string;
    icon: string;
    benefits: {
        discountPercentage: number;
        prioritySupport: boolean;
        earlyAccess: boolean;
        bonusPointsMultiplier: number;
    };
}
export declare const TIER_CONFIGS: TierConfig[];
export declare const POINTS_PER_XAF = 0.1;
export declare function getTierConfig(tierName: string): TierConfig | undefined;
export declare function calculateTierFromPoints(points: number): TierConfig;
export declare function getPointsToNextTier(currentPoints: number): {
    nextTier: TierConfig | null;
    pointsNeeded: number;
};
export declare function calculatePointsEarned(amount: number, currentTierName: string): number;
export declare function calculateTierDiscount(amount: number, tierName: string): number;
