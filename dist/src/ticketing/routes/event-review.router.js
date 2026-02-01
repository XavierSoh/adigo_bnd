"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_review_controller_1 = require("../controllers/event-review.controller");
const eventReviewRouter = (0, express_1.Router)();
// CRUD routes
eventReviewRouter.post("/", event_review_controller_1.EventReviewController.create);
// Moderation routes (MUST be before /:id)
eventReviewRouter.get("/pending", event_review_controller_1.EventReviewController.getPending);
eventReviewRouter.get("/flagged", event_review_controller_1.EventReviewController.getFlagged);
// Top rated events (MUST be before /:id)
eventReviewRouter.get("/top-rated", event_review_controller_1.EventReviewController.getTopRated);
// Reviews by event (MUST be before /:id)
eventReviewRouter.get("/event/:eventId", event_review_controller_1.EventReviewController.getByEvent);
// Reviews by customer (MUST be before /:id)
eventReviewRouter.get("/customer/:customerId", event_review_controller_1.EventReviewController.getByCustomer);
// Statistics by event (MUST be before /:id)
eventReviewRouter.get("/event/:eventId/statistics", event_review_controller_1.EventReviewController.getStatisticsByEvent);
// Get by ID (MUST be after specific routes)
eventReviewRouter.get("/:id", event_review_controller_1.EventReviewController.getById);
eventReviewRouter.put("/:id", event_review_controller_1.EventReviewController.update);
// Moderation operations
eventReviewRouter.patch("/:id/approve", event_review_controller_1.EventReviewController.approve);
eventReviewRouter.patch("/:id/flag", event_review_controller_1.EventReviewController.flag);
eventReviewRouter.patch("/:id/unflag", event_review_controller_1.EventReviewController.unflag);
// Soft delete and restore
eventReviewRouter.delete("/:id/soft", event_review_controller_1.EventReviewController.softDelete);
eventReviewRouter.delete("/:id", event_review_controller_1.EventReviewController.delete);
eventReviewRouter.patch("/:id/restore", event_review_controller_1.EventReviewController.restore);
exports.default = eventReviewRouter;
