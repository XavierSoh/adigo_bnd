// src/routes/auth.route.ts
import { Router } from "express"; 
import { UserController } from "../controllers/user.controller";
import { StaffController } from "../controllers/staff.controller";

const usersRouter = Router();

// Authentification
usersRouter.post("/create", UserController.register);
usersRouter.post("/login", UserController.login);


usersRouter.get('/unassociated', StaffController.getStaffWithoutUser);
// Gestion des utilisateurs
usersRouter.get("/:id", UserController.getUserById);
usersRouter.get("/", UserController.getAllUsers);
usersRouter.put("/:id", UserController.updateUser);
usersRouter.delete("/:id/soft", UserController.softDeleteUser);
usersRouter.delete("/:id", UserController.deleteUser);
usersRouter.patch("/:id/restore", UserController.restoreUser);

export default usersRouter;