/**
 * Event Model
 *
 * Represents an event with all details, tickets, and validation status
 */

export type EventStatus = 'draft' | 'pending_validation' | 'published' | 'cancelled' | 'completed' | 'postponed';
export type ValidationStatus = 'pending' | 'approved' | 'rejected';

export interface Event {
    id?: number;
    event_code?: string;               // e.g., 'EVT-2025-001234'

    // Basic Information
    title: string;
    title_en?: string;
    title_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    short_description?: string;

    // Relationships
    category_id: number;
    organizer_id: number;

    // Event Details
    event_date: Date | string;
    event_end_date?: Date | string;
    doors_open_time?: string;          // TIME format (HH:MM)
    duration_minutes?: number;

    // Venue Information
    venue_name: string;
    venue_address: string;
    venue_city: string;
    venue_country?: string;
    venue_capacity?: number;
    google_maps_url?: string;
    latitude?: number;
    longitude?: number;

    // Media
    poster_image?: string;
    banner_image?: string;
    gallery_images?: string[];
    video_url?: string;

    // Ticket Information
    total_tickets: number;
    available_tickets?: number;
    sold_tickets?: number;
    min_price: number;
    max_price: number;
    currency?: string;

    // Rules & Policies
    max_tickets_per_customer?: number;
    refund_policy?: string;
    refund_policy_en?: string;
    refund_policy_fr?: string;
    refund_deadline_hours?: number;
    cancellation_policy?: string;
    cancellation_policy_en?: string;
    cancellation_policy_fr?: string;
    terms_and_conditions?: string;
    terms_and_conditions_en?: string;
    terms_and_conditions_fr?: string;

    // Status & Validation
    status?: EventStatus;
    validation_status?: ValidationStatus;
    validation_date?: Date;
    validated_by?: number;
    rejection_reason?: string;

    // Premium Services
    has_premium_design?: boolean;
    premium_design_paid?: boolean;
    premium_design_amount?: number;
    boost_visibility?: boolean;
    boost_duration_days?: number;
    boost_amount?: number;
    field_service?: boolean;
    field_service_agents?: number;
    field_service_scanners?: number;
    field_service_amount?: number;
    field_service_scanner_amount?: number;

    // Marketing Services
    has_marketing_service?: boolean;       // Simplified flag for frontend compatibility
    marketing_poster_basic?: boolean;
    marketing_poster_premium?: boolean;
    marketing_poster_amount?: number;
    marketing_ads_enabled?: boolean;
    marketing_ads_budget?: number;
    marketing_ads_platform?: string;       // 'facebook', 'instagram', 'both'

    // SMS Notifications
    sms_notifications_enabled?: boolean;
    sms_count?: number;
    sms_cost_total?: number;

    // Featured Placement (separate from general boost)
    featured_placement_type?: string;      // 'homepage', 'category', 'both'
    featured_placement_amount?: number;

    // Visibility
    is_featured?: boolean;
    featured_start_date?: Date;
    featured_end_date?: Date;
    is_active?: boolean;
    views_count?: number;
    favorites_count?: number;

    // Metadata
    tags?: string[];
    age_restriction?: number;
    dress_code?: string;
    language?: string;
    accessibility_features?: string[];

    // Statistics
    rating?: number;
    total_reviews?: number;

    // Timestamps
    published_at?: Date;
    cancelled_at?: Date;
    completed_at?: Date;
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}

export interface EventCreateDto {
    title: string;
    title_en?: string;
    title_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    short_description?: string;
    category_id: number;
    organizer_id: number;
    event_date: Date | string;
    event_end_date?: Date | string;
    registration_deadline?: Date | string;
    doors_open_time?: string;
    duration_minutes?: number;
    venue_name: string;
    venue_address: string;
    venue_city?: string;
    city?: string;
    venue_map_link?: string;
    venue_country?: string;
    venue_capacity?: number;
    google_maps_url?: string;
    latitude?: number;
    longitude?: number;
    cover_image?: string;
    gallery_images?: string[];
    total_tickets: number;
    ticket_price?: number;
    min_price?: number;
    max_price?: number;
    currency?: string;
    early_bird_price?: number;
    early_bird_deadline?: Date | string;
    min_ticket_per_order?: number;
    max_ticket_per_order?: number;
    max_tickets_per_customer?: number;
    refund_policy?: string;
    refund_policy_en?: string;
    refund_policy_fr?: string;
    refund_deadline_hours?: number;
    cancellation_policy?: string;
    cancellation_policy_en?: string;
    cancellation_policy_fr?: string;
    terms_and_conditions?: string;
    terms_and_conditions_en?: string;
    terms_and_conditions_fr?: string;
    has_premium_design?: boolean;
    has_boost?: boolean;
    has_featured_placement?: boolean;
    boost_start_date?: Date | string;
    boost_end_date?: Date | string;
    featured_placement_duration?: number;
    premium_design_amount?: number;
    boost_amount?: number;
    featured_placement_amount?: number;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    tags?: string[];
    age_restriction?: number;
    dress_code?: string;
    language?: string;
    created_by?: number;
}

export interface EventUpdateDto {
    title?: string;
    title_en?: string;
    title_fr?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    short_description?: string;
    category_id?: number;
    event_date?: Date | string;
    event_end_date?: Date | string;
    registration_deadline?: Date | string;
    doors_open_time?: string;
    duration_minutes?: number;
    venue_name?: string;
    venue_address?: string;
    venue_city?: string;
    city?: string;
    venue_map_link?: string;
    venue_country?: string;
    venue_capacity?: number;
    google_maps_url?: string;
    latitude?: number;
    longitude?: number;
    poster_image?: string;
    banner_image?: string;
    cover_image?: string;
    gallery_images?: string[];
    video_url?: string;
    total_tickets?: number;
    ticket_price?: number;
    early_bird_price?: number;
    early_bird_deadline?: Date | string;
    min_ticket_per_order?: number;
    max_ticket_per_order?: number;
    max_tickets_per_customer?: number;
    refund_policy?: string;
    refund_policy_en?: string;
    refund_policy_fr?: string;
    refund_deadline_hours?: number;
    cancellation_policy?: string;
    cancellation_policy_en?: string;
    cancellation_policy_fr?: string;
    terms_and_conditions?: string;
    terms_and_conditions_en?: string;
    terms_and_conditions_fr?: string;
    contact_name?: string;
    contact_phone?: string;
    contact_email?: string;
    tags?: string[];
    age_restriction?: number;
    dress_code?: string;
    language?: string;
    accessibility_features?: string[];
}

export interface EventPublishDto {
    has_premium_design?: boolean;
    premium_design_amount?: number;
    has_boost?: boolean;
    boost_visibility?: boolean;
    boost_duration_days?: number;
    boost_amount?: number;
    boost_start_date?: Date | string;
    boost_end_date?: Date | string;
    has_featured_placement?: boolean;
    featured_placement_duration?: number;
    featured_placement_amount?: number;
    field_service?: boolean;
    field_service_agents?: number;
    field_service_amount?: number;
}

export interface EventValidationDto {
    validation_status: ValidationStatus;
    validated_by: number;
    rejection_reason?: string;
}

export interface EventSearchParams {
    // camelCase (used in controller)
    searchTerm?: string;
    categoryId?: number;
    startDate?: Date;
    endDate?: Date;
    minPrice?: number;
    maxPrice?: number;
    organizerId?: number;
    hasAvailableTickets?: boolean;
    isFeatured?: boolean;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';

    // snake_case (compatibility)
    category_id?: number;
    city?: string;
    date_from?: string;
    date_to?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
    is_featured?: boolean;
    status?: EventStatus;
    limit?: number;
    offset?: number;
}
