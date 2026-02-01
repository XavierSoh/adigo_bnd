"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_category_controller_1 = require("../controllers/event-category.controller");
const eventCategoryRouter = (0, express_1.Router)();
// CRUD routes
eventCategoryRouter.post("/", event_category_controller_1.EventCategoryController.create);
eventCategoryRouter.get("/", event_category_controller_1.EventCategoryController.getAll);
// Statistics (MUST be before /:id)
eventCategoryRouter.get("/statistics", event_category_controller_1.EventCategoryController.getStatistics);
// Reorder categories (MUST be before /:id)
eventCategoryRouter.patch("/reorder", event_category_controller_1.EventCategoryController.reorder);
// Get by ID (MUST be after specific routes)
eventCategoryRouter.get("/:id", event_category_controller_1.EventCategoryController.getById);
eventCategoryRouter.put("/:id", event_category_controller_1.EventCategoryController.update);
eventCategoryRouter.delete("/:id/soft", event_category_controller_1.EventCategoryController.softDelete);
eventCategoryRouter.delete("/:id", event_category_controller_1.EventCategoryController.delete);
eventCategoryRouter.patch("/:id/restore", event_category_controller_1.EventCategoryController.restore);
exports.default = eventCategoryRouter;
