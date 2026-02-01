"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_controller_1 = require("../controllers/event.controller");
const eventRouter = (0, express_1.Router)();
// CRUD routes
eventRouter.post("/", event_controller_1.EventController.create);
eventRouter.get("/", event_controller_1.EventController.getAll);
// Search (MUST be before /:id)
eventRouter.get("/search", event_controller_1.EventController.search);
// Statistics (MUST be before /:id)
eventRouter.get("/statistics", event_controller_1.EventController.getStatistics);
// Featured events (MUST be before /:id)
eventRouter.get("/featured", event_controller_1.EventController.getFeatured);
// Upcoming events (MUST be before /:id)
eventRouter.get("/upcoming", event_controller_1.EventController.getUpcoming);
// Past events (MUST be before /:id)
eventRouter.get("/past", event_controller_1.EventController.getPast);
// Events by organizer (MUST be before /:id)
eventRouter.get("/organizer/:organizerId", event_controller_1.EventController.getByOrganizer);
// Events by category (MUST be before /:id)
eventRouter.get("/category/:categoryId", event_controller_1.EventController.getByCategory);
// Get by event code (MUST be before /:id)
eventRouter.get("/code/:eventCode", event_controller_1.EventController.getByEventCode);
// Get by ID (MUST be after specific routes)
eventRouter.get("/:id", event_controller_1.EventController.getById);
eventRouter.put("/:id", event_controller_1.EventController.update);
// Event lifecycle operations
eventRouter.patch("/:id/publish", event_controller_1.EventController.publish);
eventRouter.patch("/:id/cancel", event_controller_1.EventController.cancel);
// Admin operations
eventRouter.patch("/:id/approve", event_controller_1.EventController.approve);
eventRouter.patch("/:id/reject", event_controller_1.EventController.reject);
// Soft delete and restore
eventRouter.delete("/:id/soft", event_controller_1.EventController.softDelete);
eventRouter.delete("/:id", event_controller_1.EventController.delete);
eventRouter.patch("/:id/restore", event_controller_1.EventController.restore);
exports.default = eventRouter;
