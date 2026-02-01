/**
 * Event Ticket Purchase Routes
 */

import { Router } from 'express';
import { EventTicketPurchaseController } from '../controllers/event-ticket-purchase.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.middleware';

const router = Router();

// Purchase ticket (auth required)
router.post('/purchase', authMiddleware, EventTicketPurchaseController.purchase);

// Get my tickets (auth required)
router.get('/my-tickets', authMiddleware, EventTicketPurchaseController.getMyTickets);

// Get ticket by ID (optional auth)
router.get('/:id', optionalAuthMiddleware, EventTicketPurchaseController.getById);

// Validate ticket - scan QR code (auth required)
router.post('/validate', authMiddleware, EventTicketPurchaseController.validateTicket);

// Get event tickets (organizer/admin)
router.get('/event/:eventId', authMiddleware, EventTicketPurchaseController.getEventTickets);

// Cancel ticket (auth required)
router.post('/:id/cancel', authMiddleware, EventTicketPurchaseController.cancelTicket);

export default router;
