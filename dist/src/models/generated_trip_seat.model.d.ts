import { Seat } from "./seat.model";
export interface GeneratedTripSeat {
    id: number;
    generated_trip_id: number;
    seat_id: number;
    status: "available" | "reserved" | "booked" | "blocked";
    price_adjustment: number;
    blocked_reason?: string | null;
    blocked_until?: Date | null;
    created_at: Date;
    updated_at: Date;
    seat?: Seat;
}
