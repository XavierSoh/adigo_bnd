/**
 * Visibility Boost Service
 *
 * Handles event visibility boost options:
 * 1. Homepage Featured
 *    - 7 days: 5,000 FCFA
 *    - 14 days: 8,000 FCFA
 *    - 30 days: 15,000 FCFA
 *
 * 2. Category Priority
 *    - 7 days: 3,000 FCFA
 *    - 14 days: 6,000 FCFA
 *    - 30 days: 12,000 FCFA
 */
export type BoostType = 'homepage' | 'category' | 'both';
export type BoostDuration = 7 | 14 | 30;
export interface BoostPricing {
    type: BoostType;
    duration: BoostDuration;
    price: number;
    name_en: string;
    name_fr: string;
    description_en: string;
    description_fr: string;
}
export interface BoostConfiguration {
    homepage: boolean;
    category: boolean;
    duration_days: BoostDuration;
    total_cost: number;
    start_date?: Date;
    end_date?: Date;
}
export declare class VisibilityBoostService {
    /**
     * Get boost pricing for a specific type and duration
     */
    static getBoostPricing(type: 'homepage' | 'category', duration: BoostDuration): Promise<BoostPricing | null>;
    /**
     * Calculate total cost for boost configuration
     */
    static calculateBoostCost(homepage: boolean, category: boolean, duration: BoostDuration): Promise<number>;
    /**
     * Get all available boost options
     */
    static getAllBoostOptions(): Promise<{
        homepage: BoostPricing[];
        category: BoostPricing[];
    }>;
    /**
     * Apply boost to an event
     */
    static applyBoost(eventId: number, config: BoostConfiguration): Promise<boolean>;
    /**
     * Check if event boost has expired
     */
    static checkAndExpireBoosts(): Promise<number>;
    /**
     * Get active boosted events
     */
    static getActiveBoostedEvents(): Promise<any[]>;
}
