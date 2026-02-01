"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.route.ts
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const staff_controller_1 = require("../controllers/staff.controller");
const usersRouter = (0, express_1.Router)();
// Authentification
usersRouter.post("/create", user_controller_1.UserController.register);
usersRouter.post("/login", user_controller_1.UserController.login);
usersRouter.get('/unassociated', staff_controller_1.StaffController.getStaffWithoutUser);
// Gestion des utilisateurs
usersRouter.get("/:id", user_controller_1.UserController.getUserById);
usersRouter.get("/", user_controller_1.UserController.getAllUsers);
usersRouter.put("/:id", user_controller_1.UserController.updateUser);
usersRouter.delete("/:id/soft", user_controller_1.UserController.softDeleteUser);
usersRouter.delete("/:id", user_controller_1.UserController.deleteUser);
usersRouter.patch("/:id/restore", user_controller_1.UserController.restoreUser);
exports.default = usersRouter;
