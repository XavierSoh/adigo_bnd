/**
 * Event Organizer Model
 *
 * Represents event organizers with verification and payment information
 */
export type OrganizationType = 'company' | 'association' | 'individual';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type MobileMoneyProvider = 'mtn' | 'orange';
export interface EventOrganizer {
    id?: number;
    customer_id?: number;
    organization_name: string;
    organization_type?: OrganizationType;
    email: string;
    phone: string;
    address?: string;
    city?: string;
    country?: string;
    rccm_number?: string;
    rccm_document?: string;
    id_card_type?: string;
    id_card_number?: string;
    id_card_document?: string;
    proof_of_venue?: string;
    logo?: string;
    banner_image?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    bank_account_name?: string;
    bank_account_number?: string;
    bank_name?: string;
    mobile_money_number?: string;
    mobile_money_provider?: MobileMoneyProvider;
    verification_status?: VerificationStatus;
    verification_date?: Date;
    verified_by?: number;
    rejection_reason?: string;
    is_verified?: boolean;
    rating?: number;
    total_events?: number;
    total_tickets_sold?: number;
    total_revenue?: number;
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}
export interface EventOrganizerCreateDto {
    customer_id: number;
    organization_name: string;
    organization_type?: OrganizationType;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    rccm_number?: string;
    tax_id?: string;
    business_address?: string;
    business_phone?: string;
    business_email?: string;
    website?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    logo?: string;
    banner_image?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    orange_money_number?: string;
    orange_money_name?: string;
    mtn_mobile_money_number?: string;
    mtn_mobile_money_name?: string;
    id_card_front?: string;
    id_card_back?: string;
    rccm_document?: string;
    business_license?: string;
    created_by?: number;
}
export interface EventOrganizerUpdateDto {
    organization_name?: string;
    organization_type?: OrganizationType;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    rccm_number?: string;
    tax_id?: string;
    business_address?: string;
    business_phone?: string;
    business_email?: string;
    website?: string;
    description?: string;
    description_en?: string;
    description_fr?: string;
    logo?: string;
    banner_image?: string;
    bank_name?: string;
    bank_account_number?: string;
    bank_account_name?: string;
    orange_money_number?: string;
    orange_money_name?: string;
    mtn_mobile_money_number?: string;
    mtn_mobile_money_name?: string;
    mobile_money_number?: string;
    mobile_money_provider?: MobileMoneyProvider;
    rccm_document?: string;
    id_card_type?: string;
    id_card_number?: string;
    id_card_document?: string;
    proof_of_venue?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
}
export interface EventOrganizerVerificationDto {
    verification_status: VerificationStatus;
    verified_by: number;
    rejection_reason?: string;
}
