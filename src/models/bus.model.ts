

export interface BusModel {
    id?: number;
    registration_number: string;
    capacity: number;
    type: 'standard' | 'VIP';
    amenities: string[]; // ['wifi', 'toilet', 'ac', ...]
    seat_layout: '2x2' | '3x2';
    has_toilet: boolean;
    is_active: boolean;
    agency_id: number;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}