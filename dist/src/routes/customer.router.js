"use strict";
// Password reset (mobile)
Object.defineProperty(exports, "__esModule", { value: true });
// ============================================
// 4. ROUTER - customer.router.ts
// ============================================
const express_1 = require("express");
const customer_controller_1 = require("../controllers/customer.controller");
const upload_middleware_1 = require("../middleware/upload.middleware");
const customerRouter = (0, express_1.Router)();
// Authentication
customerRouter.post("/login", customer_controller_1.CustomerController.login);
customerRouter.post("/register", customer_controller_1.CustomerController.create);
// CRUD routes
customerRouter.post("/", customer_controller_1.CustomerController.create);
customerRouter.get("/", customer_controller_1.CustomerController.getAll);
// Search (MUST be before /:id)
customerRouter.get("/search", customer_controller_1.CustomerController.search);
// Statistics (MUST be before /:id)
customerRouter.get("/statistics", customer_controller_1.CustomerController.getStatistics);
// Get customer bookings (MUST be before /:id)
customerRouter.get("/:id/bookings", customer_controller_1.CustomerController.getCustomerBookings);
// Get by ID (MUST be after specific routes)
customerRouter.get("/:id", customer_controller_1.CustomerController.getById);
customerRouter.put("/:id", customer_controller_1.CustomerController.update);
customerRouter.patch("/:id/profile-picture", upload_middleware_1.uploadProfilePicture.single('profile_picture'), customer_controller_1.CustomerController.updateProfilePicture);
customerRouter.delete("/:id/soft", customer_controller_1.CustomerController.softDelete);
customerRouter.delete("/:id", customer_controller_1.CustomerController.delete);
customerRouter.patch("/:id/restore", customer_controller_1.CustomerController.restore);
// Verification
customerRouter.patch("/:id/verify-email", customer_controller_1.CustomerController.verifyEmail);
customerRouter.patch("/:id/verify-phone", customer_controller_1.CustomerController.verifyPhone);
// Loyalty
customerRouter.patch("/:id/loyalty-points", customer_controller_1.CustomerController.updateLoyaltyPoints);
customerRouter.post("/bulk", customer_controller_1.CustomerController.bulkCreate);
customerRouter.post("/bulk_sample", customer_controller_1.CustomerController.bulkCreateSample);
// FCM Token for push notifications
customerRouter.post("/:id/fcm-token", customer_controller_1.CustomerController.updateFcmToken);
customerRouter.delete("/:id/fcm-token", customer_controller_1.CustomerController.removeFcmToken);
exports.default = customerRouter;
