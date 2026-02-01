"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const router = (0, express_1.Router)();
/**
 * GET /dashboard
 * Get dashboard data with statistics, charts, and recent activity
 * Optional query parameter: agencyId (number)
 */
router.get("/", dashboard_controller_1.DashboardController.getDashboardData);
exports.default = router;
