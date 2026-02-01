// Password reset (mobile)

// ============================================
// 4. ROUTER - customer.router.ts
// ============================================
import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller";
import { uploadProfilePicture } from "../middleware/upload.middleware";

const customerRouter = Router();

// Authentication
customerRouter.post("/login", CustomerController.login);
customerRouter.post("/register", CustomerController.create);

// CRUD routes
customerRouter.post("/", CustomerController.create);
customerRouter.get("/", CustomerController.getAll);

// Search (MUST be before /:id)
customerRouter.get("/search", CustomerController.search);

// Statistics (MUST be before /:id)
customerRouter.get("/statistics", CustomerController.getStatistics);

// Get customer bookings (MUST be before /:id)
customerRouter.get("/:id/bookings", CustomerController.getCustomerBookings);

// Get by ID (MUST be after specific routes)
customerRouter.get("/:id", CustomerController.getById);
customerRouter.put("/:id", CustomerController.update);
customerRouter.patch("/:id/profile-picture", uploadProfilePicture.single('profile_picture'), CustomerController.updateProfilePicture);
customerRouter.delete("/:id/soft", CustomerController.softDelete);
customerRouter.delete("/:id", CustomerController.delete);
customerRouter.patch("/:id/restore", CustomerController.restore);


// Verification
customerRouter.patch("/:id/verify-email", CustomerController.verifyEmail);
customerRouter.patch("/:id/verify-phone", CustomerController.verifyPhone);

// Loyalty
customerRouter.patch("/:id/loyalty-points", CustomerController.updateLoyaltyPoints);
customerRouter.post("/bulk", CustomerController.bulkCreate);
customerRouter.post("/bulk_sample", CustomerController.bulkCreateSample);

// FCM Token for push notifications
customerRouter.post("/:id/fcm-token", CustomerController.updateFcmToken);
customerRouter.delete("/:id/fcm-token", CustomerController.removeFcmToken);

export default customerRouter;