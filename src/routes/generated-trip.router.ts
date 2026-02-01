// ============================================
// 4. ROUTER - generated-trip.router.ts
// ============================================
import { Router } from "express";
import { GeneratedTripController } from "../controllers/generated-trip.controller";

const generatedTripRouter = Router();

// Specialized routes (must come BEFORE parameterized routes like /:id)
generatedTripRouter.post("/for_period", GeneratedTripController.generateForPeriod);
generatedTripRouter.get("/by-date-range", GeneratedTripController.getByDateRange);
generatedTripRouter.get("/statistics", GeneratedTripController.getStatistics);
generatedTripRouter.get("/available-cities", GeneratedTripController.getAvailableCities);

// CRUD routes
generatedTripRouter.post("/", GeneratedTripController.create);
generatedTripRouter.get("/", GeneratedTripController.getAll);
generatedTripRouter.get("/:id", GeneratedTripController.getById);
generatedTripRouter.put("/:id", GeneratedTripController.update);
generatedTripRouter.delete("/:id", GeneratedTripController.delete);

// Specialized routes with :id parameter
generatedTripRouter.patch("/:id/status", GeneratedTripController.updateStatus);
generatedTripRouter.patch("/:id/assign-staff", GeneratedTripController.assignStaff);
generatedTripRouter.patch("/:id/available-seats", GeneratedTripController.updateAvailableSeats);

export default generatedTripRouter;