"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const staff_controller_1 = require("../controllers/staff.controller");
const staffRouter = (0, express_1.Router)();
// Création et récupération du personnel
staffRouter.post("/", staff_controller_1.StaffController.createStaff);
staffRouter.get("/", staff_controller_1.StaffController.getAllStaff);
staffRouter.get("/generateEmployeeId", staff_controller_1.StaffController.getAllStaff);
staffRouter.get("/:id", staff_controller_1.StaffController.getStaffById);
// Mise à jour du personnel
staffRouter.put("/:id", staff_controller_1.StaffController.updateStaff);
staffRouter.patch("/:id/salary-payment", staff_controller_1.StaffController.updateSalaryPayment);
// Suppression et restauration
staffRouter.delete("/:id/soft", staff_controller_1.StaffController.softDeleteStaff);
staffRouter.delete("/:id", staff_controller_1.StaffController.deleteStaff);
staffRouter.patch("/:id/restore", staff_controller_1.StaffController.restoreStaff);
exports.default = staffRouter;
