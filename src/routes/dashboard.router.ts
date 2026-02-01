import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";

const router = Router();

/**
 * GET /dashboard
 * Get dashboard data with statistics, charts, and recent activity
 * Optional query parameter: agencyId (number)
 */
router.get("/", DashboardController.getDashboardData);

export default router;
