/**
 * Event Ticket Purchase Model
 *
 * Represents ticket purchases with payment and QR code information
 */

import { PaymentMethod, PaymentStatus } from './shared.types';

export type TicketPurchaseStatus = 'pending' | 'confirmed' | 'cancelled' | 'used' | 'expired' | 'refunded';
export type ValidationMethod = 'mobile_app' | 'scanner_device' | 'manual';
export type PurchaseSource = 'mobile_app' | 'web' | 'pos';

export interface EventTicketPurchase {
    id?: number;
    ticket_reference?: string;         // e.g., 'TKT-2025-001234'

    // Relationships
    event_id: number;
    ticket_type_id: number;
    customer_id: number;

    // Pricing
    unit_price: number;
    quantity: number;
    subtotal?: number;
    discount_amount?: number;
    total_price: number;
    final_price: number;              // For frontend compatibility
    currency?: string;

    // Payment Information
    payment_method: PaymentMethod;
    payment_status?: PaymentStatus;
    payment_reference?: string;
    payment_date?: Date;              // Added for frontend compatibility
    paid_amount?: number;
    wallet_transaction_id?: number;

    // Status
    status?: TicketPurchaseStatus;

    // QR Code & Validation
    qr_code_data?: string;
    qr_code_image?: string;
    is_validated?: boolean;
    validated_at?: Date;
    validated_by?: number;
    validation_method?: ValidationMethod;

    // Attendee Information
    attendee_name?: string;                // Combined name (deprecated, kept for compatibility)
    attendee_first_name?: string;          // For frontend compatibility
    attendee_last_name?: string;           // For frontend compatibility
    attendee_email?: string;
    attendee_phone?: string;
    attendee_id_number?: string;

    // Group Booking
    group_id?: string;
    is_group_leader?: boolean;

    // Refund Information
    refund_amount?: number;
    refund_reason?: string;
    refund_date?: Date;
    refund_processed_by?: number;

    // Dates
    purchase_date?: Date;
    confirmation_date?: Date;
    cancellation_date?: Date;
    cancellation_reason?: string;
    expiry_date?: Date;

    // Metadata
    purchase_source?: PurchaseSource;
    user_agent?: string;
    ip_address?: string;

    // Timestamps
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}

export interface EventTicketPurchaseCreateDto {
    event_id: number;
    ticket_type_id: number;
    customer_id: number;
    quantity: number;
    final_price?: number;              // Added for frontend compatibility
    payment_method: PaymentMethod;
    payment_reference?: string;
    attendee_name?: string;            // Kept for backward compatibility
    attendee_first_name?: string;      // Added for frontend compatibility
    attendee_last_name?: string;       // Added for frontend compatibility
    attendee_email?: string;
    attendee_phone?: string;
    group_id?: string;
    is_group_leader?: boolean;
    purchase_source?: PurchaseSource;
}

export interface EventTicketValidateDto {
    ticket_reference: string;
    validated_by: number;
    validation_method?: ValidationMethod;
}

export interface EventTicketRefundDto {
    refund_reason: string;
    refund_processed_by: number;
}
