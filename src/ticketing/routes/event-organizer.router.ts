import { Router } from "express";
import { EventOrganizerController } from "../controllers/event-organizer.controller";

const eventOrganizerRouter = Router();

// CRUD routes
eventOrganizerRouter.post("/", EventOrganizerController.create);
eventOrganizerRouter.get("/", EventOrganizerController.getAll);

// Search (MUST be before /:id)
eventOrganizerRouter.get("/search", EventOrganizerController.search);

// Statistics (MUST be before /:id)
eventOrganizerRouter.get("/statistics", EventOrganizerController.getStatistics);

// Verified organizers (MUST be before /:id)
eventOrganizerRouter.get("/verified", EventOrganizerController.getVerified);

// By customer ID (MUST be before /:id)
eventOrganizerRouter.get("/customer/:customerId", EventOrganizerController.getByCustomerId);

// Get by ID (MUST be after specific routes)
eventOrganizerRouter.get("/:id", EventOrganizerController.getById);
eventOrganizerRouter.put("/:id", EventOrganizerController.update);

// Verification (admin only)
eventOrganizerRouter.patch("/:id/verification-status", EventOrganizerController.updateVerificationStatus);

// Soft delete and restore
eventOrganizerRouter.delete("/:id/soft", EventOrganizerController.softDelete);
eventOrganizerRouter.delete("/:id", EventOrganizerController.delete);
eventOrganizerRouter.patch("/:id/restore", EventOrganizerController.restore);

export default eventOrganizerRouter;
