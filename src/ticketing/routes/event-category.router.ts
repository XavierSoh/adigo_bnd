import { Router } from "express";
import { EventCategoryController } from "../controllers/event-category.controller";

const eventCategoryRouter = Router();

// CRUD routes
eventCategoryRouter.post("/", EventCategoryController.create);
eventCategoryRouter.get("/", EventCategoryController.getAll);

// Statistics (MUST be before /:id)
eventCategoryRouter.get("/statistics", EventCategoryController.getStatistics);

// Reorder categories (MUST be before /:id)
eventCategoryRouter.patch("/reorder", EventCategoryController.reorder);

// Get by ID (MUST be after specific routes)
eventCategoryRouter.get("/:id", EventCategoryController.getById);
eventCategoryRouter.put("/:id", EventCategoryController.update);
eventCategoryRouter.delete("/:id/soft", EventCategoryController.softDelete);
eventCategoryRouter.delete("/:id", EventCategoryController.delete);
eventCategoryRouter.patch("/:id/restore", EventCategoryController.restore);

export default eventCategoryRouter;
