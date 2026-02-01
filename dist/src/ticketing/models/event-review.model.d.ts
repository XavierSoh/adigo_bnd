/**
 * Event Review Model
 *
 * Represents user reviews and ratings for events
 */
export interface EventReview {
    id?: number;
    event_id: number;
    customer_id: number;
    ticket_purchase_id?: number;
    rating: number;
    title?: string;
    comment?: string;
    is_verified_attendee?: boolean;
    images?: string[];
    organizer_response?: string;
    organizer_response_date?: Date;
    is_approved?: boolean;
    is_flagged?: boolean;
    flag_reason?: string;
    flagged_by?: number;
    flagged_at?: Date;
    helpful_count?: number;
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
}
export interface EventReviewCreateDto {
    event_id: number;
    customer_id: number;
    ticket_purchase_id?: number;
    rating: number;
    title?: string;
    comment?: string;
}
export interface EventReviewUpdateDto {
    rating?: number;
    title?: string;
    comment?: string;
}
