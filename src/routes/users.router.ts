// src/routes/auth.route.ts
import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { StaffController } from "../controllers/staff.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const usersRouter = Router();

// _ Public routes (no auth required)
usersRouter.post("/create", UserController.register);
usersRouter.post("/login", UserController.login);

// _ Protected routes (JWT required)
usersRouter.use(authMiddleware);

usersRouter.get('/unassociated', StaffController.getStaffWithoutUser);
usersRouter.get("/:id", UserController.getUserById);
usersRouter.get("/", UserController.getAllUsers);
usersRouter.put("/:id", UserController.updateUser);
usersRouter.delete("/:id/soft", UserController.softDeleteUser);
usersRouter.delete("/:id", UserController.deleteUser);
usersRouter.patch("/:id/restore", UserController.restoreUser);

export default usersRouter;