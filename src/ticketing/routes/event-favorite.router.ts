import { Router } from "express";
import { EventFavoriteController } from "../controllers/event-favorite.controller";

const eventFavoriteRouter = Router();

// CRUD routes
eventFavoriteRouter.post("/", EventFavoriteController.create);

// Toggle favorite (MUST be before /:customerId/:eventId)
eventFavoriteRouter.post("/toggle", EventFavoriteController.toggle);

// Statistics (MUST be before other routes)
eventFavoriteRouter.get("/statistics", EventFavoriteController.getStatistics);

// Most favorited events (MUST be before other routes)
eventFavoriteRouter.get("/most-favorited", EventFavoriteController.getMostFavorited);

// Get favorites by customer
eventFavoriteRouter.get("/customer/:customerId", EventFavoriteController.getByCustomer);

// Get favorites by event (who favorited this event)
eventFavoriteRouter.get("/event/:eventId", EventFavoriteController.getByEvent);

// Get favorite count for event
eventFavoriteRouter.get("/event/:eventId/count", EventFavoriteController.getCountByEvent);

// Check if event is favorited by customer
eventFavoriteRouter.get("/customer/:customerId/event/:eventId/check", EventFavoriteController.isFavorited);

// Remove favorite
eventFavoriteRouter.delete("/customer/:customerId/event/:eventId", EventFavoriteController.remove);

// Remove all favorites by customer
eventFavoriteRouter.delete("/customer/:customerId/all", EventFavoriteController.removeAllByCustomer);

// Remove all favorites by event (admin only)
eventFavoriteRouter.delete("/event/:eventId/all", EventFavoriteController.removeAllByEvent);

export default eventFavoriteRouter;
