/**
 * CompanySettings Model
 * Represents Adigo company information for branding and contact details
 * This is a singleton table (only one row with id=1)
 */
export interface CompanySettingsModel {
    id?: number;
    company_name: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    logo_path?: string;
    primary_color?: string; // Hex color code (e.g., #D32F2F)
    tax_id?: string; // Numéro de contribuable
    registration_number?: string; // Numéro d'immatriculation (RC)
    business_license?: string; // Licence commerciale
    city?: string;
    country?: string;
    postal_code?: string;
    fax?: string;
    support_hours?: string; // Heures de support
    slogan?: string; // Slogan de la compagnie
    created_at?: Date;
    updated_at?: Date;
}

/**
 * DTO for updating company settings
 * All fields are optional to allow partial updates
 */
export interface UpdateCompanySettingsDTO {
    company_name?: string;
    address?: string;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    facebook?: string;
    twitter?: string;
    instagram?: string;
    logo_path?: string;
    primary_color?: string;
    tax_id?: string;
    registration_number?: string;
    business_license?: string;
    city?: string;
    country?: string;
    postal_code?: string;
    fax?: string;
    support_hours?: string;
    slogan?: string;
}
