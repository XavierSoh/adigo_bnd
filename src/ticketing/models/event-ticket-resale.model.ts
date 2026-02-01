/**
 * Event Ticket Resale Model (Marketplace)
 *
 * Allows users to resell tickets with 10% ADIGO commission
 */

import { PaymentMethod, PaymentStatus, ResaleStatus } from './shared.types';

export type ResaleListingStatus = 'listed' | 'sold' | 'cancelled' | 'expired' | 'removed';

export interface EventTicketResale {
    id?: number;
    resale_code?: string;                  // e.g., 'RSL-2025-001234'

    // Original Ticket
    ticket_purchase_id: number;
    event_id: number;
    ticket_type_id: number;

    // Seller Information
    seller_id: number;
    original_price: number;                // Original purchase price
    resale_price: number;                  // Price set by seller

    // Marketplace Fees (ADIGO Commission: 10%)
    commission_rate?: number;              // Default: 10.00
    commission_amount?: number;            // Calculated: resale_price * 0.10
    seller_receives?: number;              // Calculated: resale_price - commission_amount

    // Buyer Information
    buyer_id?: number;

    // Status
    status?: ResaleStatus;

    // Payment
    payment_method?: PaymentMethod;
    payment_status?: PaymentStatus;
    payment_reference?: string;
    wallet_transaction_id?: number;

    // Listing Details
    listing_description?: string;
    reason_for_sale?: string;

    // Timestamps
    listed_at?: Date;
    sold_at?: Date;
    cancelled_at?: Date;
    cancellation_reason?: string;
    expires_at?: Date;

    // Metadata
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
