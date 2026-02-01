import { EventTicketResale, EventTicketResaleCreateDto, EventTicketResaleUpdateDto, EventTicketResalePurchaseDto, EventTicketResaleSearchParams } from '../models/event-ticket-resale.model';
/**
 * Event Ticket Resale Repository
 *
 * Handles ticket resale marketplace with 10% ADIGO commission
 */
export declare class EventTicketResaleRepository {
    /**
     * Create a new ticket resale listing
     */
    static create(data: EventTicketResaleCreateDto, created_by?: number): Promise<{
        status: boolean;
        message: string;
        body?: EventTicketResale;
        code: number;
    }>;
    /**
     * Find resale by ID
     */
    static findById(id: number): Promise<{
        status: boolean;
        message: string;
        body?: any;
        code: number;
    }>;
    /**
     * Find by resale code
     */
    static findByResaleCode(resaleCode: string): Promise<{
        status: boolean;
        message: string;
        body?: any;
        code: number;
    }>;
    /**
     * Search resales with filters
     */
    static search(params: EventTicketResaleSearchParams): Promise<{
        status: boolean;
        message: string;
        body?: any[];
        code: number;
    }>;
    /**
     * Get active listings for an event
     */
    static findActiveByEvent(eventId: number): Promise<{
        status: boolean;
        message: string;
        body?: any[];
        code: number;
    }>;
    /**
     * Purchase a resale ticket
     */
    static purchase(purchaseData: EventTicketResalePurchaseDto): Promise<{
        status: boolean;
        message: string;
        body?: any;
        code: number;
    }>;
    /**
     * Update resale listing
     */
    static update(id: number, data: EventTicketResaleUpdateDto): Promise<{
        status: boolean;
        message: string;
        body?: EventTicketResale;
        code: number;
    }>;
    /**
     * Cancel resale listing
     */
    static cancel(id: number, sellerId: number, reason?: string): Promise<{
        status: boolean;
        message: string;
        code: number;
    }>;
    /**
     * Expire old resale listings
     */
    static expireOldListings(): Promise<number>;
    /**
     * Get resale statistics
     */
    static getStatistics(eventId?: number): Promise<{
        status: boolean;
        body?: any;
        code: number;
    }>;
    /**
     * Soft delete
     */
    static softDelete(id: number, deleted_by?: number): Promise<{
        status: boolean;
        message: string;
        code: number;
    }>;
}
