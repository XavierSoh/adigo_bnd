import { EventPremiumServicePricing, EventPremiumServicePricingCreateDto, EventPremiumServicePricingUpdateDto, PricingSearchParams, ServiceType } from '../models/event-premium-service-pricing.model';
/**
 * Event Premium Service Pricing Repository
 *
 * Manages configurable pricing for all ADIGO premium services
 */
export declare class EventPremiumServicePricingRepository {
    /**
     * Create new pricing rule
     */
    static create(data: EventPremiumServicePricingCreateDto): Promise<{
        status: boolean;
        message: string;
        body?: EventPremiumServicePricing;
        code: number;
    }>;
    /**
     * Find by ID
     */
    static findById(id: number): Promise<{
        status: boolean;
        message: string;
        body?: EventPremiumServicePricing;
        code: number;
    }>;
    /**
     * Get all pricing rules
     */
    static findAll(includeDeleted?: boolean): Promise<{
        status: boolean;
        body?: EventPremiumServicePricing[];
        code: number;
    }>;
    /**
     * Get pricing by service type
     */
    static findByServiceType(serviceType: ServiceType, isActiveOnly?: boolean): Promise<{
        status: boolean;
        body?: EventPremiumServicePricing[];
        code: number;
    }>;
    /**
     * Search pricing with filters
     */
    static search(params: PricingSearchParams): Promise<{
        status: boolean;
        body?: EventPremiumServicePricing[];
        code: number;
    }>;
    /**
     * Get design pricing for capacity
     */
    static getDesignPricingForCapacity(capacity: number): Promise<{
        status: boolean;
        message?: string;
        body?: EventPremiumServicePricing;
        code: number;
    }>;
    /**
     * Get boost pricing
     */
    static getBoostPricing(boostType: 'homepage' | 'category', durationDays: number): Promise<{
        status: boolean;
        message?: string;
        body?: EventPremiumServicePricing;
        code: number;
    }>;
    /**
     * Update pricing rule
     */
    static update(id: number, data: EventPremiumServicePricingUpdateDto): Promise<{
        status: boolean;
        message: string;
        body?: EventPremiumServicePricing;
        code: number;
    }>;
    /**
     * Toggle active status
     */
    static toggleActive(id: number): Promise<{
        status: boolean;
        message: string;
        code: number;
    }>;
    /**
     * Soft delete
     */
    static softDelete(id: number): Promise<{
        status: boolean;
        message: string;
        code: number;
    }>;
    /**
     * Restore deleted pricing
     */
    static restore(id: number): Promise<{
        status: boolean;
        message: string;
        code: number;
    }>;
    /**
     * Delete permanently
     */
    static delete(id: number): Promise<{
        status: boolean;
        message: string;
        code: number;
    }>;
}
