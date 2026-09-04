// ============================================
// 4. ROUTER - customer.router.ts
// ============================================
import { Router } from "express";
import { CustomerController } from "../controllers/customer.controller";
import { uploadProfilePicture } from "../middleware/upload.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { adminRoleMiddleware } from "../middleware/admin-role.middleware";

const customerRouter = Router();

// ============================================
// Public (no auth) — login/register/reset are the only routes that
// legitimately need to work before a token exists.
// ============================================
customerRouter.post("/login", CustomerController.login);
customerRouter.post("/login-google", CustomerController.loginWithGoogle);
customerRouter.post("/register", CustomerController.create);
customerRouter.post("/", CustomerController.create); // dup of /register, kept public unchanged

// Password reset (mobile) - email code, no web reset form (no customer-facing
// web frontend exists; the code is entered back through the app itself)
customerRouter.post("/forgot-password", CustomerController.forgotPassword);
customerRouter.post("/reset-password", CustomerController.resetPassword);

// Email verification link (clicked from the welcome email, opened in a browser)
customerRouter.get("/verify-email/:token", CustomerController.verifyEmailToken);

// ============================================
// Authenticated self-service — operate on req.userId, no :id in the URL,
// so there's no ownership check to get wrong.
// ============================================
customerRouter.patch("/change-password", authMiddleware, CustomerController.changePassword);
customerRouter.post("/resend-verification-email", authMiddleware, CustomerController.resendVerificationEmail);

// ============================================
// Staff-only (list/search/bulk/hard-delete/admin bypass) — MUST be
// registered before the /:id routes below.
// ============================================
customerRouter.get("/", authMiddleware, adminRoleMiddleware, CustomerController.getAll);
customerRouter.get("/search", authMiddleware, adminRoleMiddleware, CustomerController.search);
customerRouter.get("/statistics", authMiddleware, adminRoleMiddleware, CustomerController.getStatistics);

// ============================================
// Self-or-staff — authMiddleware + an ownership check inside each
// controller method (isForbidden() in customer.controller.ts).
// ============================================
customerRouter.get("/:id/bookings", authMiddleware, CustomerController.getCustomerBookings);
customerRouter.get("/:id", authMiddleware, CustomerController.getById);
customerRouter.put("/:id", authMiddleware, CustomerController.update);
customerRouter.patch("/:id/profile-picture", authMiddleware, uploadProfilePicture.single('profile_picture'), CustomerController.updateProfilePicture);
customerRouter.delete("/:id/soft", authMiddleware, CustomerController.softDelete);
customerRouter.patch("/:id/restore", authMiddleware, CustomerController.restore);
customerRouter.patch("/:id/verify-phone", authMiddleware, CustomerController.verifyPhone);
customerRouter.post("/:id/fcm-token", authMiddleware, CustomerController.updateFcmToken);
customerRouter.delete("/:id/fcm-token", authMiddleware, CustomerController.removeFcmToken);

// ============================================
// Staff-only (hard delete, id-based verify bypass, loyalty, bulk)
// ============================================
customerRouter.delete("/:id", authMiddleware, adminRoleMiddleware, CustomerController.delete);
customerRouter.patch("/:id/verify-email", authMiddleware, adminRoleMiddleware, CustomerController.verifyEmail);
customerRouter.patch("/:id/loyalty-points", authMiddleware, adminRoleMiddleware, CustomerController.updateLoyaltyPoints);
customerRouter.post("/bulk", authMiddleware, adminRoleMiddleware, CustomerController.bulkCreate);
customerRouter.post("/bulk_sample", authMiddleware, adminRoleMiddleware, CustomerController.bulkCreateSample);

export default customerRouter;
