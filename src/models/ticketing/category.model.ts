export interface EventCategory {
    id: number;
    name: string;
    name_fr: string;
    name_en: string;
    icon?: string;
    color?: string;
    is_active: boolean;
    display_order: number;
    created_at: Date;
}

export interface CategoryCreateDto {
    name: string;
    name_fr: string;
    name_en: string;
    icon?: string;
    color?: string;
    display_order?: number;
}

export interface CategoryUpdateDto {
    name?: string;
    name_fr?: string;
    name_en?: string;
    icon?: string;
    color?: string;
    is_active?: boolean;
    display_order?: number;
}
