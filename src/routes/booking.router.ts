import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
// import { authMiddleware } from "../middlewares/auth.middleware"; // Si vous avez un middleware d'authentification

const bookingRouter = Router();

// Routes principales CRUD
bookingRouter.post("/multiple", BookingController.createMultiple);
bookingRouter.post("/batch", BookingController.createBatch);
bookingRouter.post("/", BookingController.create);
bookingRouter.get("/", BookingController.getAll);

// Routes spécialisées - Disponibilité et sièges (MUST be before /:id)
bookingRouter.get("/seat-availability", BookingController.checkSeatAvailability);
bookingRouter.get("/booked-seats", BookingController.getBookedSeats);

// Routes de recherche et filtrage (MUST be before /:id)
bookingRouter.get("/search", BookingController.search);

// Routes de statistiques (MUST be before /:id)
bookingRouter.get("/statistics", BookingController.getStatistics);
bookingRouter.get("/revenue-statistics", BookingController.getRevenueStatistics);

// Routes par date (MUST be before /:id)
bookingRouter.get("/by-date-range", BookingController.getByDateRange);
bookingRouter.get("/recent", BookingController.getRecent);

// Routes de maintenance (MUST be before /:id)
bookingRouter.get("/soft-deleted", BookingController.getSoftDeleted);


// Booking management operations (MUST be before /:id)
bookingRouter.put("/:booking_id/cancel", BookingController.cancelSingle);
bookingRouter.put("/:booking_id/modify", BookingController.modifySingle);
// Get by ID (MUST be after all specific routes)
bookingRouter.get("/:id", BookingController.getById);

// Update, delete operations with ID
bookingRouter.put("/:id", BookingController.update);
bookingRouter.delete("/:id/soft", BookingController.softDelete);
bookingRouter.delete("/:id", BookingController.delete);
bookingRouter.patch("/:id/restore", BookingController.restore);

// Other operations
bookingRouter.patch("/cancel-batch", BookingController.cancelBatch);
bookingRouter.delete("/cleanup", BookingController.cleanup);

export default bookingRouter;