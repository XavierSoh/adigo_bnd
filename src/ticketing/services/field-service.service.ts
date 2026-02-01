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

export class FieldService {

    private static readonly AGENT_DAILY_RATE = 25000; // FCFA
    private static readonly SCANNER_DAILY_RATE = 10000; // FCFA

    /**
     * Calculate field service cost
     */
    static calculateCost(config: FieldServiceConfig): FieldServicePricing {
        const agentsCost = config.agents_count *
            config.event_duration_days *
            this.AGENT_DAILY_RATE;

        const scannersCost = config.scanners_count *
            config.event_duration_days *
            this.SCANNER_DAILY_RATE;

        return {
            agents_cost: agentsCost,
            scanners_cost: scannersCost,
            total_cost: agentsCost + scannersCost,
            breakdown: {
                agent_daily_rate: this.AGENT_DAILY_RATE,
                scanner_daily_rate: this.SCANNER_DAILY_RATE,
                total_days: config.event_duration_days
            }
        };
    }

    /**
     * Get pricing options
     */
    static getPricingOptions(): {
        agent_daily_rate: number;
        scanner_daily_rate: number;
    } {
        return {
            agent_daily_rate: this.AGENT_DAILY_RATE,
            scanner_daily_rate: this.SCANNER_DAILY_RATE
        };
    }

    /**
     * Validate configuration
     */
    static validateConfig(config: FieldServiceConfig): {
        valid: boolean;
        errors?: string[];
    } {
        const errors: string[] = [];

        if (config.event_duration_days < 1) {
            errors.push('Event duration must be at least 1 day');
        }

        if (config.agents_count < 0) {
            errors.push('Agents count cannot be negative');
        }

        if (config.scanners_count < 0) {
            errors.push('Scanners count cannot be negative');
        }

        if (config.agents_count === 0 && config.scanners_count === 0) {
            errors.push('At least one agent or scanner required');
        }

        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined
        };
    }
}
