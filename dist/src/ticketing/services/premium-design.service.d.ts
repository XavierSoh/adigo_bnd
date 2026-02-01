/**
 * Premium Design Service
 *
 * Handles pricing and management of premium ticket design services
 * Based on ADIGO TICKETS specification:
 * - Small events (≤200): 15,000 FCFA
 * - Medium (201-1000): 25,000 FCFA
 * - Large (1001-5000): 40,000 FCFA
 * - Extra Large (>5000): 60,000 FCFA
 */
export interface DesignPricing {
    tier: 'small' | 'medium' | 'large' | 'xlarge';
    capacity: number;
    price: number;
    name_en: string;
    name_fr: string;
    description_en: string;
    description_fr: string;
}
export declare class PremiumDesignService {
    /**
     * Calculate premium design price based on event capacity
     *
     * @param totalTickets - Total number of tickets for the event
     * @returns Pricing information
     */
    static calculateDesignPrice(totalTickets: number): Promise<DesignPricing | null>;
    /**
     * Get all design pricing tiers
     */
    static getAllDesignPricing(): Promise<DesignPricing[]>;
    /**
     * Mark design as paid for an event
     */
    static markDesignAsPaid(eventId: number, amount: number): Promise<boolean>;
    /**
     * Check if event has paid for premium design
     */
    static hasEventPaidForDesign(eventId: number): Promise<boolean>;
    /**
     * Validate if design payment is required before publishing
     */
    static validateDesignRequirement(eventId: number): Promise<{
        required: boolean;
        paid: boolean;
        amount?: number;
        canPublish: boolean;
        message?: string;
    }>;
}
