"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const seat_controller_1 = require("../controllers/seat.controller");
const seatRouter = (0, express_1.Router)();
// Create a new seat
seatRouter.post("/", seat_controller_1.SeatController.create);
// Get seat by ID
seatRouter.get("/:id", seat_controller_1.SeatController.getById);
// Update seat by ID
seatRouter.put("/:id", seat_controller_1.SeatController.update);
// Soft delete seat (désactiver)
seatRouter.patch("/:id/soft-delete", seat_controller_1.SeatController.softDelete);
// Restore seat (réactiver)
seatRouter.patch("/:id/restore", seat_controller_1.SeatController.restore);
// Permanently delete seat
seatRouter.delete("/:id", seat_controller_1.SeatController.delete);
// Get all seats by bus
seatRouter.get("/bus/:busId", seat_controller_1.SeatController.getByBus);
exports.default = seatRouter;
