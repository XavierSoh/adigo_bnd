/**
 * Marketing Service
 *
 * Services marketing pour événements:
 * - Affiches: simple (10k) / premium (20k) FCFA
 * - Campagnes Ads: minimum 10k FCFA
 */
export type PosterType = 'simple' | 'premium';
export type AdsPlatform = 'facebook' | 'instagram' | 'both';
export interface MarketingConfig {
    poster?: {
        type: PosterType;
    };
    ads?: {
        platform: AdsPlatform;
        budget: number;
    };
}
export interface MarketingPricing {
    poster_cost: number;
    ads_management_cost: number;
    ads_budget: number;
    total_cost: number;
    breakdown: {
        poster_type?: PosterType;
        poster_price?: number;
        ads_platform?: AdsPlatform;
        ads_management_fee: number;
        ads_budget: number;
    };
}
export declare class MarketingService {
    private static readonly POSTER_SIMPLE_PRICE;
    private static readonly POSTER_PREMIUM_PRICE;
    private static readonly ADS_MANAGEMENT_FEE;
    private static readonly MIN_ADS_BUDGET;
    /**
     * Calculate marketing service cost
     */
    static calculateCost(config: MarketingConfig): MarketingPricing;
    /**
     * Get pricing options
     */
    static getPricingOptions(): {
        poster_simple: number;
        poster_premium: number;
        ads_management_fee: number;
    };
    /**
     * Validate configuration
     */
    static validateConfig(config: MarketingConfig): {
        valid: boolean;
        errors?: string[];
    };
}
