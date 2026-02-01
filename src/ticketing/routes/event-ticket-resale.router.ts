import { Router } from "express";
import { EventTicketResaleController } from "../controllers/event-ticket-resale.controller";

const eventTicketResaleRouter = Router();

// CRUD routes
eventTicketResaleRouter.post("/", EventTicketResaleController.create);

// Search (MUST be before /:id)
eventTicketResaleRouter.get("/search", EventTicketResaleController.search);

// Statistics (MUST be before /:id)
eventTicketResaleRouter.get("/statistics", EventTicketResaleController.getStatistics);

// Active resales by event (MUST be before /:id)
eventTicketResaleRouter.get("/event/:eventId", EventTicketResaleController.getActiveByEvent);

// Get by resale code (MUST be before /:id)
eventTicketResaleRouter.get("/code/:resaleCode", EventTicketResaleController.getByResaleCode);

// Get by ID (MUST be after specific routes)
eventTicketResaleRouter.get("/:id", EventTicketResaleController.getById);
eventTicketResaleRouter.put("/:id", EventTicketResaleController.update);

// Purchase resale ticket
eventTicketResaleRouter.post("/purchase", EventTicketResaleController.purchase);

// Cancel resale
eventTicketResaleRouter.patch("/:id/cancel", EventTicketResaleController.cancel);

// Soft delete
eventTicketResaleRouter.delete("/:id", EventTicketResaleController.softDelete);

export default eventTicketResaleRouter;
