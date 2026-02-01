/**
 * Event Ticket Purchase Controller
 *
 * Handles ticket purchases, payment, QR code generation, and validation
 */
import { Request, Response } from 'express';
export declare class EventTicketPurchaseController {
    /**
     * Purchase tickets
     * POST /v1/api/ticketing/tickets/purchase
     */
    static purchase(req: Request, res: Response): Promise<void>;
    /**
     * Get customer tickets
     * GET /v1/api/ticketing/tickets/my-tickets
     */
    static getMyTickets(req: Request, res: Response): Promise<void>;
    /**
     * Get ticket by ID
     * GET /v1/api/ticketing/tickets/:id
     */
    static getById(req: Request, res: Response): Promise<void>;
    /**
     * Validate ticket (scan QR code)
     * POST /v1/api/ticketing/tickets/validate
     */
    static validateTicket(req: Request, res: Response): Promise<void>;
    /**
     * Get tickets for an event (organizer view)
     * GET /v1/api/ticketing/tickets/event/:eventId
     */
    static getEventTickets(req: Request, res: Response): Promise<void>;
    /**
     * Cancel ticket
     * POST /v1/api/ticketing/tickets/:id/cancel
     */
    static cancelTicket(req: Request, res: Response): Promise<void>;
}
