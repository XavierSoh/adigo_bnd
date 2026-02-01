export type OrganizerType = 'individual' | 'company' | 'association';

export interface EventOrganizer {
    id: number;
    customer_id: number;
    name: string;
    type: OrganizerType;
    phone: string;
    email: string;
    logo?: string;
    description?: string;
    is_verified: boolean;
    verified_at?: Date;
    verified_by?: number;
    total_events: number;
    total_sales: number;
    created_at: Date;
    updated_at?: Date;
}

export interface OrganizerCreateDto {
    customer_id: number;
    name: string;
    type?: OrganizerType;
    phone: string;
    email: string;
    logo?: string;
    description?: string;
}

export interface OrganizerUpdateDto {
    name?: string;
    type?: OrganizerType;
    phone?: string;
    email?: string;
    logo?: string;
    description?: string;
}
