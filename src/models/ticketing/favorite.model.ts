import { Event } from "./event.model";

export interface EventFavorite {
    id: number;
    customer_id: number;
    event_id: number;
    created_at: Date;
    // Joined data
    event?: Event;
}
