import { Router } from "express";
import { SeatController } from "../controllers/seat.controller";

const seatRouter = Router();

// Create a new seat
seatRouter.post("/", SeatController.create);

// Get seat by ID
seatRouter.get("/:id", SeatController.getById);

// Update seat by ID
seatRouter.put("/:id", SeatController.update);

// Soft delete seat (désactiver)
seatRouter.patch("/:id/soft-delete", SeatController.softDelete);

// Restore seat (réactiver)
seatRouter.patch("/:id/restore", SeatController.restore);

// Permanently delete seat
seatRouter.delete("/:id", SeatController.delete);

// Get all seats by bus
seatRouter.get("/bus/:busId", SeatController.getByBus);

export default seatRouter;
