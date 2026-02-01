export interface TripModel {
    id?: number;
    departure_city: string;
    arrival_city: string;
    departure_time: Date;
    arrival_time: Date;
    price: number;
    bus_id: number;
    agency_id: number;
    is_active?: boolean;
    cancellation_policy?: string;
    is_deleted?: boolean;
    recurrence_pattern?: RecurrencePatternModel;
    valid_from: Date;
    valid_until?: Date;
    created_at?: Date;
    updated_at?: Date;
    deleted_at?: Date;
    created_by?: number;
    deleted_by?: number;
}

export interface RecurrencePatternModel {
    id?: number;
    type: 'daily' | 'weekly' | 'monthly' | 'none';
    interval: number;
    days_of_week?: number[]; // 0-6, 0 = Sunday
    end_date?: Date;
    exceptions?: Date[];
}