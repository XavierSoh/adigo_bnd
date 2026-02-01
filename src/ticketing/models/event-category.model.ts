/**
 * Event Category Model
 *
 * Represents different categories of events (concerts, theater, sports, etc.)
 */

export interface EventCategory {
    id?: number;
    name: string;
    name_en: string;
    name_fr: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    icon?: string;                    // Icon name for UI
    color?: string;                   // Hex color code
    is_active?: boolean;
    display_order?: number;
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}

export interface EventCategoryCreateDto {
    name: string;
    name_en: string;
    name_fr: string;
    description_en?: string;
    description_fr?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
    display_order?: number;
    created_by?: number;
}

export interface EventCategoryUpdateDto {
    name?: string;
    name_en?: string;
    name_fr?: string;
    description_en?: string;
    description_fr?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
    display_order?: number;
}
