"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const dashboard_repository_1 = require("../repository/dashboard.repository");
class DashboardController {
    /**
     * GET /dashboard
     * Get all dashboard data
     */
    static async getDashboardData(req, res) {
        try {
            const agencyId = req.query.agencyId ? parseInt(req.query.agencyId) : undefined;
            const response = await dashboard_repository_1.DashboardRepository.getDashboardData(agencyId);
            res.status(response.code || 500).json(response);
        }
        catch (error) {
            console.error('Dashboard get error:', error);
            res.status(500).json({
                status: false,
                message: 'Error retrieving dashboard data',
                exception: error instanceof Error ? error.message : error,
                code: 500
            });
        }
    }
}
exports.DashboardController = DashboardController;
