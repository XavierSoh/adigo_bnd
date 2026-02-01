import { BoostDuration } from './visibility-boost.service';
/**
 * Premium Payment Service
 *
 * Orchestrates payment for all premium services:
 * - Mandatory: Premium Design
 * - Optional: Visibility Boost (Homepage/Category)
 * - Optional: Field Service (Agents/Scanners)
 * - Optional: Marketing (Posters/Ads/SMS)
 */
export interface PremiumServicesRequest {
    eventId: number;
    customerId: number;
    designRequired: boolean;
    boostHomepage?: boolean;
    boostCategory?: boolean;
    boostDurationDays?: BoostDuration;
    fieldServiceAgents?: number;
    fieldServiceScanners?: number;
    fieldServiceDays?: number;
    marketingPosterBasic?: boolean;
    marketingPosterPremium?: boolean;
    marketingAdsEnabled?: boolean;
    marketingAdsBudget?: number;
    smsNotifications?: number;
}
export interface PremiumServicesCostBreakdown {
    design: number;
    boostHomepage: number;
    boostCategory: number;
    fieldService: number;
    marketing: number;
    sms: number;
    total: number;
    details: {
        designTier?: string;
        boostDuration?: number;
        fieldAgents?: number;
        fieldScanners?: number;
        fieldDays?: number;
        posterType?: string;
        adsBudget?: number;
        smsCount?: number;
    };
}
export declare class PremiumPaymentService {
    /**
     * Calculate total cost for all requested premium services
     */
    static calculateTotalCost(request: PremiumServicesRequest): Promise<PremiumServicesCostBreakdown>;
    /**
     * Get service price from database
     */
    private static getServicePrice;
    /**
     * Process payment from wallet
     */
    static processWalletPayment(customerId: number, amount: number, description: string, eventId: number): Promise<{
        success: boolean;
        transactionId?: number;
        error?: string;
    }>;
    /**
     * Apply all paid premium services to event
     */
    static applyPremiumServices(request: PremiumServicesRequest, breakdown: PremiumServicesCostBreakdown): Promise<boolean>;
}
