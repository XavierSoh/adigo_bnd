import { Seat } from "./seat.model";

export interface GeneratedTripSeat {
  id: number;

  generated_trip_id: number; // FK vers GeneratedTrip
  seat_id: number; // FK vers Seat

  status: "available" | "reserved" | "booked" | "blocked";

  price_adjustment: number; // DECIMAL(10,2)

  blocked_reason?: string | null;
  blocked_until?: Date | null;

  created_at: Date;
  updated_at: Date;
  seat?:Seat
}
