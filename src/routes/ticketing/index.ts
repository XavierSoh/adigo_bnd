import { Router } from "express";
import {
    CategoryController,
    OrganizerController,
    EventController,
    TicketController,
    FavoriteController,
    ReviewController
} from "../../controllers/ticketing";

const ticketingRouter = Router();

// ============================================
// CATEGORIES
// ============================================
ticketingRouter.get("/categories", CategoryController.getAll);
ticketingRouter.get("/categories/:id", CategoryController.getById);
ticketingRouter.post("/categories", CategoryController.create);
ticketingRouter.put("/categories/:id", CategoryController.update);
ticketingRouter.delete("/categories/:id", CategoryController.delete);

// ============================================
// ORGANIZERS
// ============================================
ticketingRouter.get("/organizers", OrganizerController.getAll);
ticketingRouter.get("/organizers/:id", OrganizerController.getById);
ticketingRouter.get("/organizers/customer/:customerId", OrganizerController.getByCustomerId);
ticketingRouter.post("/organizers", OrganizerController.create);
ticketingRouter.put("/organizers/:id", OrganizerController.update);
ticketingRouter.patch("/organizers/:id/verify", OrganizerController.verify);
ticketingRouter.delete("/organizers/:id", OrganizerController.delete);

// ============================================
// EVENTS
// ============================================
ticketingRouter.get("/events", EventController.getAll);
ticketingRouter.get("/events/search", EventController.search);
ticketingRouter.get("/events/:id", EventController.getById);
ticketingRouter.get("/events/code/:code", EventController.getByCode);
ticketingRouter.post("/events", EventController.create);
ticketingRouter.put("/events/:id", EventController.update);
ticketingRouter.patch("/events/:id/publish", EventController.publish);
ticketingRouter.patch("/events/:id/approve", EventController.approve);
ticketingRouter.patch("/events/:id/cancel", EventController.cancel);
ticketingRouter.delete("/events/:id", EventController.delete);

// Event Ticket Types
ticketingRouter.get("/events/:id/ticket-types", EventController.getTicketTypes);
ticketingRouter.post("/events/:id/ticket-types", EventController.createTicketType);
ticketingRouter.put("/events/:id/ticket-types/:typeId", EventController.updateTicketType);
ticketingRouter.delete("/events/:id/ticket-types/:typeId", EventController.deleteTicketType);

// ============================================
// TICKETS
// ============================================
ticketingRouter.get("/tickets/customer/:customerId", TicketController.getMyTickets);
ticketingRouter.get("/tickets/:id", TicketController.getById);
ticketingRouter.get("/tickets/ref/:reference", TicketController.getByReference);
ticketingRouter.post("/tickets/purchase", TicketController.purchase);
ticketingRouter.patch("/tickets/:id/payment", TicketController.confirmPayment);
ticketingRouter.patch("/tickets/:id/validate", TicketController.validate);
ticketingRouter.post("/tickets/validate-qr", TicketController.validateByQr);
ticketingRouter.patch("/tickets/:id/cancel", TicketController.cancel);

// ============================================
// FAVORITES
// ============================================
ticketingRouter.get("/favorites/customer/:customerId", FavoriteController.getMyFavorites);
ticketingRouter.get("/favorites/check/:eventId", FavoriteController.check);
ticketingRouter.post("/favorites/:eventId", FavoriteController.add);
ticketingRouter.delete("/favorites/:eventId", FavoriteController.remove);
ticketingRouter.post("/favorites/:eventId/toggle", FavoriteController.toggle);

// ============================================
// REVIEWS
// ============================================
ticketingRouter.get("/reviews/event/:eventId", ReviewController.getByEventId);
ticketingRouter.get("/reviews/event/:eventId/stats", ReviewController.getEventStats);
ticketingRouter.post("/reviews", ReviewController.create);
ticketingRouter.put("/reviews/:id", ReviewController.update);
ticketingRouter.delete("/reviews/:id", ReviewController.delete);
ticketingRouter.patch("/reviews/:id/approve", ReviewController.approve);

export default ticketingRouter;
