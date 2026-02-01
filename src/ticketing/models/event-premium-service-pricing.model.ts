/**
 * Event Premium Service Pricing Model
 *
 * Configurable pricing for all ADIGO premium services
 */

export type ServiceType =
    | 'design'
    | 'boost_homepage'
    | 'boost_category'
    | 'field_service'
    | 'marketing'
    | 'sms';

export interface EventPremiumServicePricing {
    id?: number;
    service_type: ServiceType;
    service_subtype?: string;              // e.g., 'small', 'medium', '7days', 'agent_per_day'

    // Pricing
    base_price: number;
    currency?: string;                     // Default: 'FCFA'

    // Conditions (for tiered pricing)
    min_capacity?: number;                 // Minimum event capacity
    max_capacity?: number;                 // Maximum event capacity
    duration_days?: number;                // Duration (for boost services)

    // Description
    name_en: string;
    name_fr: string;
    description_en?: string;
    description_fr?: string;

    // Status
    is_active?: boolean;

    // Timestamps
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
}

export interface EventPremiumServicePricingCreateDto {
    service_type: ServiceType;
    service_subtype?: string;
    base_price: number;
    min_capacity?: number;
    max_capacity?: number;
    duration_days?: number;
    name_en: string;
    name_fr: string;
    description_en?: string;
    description_fr?: string;
}

export interface EventPremiumServicePricingUpdateDto {
    base_price?: number;
    min_capacity?: number;
    max_capacity?: number;
    duration_days?: number;
    name_en?: string;
    name_fr?: string;
    description_en?: string;
    description_fr?: string;
    is_active?: boolean;
}

export interface PricingSearchParams {
    service_type?: ServiceType;
    is_active?: boolean;
}
