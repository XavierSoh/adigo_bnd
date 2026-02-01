export interface EventReview {
    id: number;
    event_id: number;
    customer_id: number;
    rating: number;
    comment?: string;
    is_approved: boolean;
    created_at: Date;
    updated_at?: Date;
    customer_name?: string;
}
export interface ReviewCreateDto {
    event_id: number;
    customer_id: number;
    rating: number;
    comment?: string;
}
export interface ReviewUpdateDto {
    rating?: number;
    comment?: string;
}
