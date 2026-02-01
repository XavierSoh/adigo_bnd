export interface AgencyModel {
    id?: number;
    name: string;
    address: string;
    cities_served: string[]; // Liste des villes
    phone: string;
    email?: string;
    logo?: string; // Chemin ou URL du logo
    opening_hours: '24/7' | 'custom';
    custom_hours?: Record<string, { open: string; close: string }>;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}