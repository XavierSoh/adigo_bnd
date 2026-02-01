"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================
// 4. ROUTER - generated-trip.router.ts
// ============================================
const express_1 = require("express");
const generated_trip_controller_1 = require("../controllers/generated-trip.controller");
const generatedTripRouter = (0, express_1.Router)();
// Specialized routes (must come BEFORE parameterized routes like /:id)
generatedTripRouter.post("/for_period", generated_trip_controller_1.GeneratedTripController.generateForPeriod);
generatedTripRouter.get("/by-date-range", generated_trip_controller_1.GeneratedTripController.getByDateRange);
generatedTripRouter.get("/statistics", generated_trip_controller_1.GeneratedTripController.getStatistics);
generatedTripRouter.get("/available-cities", generated_trip_controller_1.GeneratedTripController.getAvailableCities);
// CRUD routes
generatedTripRouter.post("/", generated_trip_controller_1.GeneratedTripController.create);
generatedTripRouter.get("/", generated_trip_controller_1.GeneratedTripController.getAll);
generatedTripRouter.get("/:id", generated_trip_controller_1.GeneratedTripController.getById);
generatedTripRouter.put("/:id", generated_trip_controller_1.GeneratedTripController.update);
generatedTripRouter.delete("/:id", generated_trip_controller_1.GeneratedTripController.delete);
// Specialized routes with :id parameter
generatedTripRouter.patch("/:id/status", generated_trip_controller_1.GeneratedTripController.updateStatus);
generatedTripRouter.patch("/:id/assign-staff", generated_trip_controller_1.GeneratedTripController.assignStaff);
generatedTripRouter.patch("/:id/available-seats", generated_trip_controller_1.GeneratedTripController.updateAvailableSeats);
exports.default = generatedTripRouter;
