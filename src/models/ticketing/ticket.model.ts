import { Event } from "./event.model";
import { EventTicketType } from "./ticket-type.model";

// 'orangeMoney' (not 'orange') to match booking's convention and the
// payment-provider registry's naming — see EMAIL_NOTIFICATIONS_PLAN.md /
// the ticketing payment plan for why this was normalized.
export type PaymentMethod = 'mtn' | 'orangeMoney' | 'wallet' | 'cash';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type TicketStatus = 'pending' | 'confirmed' | 'used' | 'cancelled' | 'expired';

export interface EventTicket {
    id: number;
    reference: string;
    event_id: number;
    ticket_type_id: number;
    customer_id: number;
    quantity: number;
    unit_price: number;
    total_price: number;
    payment_method?: PaymentMethod;
    payment_status: PaymentStatus;
    payment_ref?: string;
    qr_code?: string;
    status: TicketStatus;
    used_at?: Date;
    created_at: Date;
    // Joined data
    event?: Event;
    ticket_type?: EventTicketType;
}

export interface TicketPurchaseDto {
    event_id: number;
    ticket_type_id: number;
    customer_id: number;
    quantity: number;
    payment_method: PaymentMethod;
    // Required only for payment_method:'orangeMoney' - no fallback to a
    // saved customer number (see CustomerRepository.findById's select list,
    // which doesn't expose one - same dead path found in booking).
    subscriber_msisdn?: string;
}

export interface TicketPaymentDto {
    payment_ref: string;
    payment_status: PaymentStatus;
}
