import { Router } from "express"; 
import { StaffController } from "../controllers/staff.controller";

const staffRouter = Router();

// Création et récupération du personnel
staffRouter.post("/", StaffController.createStaff);
staffRouter.get("/", StaffController.getAllStaff);
staffRouter.get("/generateEmployeeId", StaffController.getAllStaff);
staffRouter.get("/:id", StaffController.getStaffById);
// Mise à jour du personnel
staffRouter.put("/:id", StaffController.updateStaff);
staffRouter.patch("/:id/salary-payment", StaffController.updateSalaryPayment);

// Suppression et restauration
staffRouter.delete("/:id/soft", StaffController.softDeleteStaff);
staffRouter.delete("/:id", StaffController.deleteStaff);
staffRouter.patch("/:id/restore", StaffController.restoreStaff);

export default staffRouter;