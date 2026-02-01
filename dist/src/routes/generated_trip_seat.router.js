"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const generated_trip_seat_controller_1 = require("../controllers/generated_trip_seat_controller");
const generatedTripSeatRouter = (0, express_1.Router)();
// Get seat by ID
generatedTripSeatRouter.get("/:id", generated_trip_seat_controller_1.GeneratedTripSeatController.getById);
// Get all seats for a generated trip
generatedTripSeatRouter.get("/trip/:generated_trip_id", generated_trip_seat_controller_1.GeneratedTripSeatController.getByGeneratedTrip);
// Get seats by status (query param: ?status=available|reserved|booked|blocked)
generatedTripSeatRouter.get("/trip/:generated_trip_id/status", generated_trip_seat_controller_1.GeneratedTripSeatController.getByStatus);
// Count available seats for a generated trip
generatedTripSeatRouter.get("/trip/:generated_trip_id/count-available", generated_trip_seat_controller_1.GeneratedTripSeatController.countAvailable);
// Get seats with details (join with seat table)
generatedTripSeatRouter.get("/trip/:generated_trip_id/details", generated_trip_seat_controller_1.GeneratedTripSeatController.getWithDetails);
exports.default = generatedTripSeatRouter;
//http://localhost:3800/v1/api/generated_trip_seats/trip/5/details
