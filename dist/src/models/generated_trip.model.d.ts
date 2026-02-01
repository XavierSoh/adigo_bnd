import { BusModel } from "./bus.model";
export interface GeneratedTripModel {
    id?: number;
    trip_id: number;
    original_departure_time: Date;
    actual_departure_time: Date;
    actual_arrival_time?: Date;
    available_seats: number;
    status?: string;
    driver_id?: number;
    conductor_id?: number;
    bus_id?: number;
    notes?: string;
    created_at?: Date;
    bus?: BusModel;
}
