"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const event_favorite_controller_1 = require("../controllers/event-favorite.controller");
const eventFavoriteRouter = (0, express_1.Router)();
// CRUD routes
eventFavoriteRouter.post("/", event_favorite_controller_1.EventFavoriteController.create);
// Toggle favorite (MUST be before /:customerId/:eventId)
eventFavoriteRouter.post("/toggle", event_favorite_controller_1.EventFavoriteController.toggle);
// Statistics (MUST be before other routes)
eventFavoriteRouter.get("/statistics", event_favorite_controller_1.EventFavoriteController.getStatistics);
// Most favorited events (MUST be before other routes)
eventFavoriteRouter.get("/most-favorited", event_favorite_controller_1.EventFavoriteController.getMostFavorited);
// Get favorites by customer
eventFavoriteRouter.get("/customer/:customerId", event_favorite_controller_1.EventFavoriteController.getByCustomer);
// Get favorites by event (who favorited this event)
eventFavoriteRouter.get("/event/:eventId", event_favorite_controller_1.EventFavoriteController.getByEvent);
// Get favorite count for event
eventFavoriteRouter.get("/event/:eventId/count", event_favorite_controller_1.EventFavoriteController.getCountByEvent);
// Check if event is favorited by customer
eventFavoriteRouter.get("/customer/:customerId/event/:eventId/check", event_favorite_controller_1.EventFavoriteController.isFavorited);
// Remove favorite
eventFavoriteRouter.delete("/customer/:customerId/event/:eventId", event_favorite_controller_1.EventFavoriteController.remove);
// Remove all favorites by customer
eventFavoriteRouter.delete("/customer/:customerId/all", event_favorite_controller_1.EventFavoriteController.removeAllByCustomer);
// Remove all favorites by event (admin only)
eventFavoriteRouter.delete("/event/:eventId/all", event_favorite_controller_1.EventFavoriteController.removeAllByEvent);
exports.default = eventFavoriteRouter;
