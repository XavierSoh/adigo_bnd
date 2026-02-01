"use strict";
/**
 * Event Ticket Purchase Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_ticket_purchase_controller_1 = require("../controllers/event-ticket-purchase.controller");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Purchase ticket (auth required)
router.post('/purchase', auth_middleware_1.authMiddleware, event_ticket_purchase_controller_1.EventTicketPurchaseController.purchase);
// Get my tickets (auth required)
router.get('/my-tickets', auth_middleware_1.authMiddleware, event_ticket_purchase_controller_1.EventTicketPurchaseController.getMyTickets);
// Get ticket by ID (optional auth)
router.get('/:id', auth_middleware_1.optionalAuthMiddleware, event_ticket_purchase_controller_1.EventTicketPurchaseController.getById);
// Validate ticket - scan QR code (auth required)
router.post('/validate', auth_middleware_1.authMiddleware, event_ticket_purchase_controller_1.EventTicketPurchaseController.validateTicket);
// Get event tickets (organizer/admin)
router.get('/event/:eventId', auth_middleware_1.authMiddleware, event_ticket_purchase_controller_1.EventTicketPurchaseController.getEventTickets);
// Cancel ticket (auth required)
router.post('/:id/cancel', auth_middleware_1.authMiddleware, event_ticket_purchase_controller_1.EventTicketPurchaseController.cancelTicket);
exports.default = router;
