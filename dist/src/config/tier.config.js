"use strict";
// ============================================
// TIER CONFIGURATION
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.POINTS_PER_XAF = exports.TIER_CONFIGS = void 0;
exports.getTierConfig = getTierConfig;
exports.calculateTierFromPoints = calculateTierFromPoints;
exports.getPointsToNextTier = getPointsToNextTier;
exports.calculatePointsEarned = calculatePointsEarned;
exports.calculateTierDiscount = calculateTierDiscount;
exports.TIER_CONFIGS = [
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
exports.POINTS_PER_XAF = 0.1; // 1 point per 10 XAF spent
// Example: 5000 XAF booking = 500 points
// Helper function to get tier config by tier name
function getTierConfig(tierName) {
    return exports.TIER_CONFIGS.find(t => t.name === tierName);
}
// Helper function to determine tier based on loyalty points
function calculateTierFromPoints(points) {
    for (let i = exports.TIER_CONFIGS.length - 1; i >= 0; i--) {
        const tier = exports.TIER_CONFIGS[i];
        if (points >= tier.minPoints) {
            return tier;
        }
    }
    return exports.TIER_CONFIGS[0]; // Default to regular
}
// Helper function to calculate points to next tier
function getPointsToNextTier(currentPoints) {
    const currentTier = calculateTierFromPoints(currentPoints);
    const currentIndex = exports.TIER_CONFIGS.findIndex(t => t.name === currentTier.name);
    if (currentIndex === exports.TIER_CONFIGS.length - 1) {
        // Already at highest tier
        return { nextTier: null, pointsNeeded: 0 };
    }
    const nextTier = exports.TIER_CONFIGS[currentIndex + 1];
    const pointsNeeded = nextTier.minPoints - currentPoints;
    return { nextTier, pointsNeeded };
}
// Calculate loyalty points earned from a purchase
function calculatePointsEarned(amount, currentTierName) {
    const basePoints = Math.floor(amount * exports.POINTS_PER_XAF);
    const tierConfig = getTierConfig(currentTierName);
    if (!tierConfig) {
        return basePoints;
    }
    const bonusPoints = Math.floor(basePoints * tierConfig.benefits.bonusPointsMultiplier);
    return bonusPoints;
}
// Calculate discount amount based on tier
function calculateTierDiscount(amount, tierName) {
    const tierConfig = getTierConfig(tierName);
    if (!tierConfig) {
        return 0;
    }
    const discountAmount = Math.floor(amount * (tierConfig.benefits.discountPercentage / 100));
    return discountAmount;
}
