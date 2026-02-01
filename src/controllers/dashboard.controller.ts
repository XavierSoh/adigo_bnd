import { Request, Response } from "express";
import { DashboardRepository } from "../repository/dashboard.repository";

export class DashboardController {

    /**
     * GET /dashboard
     * Get all dashboard data
     */
    static async getDashboardData(req: Request, res: Response) {
        try {
            const agencyId = req.query.agencyId ? parseInt(req.query.agencyId as string) : undefined;

            const response = await DashboardRepository.getDashboardData(agencyId);
            res.status(response.code || 500).json(response);
        } catch (error) {
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
