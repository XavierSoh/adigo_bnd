/**
 * Event Favorite Model
 *
 * Represents user favorites/bookmarks for events
 */
export interface EventFavorite {
    id?: number;
    customer_id: number;
    event_id: number;
    created_at?: Date;
}
export interface EventFavoriteCreateDto {
    customer_id: number;
    event_id: number;
}
