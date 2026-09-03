import { EventCategory } from "./category.model";
import { EventOrganizer } from "./organizer.model";

// Matches the DB's event_status_check constraint exactly — do not add
// values here without also updating that constraint.
export type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled' | 'completed';
export type EventValidationStatus = 'pending' | 'approved' | 'rejected';

export interface Event {
    id: number;
    code: string;
    title: string;
    description?: string;
    category_id: number;
    organizer_id: number;
    cover_image?: string;
    event_date: Date;
    event_end_date?: Date;
    venue_name: string;
    venue_address?: string;
    city: string;
    maps_link?: string;
    status: EventStatus;
    is_featured: boolean;
    views_count: number;
    created_at: Date;
    updated_at?: Date;
    // Organizer-facing extras (see migrations/ticketing_admin_surface_rebuild.sql)
    registration_deadline?: Date;
    gallery_images?: string[];
    terms_and_conditions?: string;
    cancellation_policy?: string;
    refund_policy?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    // Premium/marketing flags — minimal, no billing logic behind them yet.
    has_premium_design?: boolean;
    has_boost?: boolean;
    has_featured_placement?: boolean;
    boost_start_date?: Date;
    boost_end_date?: Date;
    featured_placement_duration?: number;
    premium_design_amount?: number;
    boost_amount?: number;
    featured_placement_amount?: number;
    // Validation workflow — see EventValidationController.
    validation_status?: EventValidationStatus;
    validated_by?: number;
    validated_at?: Date;
    validation_notes?: string;
    published_at?: Date;
    cancellation_reason?: string;
    cancelled_at?: Date;
    created_by?: number;
    // Joined data
    category?: EventCategory;
    organizer?: EventOrganizer;
}

export interface EventCreateDto {
    title: string;
    description?: string;
    category_id: number;
    organizer_id: number;
    cover_image?: string;
    event_date: Date;
    event_end_date?: Date;
    venue_name: string;
    venue_address?: string;
    city: string;
    maps_link?: string;
    registration_deadline?: Date;
    gallery_images?: string[];
    terms_and_conditions?: string;
    cancellation_policy?: string;
    refund_policy?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    has_premium_design?: boolean;
    has_boost?: boolean;
    has_featured_placement?: boolean;
    boost_start_date?: Date;
    boost_end_date?: Date;
    featured_placement_duration?: number;
    premium_design_amount?: number;
    boost_amount?: number;
    featured_placement_amount?: number;
    created_by?: number;
}

export interface EventUpdateDto {
    title?: string;
    description?: string;
    category_id?: number;
    cover_image?: string;
    event_date?: Date;
    event_end_date?: Date;
    venue_name?: string;
    venue_address?: string;
    city?: string;
    maps_link?: string;
    registration_deadline?: Date;
    gallery_images?: string[];
    terms_and_conditions?: string;
    cancellation_policy?: string;
    refund_policy?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    has_premium_design?: boolean;
    has_boost?: boolean;
    has_featured_placement?: boolean;
    boost_start_date?: Date;
    boost_end_date?: Date;
    featured_placement_duration?: number;
    premium_design_amount?: number;
    boost_amount?: number;
    featured_placement_amount?: number;
}

export interface EventSearchParams {
    search?: string;
    category_id?: number;
    city?: string;
    status?: EventStatus;
    start_date?: Date;
    end_date?: Date;
    organizer_id?: number;
    is_featured?: boolean;
    limit?: number;
    offset?: number;
}
