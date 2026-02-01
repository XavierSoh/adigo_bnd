/**
 * Event Ticket Type Model
 *
 * Represents different ticket types for an event (VIP, Regular, Early Bird, etc.)
 */
export type TicketTypeStatus = 'active' | 'sold_out' | 'inactive' | 'expired';
export interface EventTicketType {
    id?: number;
    event_id: number;
    name: string;
    name_en?: string;
    name_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    price: number;
    original_price?: number;
    currency?: string;
    quantity: number;
    available_quantity?: number;
    sold_quantity?: number;
    min_purchase?: number;
    max_purchase?: number;
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
    status?: TicketTypeStatus;
    display_order?: number;
    color?: string;
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
