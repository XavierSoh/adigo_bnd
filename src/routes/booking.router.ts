import { Router } from "express";
import { BookingController } from "../controllers/booking.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const bookingRouter = Router();

// Real, verified Orange Money payment flow (pending booking -> confirmed
// only once Orange Money confirms the charge). Scoped auth on just this
// route — the rest of this router is a separate, already-flagged gap.
bookingRouter.post("/pay/orange-money", authMiddleware, BookingController.initiateOrangeMoneyPayment);

// Routes principales CRUD
// Auth required: a customer booking for themselves must be logged in
// (customer_id is checked against the token in the controller), and staff
// booking on a customer's behalf at the counter still needs a valid staff
// token. The rest of this router (search/statistics/list/delete/etc.) is
// a separate, already-flagged gap — see the production audit.
bookingRouter.post("/multiple", authMiddleware, BookingController.createMultiple);
bookingRouter.post("/batch", authMiddleware, BookingController.createBatch);
bookingRouter.post("/", authMiddleware, BookingController.create);
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
bookingRouter.put("/:booking_id/cancel", authMiddleware, BookingController.cancelSingle);
bookingRouter.put("/:booking_id/modify", authMiddleware, BookingController.modifySingle);
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