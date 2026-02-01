import { Request, Response } from "express";
export declare class DashboardController {
    /**
     * GET /dashboard
     * Get all dashboard data
     */
    static getDashboardData(req: Request, res: Response): Promise<void>;
}
