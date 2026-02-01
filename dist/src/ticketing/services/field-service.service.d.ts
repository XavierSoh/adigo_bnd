/**
 * Field Service
 *
 * Gestion de la validation sur le terrain
 * - Agents: 25,000 FCFA/jour
 * - Scanners: 10,000 FCFA/jour
 */
export interface FieldServiceConfig {
    event_duration_days: number;
    agents_count: number;
    scanners_count: number;
}
export interface FieldServicePricing {
    agents_cost: number;
    scanners_cost: number;
    total_cost: number;
    breakdown: {
        agent_daily_rate: number;
        scanner_daily_rate: number;
        total_days: number;
    };
}
export declare class FieldService {
    private static readonly AGENT_DAILY_RATE;
    private static readonly SCANNER_DAILY_RATE;
    /**
     * Calculate field service cost
     */
    static calculateCost(config: FieldServiceConfig): FieldServicePricing;
    /**
     * Get pricing options
     */
    static getPricingOptions(): {
        agent_daily_rate: number;
        scanner_daily_rate: number;
    };
    /**
     * Validate configuration
     */
    static validateConfig(config: FieldServiceConfig): {
        valid: boolean;
        errors?: string[];
    };
}
