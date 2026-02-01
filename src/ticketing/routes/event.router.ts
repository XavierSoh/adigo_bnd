import { Router } from "express";
import { EventController } from "../controllers/event.controller";

const eventRouter = Router();

// CRUD routes
eventRouter.post("/", EventController.create);
eventRouter.get("/", EventController.getAll);

// Search (MUST be before /:id)
eventRouter.get("/search", EventController.search);

// Statistics (MUST be before /:id)
eventRouter.get("/statistics", EventController.getStatistics);

// Featured events (MUST be before /:id)
eventRouter.get("/featured", EventController.getFeatured);

// Upcoming events (MUST be before /:id)
eventRouter.get("/upcoming", EventController.getUpcoming);

// Past events (MUST be before /:id)
eventRouter.get("/past", EventController.getPast);

// Events by organizer (MUST be before /:id)
eventRouter.get("/organizer/:organizerId", EventController.getByOrganizer);

// Events by category (MUST be before /:id)
eventRouter.get("/category/:categoryId", EventController.getByCategory);

// Get by event code (MUST be before /:id)
eventRouter.get("/code/:eventCode", EventController.getByEventCode);

// Get by ID (MUST be after specific routes)
eventRouter.get("/:id", EventController.getById);
eventRouter.put("/:id", EventController.update);

// Event lifecycle operations
eventRouter.patch("/:id/publish", EventController.publish);
eventRouter.patch("/:id/cancel", EventController.cancel);

// Admin operations
eventRouter.patch("/:id/approve", EventController.approve);
eventRouter.patch("/:id/reject", EventController.reject);

// Soft delete and restore
eventRouter.delete("/:id/soft", EventController.softDelete);
eventRouter.delete("/:id", EventController.delete);
eventRouter.patch("/:id/restore", EventController.restore);

export default eventRouter;
