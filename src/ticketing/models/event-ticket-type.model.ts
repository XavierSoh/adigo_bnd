/**
 * Event Ticket Type Model
 *
 * Represents different ticket types for an event (VIP, Regular, Early Bird, etc.)
 */

export type TicketTypeStatus = 'active' | 'sold_out' | 'inactive' | 'expired';

export interface EventTicketType {
    id?: number;
    event_id: number;

    // Ticket Type Information
    name: string;
    name_en?: string;
    name_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;

    // Pricing
    price: number;
    original_price?: number;           // For showing discounts
    currency?: string;

    // Availability
    quantity: number;
    available_quantity?: number;
    sold_quantity?: number;
    min_purchase?: number;
    max_purchase?: number;

    // Sale Period
    sale_start_date?: Date | string;
    sale_end_date?: Date | string;
    is_active?: boolean;

    // Benefits & Features
    benefits?: string[];               // Combined benefits (deprecated, kept for compatibility)
    benefits_en?: string[];            // Benefits in English
    benefits_fr?: string[];            // Benefits in French
    includes_items?: string[];         // Combined items (deprecated, kept for compatibility)
    includes_items_en?: string[];      // Included items in English
    includes_items_fr?: string[];      // Included items in French
    seating_section?: string;

    // Status
    status?: TicketTypeStatus;

    // Display
    display_order?: number;
    color?: string;

    // Timestamps
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
}

export interface EventTicketTypeCreateDto {
    event_id: number;
    name: string;
    name_en?: string;
    name_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    price: number;
    original_price?: number;
    quantity: number;
    min_purchase?: number;
    max_purchase?: number;
    min_per_order?: number;
    max_per_order?: number;
    sale_start_date?: Date | string;
    sale_end_date?: Date | string;
    is_active?: boolean;
    benefits?: string[];
    benefits_en?: string[];
    benefits_fr?: string[];
    includes_items?: string[];
    includes_items_en?: string[];
    includes_items_fr?: string[];
    seating_section?: string;
    display_order?: number;
    color?: string;
}

export interface EventTicketTypeUpdateDto {
    name?: string;
    name_en?: string;
    name_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    price?: number;
    original_price?: number;
    quantity?: number;
    min_purchase?: number;
    max_purchase?: number;
    min_per_order?: number;
    max_per_order?: number;
    sale_start_date?: Date | string;
    sale_end_date?: Date | string;
    is_active?: boolean;
    benefits?: string[];
    includes_items?: string[];
    seating_section?: string;
    display_order?: number;
    color?: string;
}
