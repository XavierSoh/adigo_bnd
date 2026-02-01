import { Router } from "express"; 
import { GeneratedTripSeatController } from "../controllers/generated_trip_seat_controller";

const generatedTripSeatRouter = Router();

// Get seat by ID
generatedTripSeatRouter.get("/:id", GeneratedTripSeatController.getById);

// Get all seats for a generated trip
generatedTripSeatRouter.get("/trip/:generated_trip_id", GeneratedTripSeatController.getByGeneratedTrip);

// Get seats by status (query param: ?status=available|reserved|booked|blocked)
generatedTripSeatRouter.get("/trip/:generated_trip_id/status", GeneratedTripSeatController.getByStatus);

// Count available seats for a generated trip
generatedTripSeatRouter.get("/trip/:generated_trip_id/count-available", GeneratedTripSeatController.countAvailable);

// Get seats with details (join with seat table)
generatedTripSeatRouter.get("/trip/:generated_trip_id/details", GeneratedTripSeatController.getWithDetails);

export default generatedTripSeatRouter;
//http://localhost:3800/v1/api/generated_trip_seats/trip/5/details