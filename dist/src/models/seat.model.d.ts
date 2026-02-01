export interface Seat {
    id: number;
    bus_id: number;
    seat_number: string;
    seat_type: "standard" | "premium" | "extra_legroom";
    is_active: boolean;
}
