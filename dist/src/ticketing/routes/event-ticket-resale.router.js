"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_ticket_resale_controller_1 = require("../controllers/event-ticket-resale.controller");
const eventTicketResaleRouter = (0, express_1.Router)();
// CRUD routes
eventTicketResaleRouter.post("/", event_ticket_resale_controller_1.EventTicketResaleController.create);
// Search (MUST be before /:id)
eventTicketResaleRouter.get("/search", event_ticket_resale_controller_1.EventTicketResaleController.search);
// Statistics (MUST be before /:id)
eventTicketResaleRouter.get("/statistics", event_ticket_resale_controller_1.EventTicketResaleController.getStatistics);
// Active resales by event (MUST be before /:id)
eventTicketResaleRouter.get("/event/:eventId", event_ticket_resale_controller_1.EventTicketResaleController.getActiveByEvent);
// Get by resale code (MUST be before /:id)
eventTicketResaleRouter.get("/code/:resaleCode", event_ticket_resale_controller_1.EventTicketResaleController.getByResaleCode);
// Get by ID (MUST be after specific routes)
eventTicketResaleRouter.get("/:id", event_ticket_resale_controller_1.EventTicketResaleController.getById);
eventTicketResaleRouter.put("/:id", event_ticket_resale_controller_1.EventTicketResaleController.update);
// Purchase resale ticket
eventTicketResaleRouter.post("/purchase", event_ticket_resale_controller_1.EventTicketResaleController.purchase);
// Cancel resale
eventTicketResaleRouter.patch("/:id/cancel", event_ticket_resale_controller_1.EventTicketResaleController.cancel);
// Soft delete
eventTicketResaleRouter.delete("/:id", event_ticket_resale_controller_1.EventTicketResaleController.softDelete);
exports.default = eventTicketResaleRouter;
