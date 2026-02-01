"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const booking_controller_1 = require("../controllers/booking.controller");
// import { authMiddleware } from "../middlewares/auth.middleware"; // Si vous avez un middleware d'authentification
const bookingRouter = (0, express_1.Router)();
// Routes principales CRUD
bookingRouter.post("/multiple", booking_controller_1.BookingController.createMultiple);
bookingRouter.post("/batch", booking_controller_1.BookingController.createBatch);
bookingRouter.post("/", booking_controller_1.BookingController.create);
bookingRouter.get("/", booking_controller_1.BookingController.getAll);
// Routes spécialisées - Disponibilité et sièges (MUST be before /:id)
bookingRouter.get("/seat-availability", booking_controller_1.BookingController.checkSeatAvailability);
bookingRouter.get("/booked-seats", booking_controller_1.BookingController.getBookedSeats);
// Routes de recherche et filtrage (MUST be before /:id)
bookingRouter.get("/search", booking_controller_1.BookingController.search);
// Routes de statistiques (MUST be before /:id)
bookingRouter.get("/statistics", booking_controller_1.BookingController.getStatistics);
bookingRouter.get("/revenue-statistics", booking_controller_1.BookingController.getRevenueStatistics);
// Routes par date (MUST be before /:id)
bookingRouter.get("/by-date-range", booking_controller_1.BookingController.getByDateRange);
bookingRouter.get("/recent", booking_controller_1.BookingController.getRecent);
// Routes de maintenance (MUST be before /:id)
bookingRouter.get("/soft-deleted", booking_controller_1.BookingController.getSoftDeleted);
// Booking management operations (MUST be before /:id)
bookingRouter.put("/:booking_id/cancel", booking_controller_1.BookingController.cancelSingle);
bookingRouter.put("/:booking_id/modify", booking_controller_1.BookingController.modifySingle);
// Get by ID (MUST be after all specific routes)
bookingRouter.get("/:id", booking_controller_1.BookingController.getById);
// Update, delete operations with ID
bookingRouter.put("/:id", booking_controller_1.BookingController.update);
bookingRouter.delete("/:id/soft", booking_controller_1.BookingController.softDelete);
bookingRouter.delete("/:id", booking_controller_1.BookingController.delete);
bookingRouter.patch("/:id/restore", booking_controller_1.BookingController.restore);
// Other operations
bookingRouter.patch("/cancel-batch", booking_controller_1.BookingController.cancelBatch);
bookingRouter.delete("/cleanup", booking_controller_1.BookingController.cleanup);
exports.default = bookingRouter;
