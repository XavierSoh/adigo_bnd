"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_organizer_controller_1 = require("../controllers/event-organizer.controller");
const eventOrganizerRouter = (0, express_1.Router)();
// CRUD routes
eventOrganizerRouter.post("/", event_organizer_controller_1.EventOrganizerController.create);
eventOrganizerRouter.get("/", event_organizer_controller_1.EventOrganizerController.getAll);
// Search (MUST be before /:id)
eventOrganizerRouter.get("/search", event_organizer_controller_1.EventOrganizerController.search);
// Statistics (MUST be before /:id)
eventOrganizerRouter.get("/statistics", event_organizer_controller_1.EventOrganizerController.getStatistics);
// Verified organizers (MUST be before /:id)
eventOrganizerRouter.get("/verified", event_organizer_controller_1.EventOrganizerController.getVerified);
// By customer ID (MUST be before /:id)
eventOrganizerRouter.get("/customer/:customerId", event_organizer_controller_1.EventOrganizerController.getByCustomerId);
// Get by ID (MUST be after specific routes)
eventOrganizerRouter.get("/:id", event_organizer_controller_1.EventOrganizerController.getById);
eventOrganizerRouter.put("/:id", event_organizer_controller_1.EventOrganizerController.update);
// Verification (admin only)
eventOrganizerRouter.patch("/:id/verification-status", event_organizer_controller_1.EventOrganizerController.updateVerificationStatus);
// Soft delete and restore
eventOrganizerRouter.delete("/:id/soft", event_organizer_controller_1.EventOrganizerController.softDelete);
eventOrganizerRouter.delete("/:id", event_organizer_controller_1.EventOrganizerController.delete);
eventOrganizerRouter.patch("/:id/restore", event_organizer_controller_1.EventOrganizerController.restore);
exports.default = eventOrganizerRouter;
