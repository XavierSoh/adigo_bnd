"use strict";
/**
 * Marketing Service
 *
 * Services marketing pour événements:
 * - Affiches: simple (10k) / premium (20k) FCFA
 * - Campagnes Ads: minimum 10k FCFA
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingService = void 0;
class MarketingService {
    /**
     * Calculate marketing service cost
     */
    static calculateCost(config) {
        let posterCost = 0;
        let adsManagementCost = 0;
        let adsBudget = 0;
        // Poster cost
        if (config.poster) {
            posterCost = config.poster.type === 'simple'
                ? this.POSTER_SIMPLE_PRICE
                : this.POSTER_PREMIUM_PRICE;
        }
        // Ads cost (management fee + client budget)
        if (config.ads) {
            adsManagementCost = this.ADS_MANAGEMENT_FEE;
            adsBudget = config.ads.budget || 0;
        }
        return {
            poster_cost: posterCost,
            ads_management_cost: adsManagementCost,
            ads_budget: adsBudget,
            total_cost: posterCost + adsManagementCost + adsBudget,
            breakdown: {
                poster_type: config.poster?.type,
                poster_price: posterCost,
                ads_platform: config.ads?.platform,
                ads_management_fee: adsManagementCost,
                ads_budget: adsBudget
            }
        };
    }
    /**
     * Get pricing options
     */
    static getPricingOptions() {
        return {
            poster_simple: this.POSTER_SIMPLE_PRICE,
            poster_premium: this.POSTER_PREMIUM_PRICE,
            ads_management_fee: this.ADS_MANAGEMENT_FEE
        };
    }
    /**
     * Validate configuration
     */
    static validateConfig(config) {
        const errors = [];
        if (!config.poster && !config.ads) {
            errors.push('At least one marketing service required');
        }
        if (config.poster) {
            if (!['simple', 'premium'].includes(config.poster.type)) {
                errors.push('Invalid poster type. Must be "simple" or "premium"');
            }
        }
        if (config.ads) {
            if (!['facebook', 'instagram', 'both'].includes(config.ads.platform)) {
                errors.push('Invalid ads platform');
            }
            if (config.ads.budget < 0) {
                errors.push('Ads budget cannot be negative');
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}
exports.MarketingService = MarketingService;
MarketingService.POSTER_SIMPLE_PRICE = 10000; // FCFA
MarketingService.POSTER_PREMIUM_PRICE = 20000; // FCFA
MarketingService.ADS_MANAGEMENT_FEE = 10000; // FCFA minimum
MarketingService.MIN_ADS_BUDGET = 0; // Client budget, no minimum
