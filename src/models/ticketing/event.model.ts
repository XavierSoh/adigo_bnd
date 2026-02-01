import { EventCategory } from "./category.model";
import { EventOrganizer } from "./organizer.model";

export type EventStatus = 'draft' | 'pending' | 'published' | 'cancelled' | 'completed';

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
