import { Event } from "./event.model";
import { EventTicketType } from "./ticket-type.model";
export type PaymentMethod = 'mtn' | 'orange' | 'wallet' | 'cash';
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
    event?: Event;
    ticket_type?: EventTicketType;
}
export interface TicketPurchaseDto {
    event_id: number;
    ticket_type_id: number;
    customer_id: number;
    quantity: number;
    payment_method: PaymentMethod;
}
export interface TicketPaymentDto {
    payment_ref: string;
    payment_status: PaymentStatus;
}
