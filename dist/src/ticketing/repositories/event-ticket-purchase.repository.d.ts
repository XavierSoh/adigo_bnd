/**
 * Event Ticket Purchase Repository
 *
 * Handles ticket purchases, QR code generation, and validation
 */
import { EventTicketPurchaseCreateDto, EventTicketValidateDto, EventTicketRefundDto } from "../models/event-ticket-purchase.model";
import ResponseModel from "../../models/response.model";
export declare class EventTicketPurchaseRepository {
    private static readonly TABLE;
    static create(purchase: EventTicketPurchaseCreateDto): Promise<ResponseModel>;
    static confirmPayment(ticketId: number, qrCodeData: string, qrCodeImage: string, walletTransactionId?: number): Promise<ResponseModel>;
    static validateTicket(validation: EventTicketValidateDto): Promise<ResponseModel>;
    static findByCustomer(customerId: number, filters?: any): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByEvent(eventId: number): Promise<ResponseModel>;
    static cancel(ticketId: number, reason: string): Promise<ResponseModel>;
    static refund(ticketId: number, refund: EventTicketRefundDto): Promise<ResponseModel>;
}
