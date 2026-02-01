// ============================================
// TIER CONFIGURATION
// ============================================

export interface TierConfig {
    name: 'regular' | 'silver' | 'gold' | 'platinum';
    minPoints: number;
    maxPoints: number | null; // null means unlimited
    color: string;
    icon: string;
    benefits: {
        discountPercentage: number;
        prioritySupport: boolean;
        earlyAccess: boolean;
        bonusPointsMultiplier: number; // e.g., 1.5 means earn 50% more points
    };
}

export const TIER_CONFIGS: TierConfig[] = [
    {
        name: 'regular',
        minPoints: 0,
        maxPoints: 999,
        color: '#9E9E9E', // Grey
        icon: 'bronze',
        benefits: {
            discountPercentage: 0,
            prioritySupport: false,
            earlyAccess: false,
            bonusPointsMultiplier: 1.0
        }
    },
    {
        name: 'silver',
        minPoints: 1000,
        maxPoints: 2999,
        color: '#C0C0C0', // Silver
        icon: 'silver',
        benefits: {
            discountPercentage: 5,
            prioritySupport: false,
            earlyAccess: false,
            bonusPointsMultiplier: 1.2 // Earn 20% more points
        }
    },
    {
        name: 'gold',
        minPoints: 3000,
        maxPoints: 6999,
        color: '#FFD700', // Gold
        icon: 'gold',
        benefits: {
            discountPercentage: 10,
            prioritySupport: true,
            earlyAccess: true,
            bonusPointsMultiplier: 1.5 // Earn 50% more points
        }
    },
    {
        name: 'platinum',
        minPoints: 7000,
        maxPoints: null, // Unlimited
        color: '#E5E4E2', // Platinum
        icon: 'platinum',
        benefits: {
            discountPercentage: 15,
            prioritySupport: true,
            earlyAccess: true,
            bonusPointsMultiplier: 2.0 // Earn double points
        }
    }
];

// Points earned per XAF spent (base rate)
export const POINTS_PER_XAF = 0.1; // 1 point per 10 XAF spent
// Example: 5000 XAF booking = 500 points

// Helper function to get tier config by tier name
export function getTierConfig(tierName: string): TierConfig | undefined {
    return TIER_CONFIGS.find(t => t.name === tierName);
}

// Helper function to determine tier based on loyalty points
export function calculateTierFromPoints(points: number): TierConfig {
    for (let i = TIER_CONFIGS.length - 1; i >= 0; i--) {
        const tier = TIER_CONFIGS[i];
        if (points >= tier.minPoints) {
            return tier;
        }
    }
    return TIER_CONFIGS[0]; // Default to regular
}

// Helper function to calculate points to next tier
export function getPointsToNextTier(currentPoints: number): { nextTier: TierConfig | null; pointsNeeded: number } {
    const currentTier = calculateTierFromPoints(currentPoints);
    const currentIndex = TIER_CONFIGS.findIndex(t => t.name === currentTier.name);

    if (currentIndex === TIER_CONFIGS.length - 1) {
        // Already at highest tier
        return { nextTier: null, pointsNeeded: 0 };
    }

    const nextTier = TIER_CONFIGS[currentIndex + 1];
    const pointsNeeded = nextTier.minPoints - currentPoints;

    return { nextTier, pointsNeeded };
}

// Calculate loyalty points earned from a purchase
export function calculatePointsEarned(amount: number, currentTierName: string): number {
    const basePoints = Math.floor(amount * POINTS_PER_XAF);
    const tierConfig = getTierConfig(currentTierName);

    if (!tierConfig) {
        return basePoints;
    }

    const bonusPoints = Math.floor(basePoints * tierConfig.benefits.bonusPointsMultiplier);
    return bonusPoints;
}

// Calculate discount amount based on tier
export function calculateTierDiscount(amount: number, tierName: string): number {
    const tierConfig = getTierConfig(tierName);

    if (!tierConfig) {
        return 0;
    }

    const discountAmount = Math.floor(amount * (tierConfig.benefits.discountPercentage / 100));
    return discountAmount;
}
