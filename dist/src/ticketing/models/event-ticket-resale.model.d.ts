/**
 * Event Ticket Resale Model (Marketplace)
 *
 * Allows users to resell tickets with 10% ADIGO commission
 */
import { PaymentMethod, PaymentStatus, ResaleStatus } from './shared.types';
export type ResaleListingStatus = 'listed' | 'sold' | 'cancelled' | 'expired' | 'removed';
export interface EventTicketResale {
    id?: number;
    resale_code?: string;
    ticket_purchase_id: number;
    event_id: number;
    ticket_type_id: number;
    seller_id: number;
    original_price: number;
    resale_price: number;
    commission_rate?: number;
    commission_amount?: number;
    seller_receives?: number;
    buyer_id?: number;
    status?: ResaleStatus;
    payment_method?: PaymentMethod;
    payment_status?: PaymentStatus;
    payment_reference?: string;
    wallet_transaction_id?: number;
    listing_description?: string;
    reason_for_sale?: string;
    listed_at?: Date;
    sold_at?: Date;
    cancelled_at?: Date;
    cancellation_reason?: string;
    expires_at?: Date;
    created_at?: Date;
    updated_at?: Date;
    is_deleted?: boolean;
    deleted_at?: Date;
    deleted_by?: number;
    created_by?: number;
}
export interface EventTicketResaleCreateDto {
    ticket_purchase_id: number;
    event_id: number;
    ticket_type_id: number;
    seller_id: number;
    original_price: number;
    resale_price: number;
    listing_description?: string;
    reason_for_sale?: string;
    expires_at?: Date;
}
export interface EventTicketResaleUpdateDto {
    resale_price?: number;
    listing_description?: string;
    status?: ResaleStatus;
}
export interface EventTicketResalePurchaseDto {
    resale_id: number;
    buyer_id: number;
    payment_method: PaymentMethod;
    payment_reference?: string;
}
export interface EventTicketResaleSearchParams {
    event_id?: number;
    seller_id?: number;
    buyer_id?: number;
    status?: ResaleStatus;
    min_price?: number;
    max_price?: number;
    limit?: number;
    offset?: number;
}
