import { Router } from "express";
import { EventReviewController } from "../controllers/event-review.controller";

const eventReviewRouter = Router();

// CRUD routes
eventReviewRouter.post("/", EventReviewController.create);

// Moderation routes (MUST be before /:id)
eventReviewRouter.get("/pending", EventReviewController.getPending);
eventReviewRouter.get("/flagged", EventReviewController.getFlagged);

// Top rated events (MUST be before /:id)
eventReviewRouter.get("/top-rated", EventReviewController.getTopRated);

// Reviews by event (MUST be before /:id)
eventReviewRouter.get("/event/:eventId", EventReviewController.getByEvent);

// Reviews by customer (MUST be before /:id)
eventReviewRouter.get("/customer/:customerId", EventReviewController.getByCustomer);

// Statistics by event (MUST be before /:id)
eventReviewRouter.get("/event/:eventId/statistics", EventReviewController.getStatisticsByEvent);

// Get by ID (MUST be after specific routes)
eventReviewRouter.get("/:id", EventReviewController.getById);
eventReviewRouter.put("/:id", EventReviewController.update);

// Moderation operations
eventReviewRouter.patch("/:id/approve", EventReviewController.approve);
eventReviewRouter.patch("/:id/flag", EventReviewController.flag);
eventReviewRouter.patch("/:id/unflag", EventReviewController.unflag);

// Soft delete and restore
eventReviewRouter.delete("/:id/soft", EventReviewController.softDelete);
eventReviewRouter.delete("/:id", EventReviewController.delete);
eventReviewRouter.patch("/:id/restore", EventReviewController.restore);

export default eventReviewRouter;
