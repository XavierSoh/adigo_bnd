import { Request, Response } from "express";
/**
 * Controller for managing company settings
 */
export declare class CompanySettingsController {
    /**
     * GET /company-settings
     * Get the company settings (singleton - always returns one record)
     */
    static getSettings(req: Request, res: Response): Promise<void>;
    /**
     * PUT /company-settings
     * Update company settings
     * Admin-only route (should be protected by middleware)
     */
    static updateSettings(req: Request, res: Response): Promise<void>;
}
