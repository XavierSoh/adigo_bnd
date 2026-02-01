// ============================================
// 1. MODEL - customer.model.ts
// ============================================
export interface Customer {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    date_of_birth?: Date;
    gender?: 'male' | 'female' | 'other';
    address?: string;
    city?: string;
    id_card_number?: string;
    id_card_type?: 'cni' | 'passport' | 'driver_license';
    preferred_language?: 'fr' | 'en';
    notification_enabled?: boolean;
    preferred_seat_type?: 'window' | 'aisle';
    loyalty_points?: number;
    customer_tier?: 'regular' | 'silver' | 'gold' | 'platinum';
    account_status?: 'active' | 'suspended' | 'blocked';
    email_verified?: boolean;
    phone_verified?: boolean;
    profile_picture?: string;
    wallet_balance?: number;
    fcm_token?: string;  // Firebase Cloud Messaging token for push notifications
    default_orange_money_number?: string;  // Default Orange Money phone number for payments
    default_mtn_mobile_money_number?: string;  // Default MTN Mobile Money phone number for payments
    created_at?: Date;
    updated_at?: Date;
    last_login?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
}