export interface AgencyModel {
    id?: number;
    name: string;
    address: string;
    cities_served: string[]; // Liste des villes
    phone: string;
    email?: string;
    logo?: string; // Chemin ou URL du logo
    latitude?: number;
    longitude?: number;
    opening_hours: '24/7' | 'custom';
    custom_hours?: Record<string, { open: string; close: string }>;
    // Hours before departure below which a booking cancellation is late
    // (fee applies) and the percent of total_price withheld when it is —
    // 0% (full refund) is today's existing behavior for every agency that
    // hasn't configured this. See BookingRepository.cancelBatch.
    late_cancellation_grace_hours?: number;
    late_cancellation_fee_percent?: number;
    // Whether customers must pick a specific seat when booking a trip with
    // this agency — true is today's existing behavior everywhere.
    requires_seat_selection?: boolean;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}