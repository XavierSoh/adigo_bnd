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
    ticket_reference?: string;
    event_id: number;
    ticket_type_id: number;
    customer_id: number;
    unit_price: number;
    quantity: number;
    subtotal?: number;
    discount_amount?: number;
    total_price: number;
    final_price: number;
    currency?: string;
    payment_method: PaymentMethod;
    payment_status?: PaymentStatus;
    payment_reference?: string;
    payment_date?: Date;
    paid_amount?: number;
    wallet_transaction_id?: number;
    status?: TicketPurchaseStatus;
    qr_code_data?: string;
    qr_code_image?: string;
    is_validated?: boolean;
    validated_at?: Date;
    validated_by?: number;
    validation_method?: ValidationMethod;
    attendee_name?: string;
    attendee_first_name?: string;
    attendee_last_name?: string;
    attendee_email?: string;
    attendee_phone?: string;
    attendee_id_number?: string;
    group_id?: string;
    is_group_leader?: boolean;
    refund_amount?: number;
    refund_reason?: string;
    refund_date?: Date;
    refund_processed_by?: number;
    purchase_date?: Date;
    confirmation_date?: Date;
    cancellation_date?: Date;
    cancellation_reason?: string;
    expiry_date?: Date;
    purchase_source?: PurchaseSource;
    user_agent?: string;
    ip_address?: string;
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
    final_price?: number;
    payment_method: PaymentMethod;
    payment_reference?: string;
    attendee_name?: string;
    attendee_first_name?: string;
    attendee_last_name?: string;
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
