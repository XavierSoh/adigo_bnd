/**
 * Admin Settings Controller
 *
 * System configuration and settings
 */
import { Request, Response } from 'express';
export declare class AdminSettingsController {
    /**
     * Get all system settings
     * GET /v1/api/ticketing/admin/settings
     */
    static getSettings(req: Request, res: Response): Promise<void>;
    /**
     * Update a setting
     * PUT /v1/api/ticketing/admin/settings/:key
     */
    static updateSetting(req: Request, res: Response): Promise<void>;
    /**
     * Get premium pricing settings
     * GET /v1/api/ticketing/admin/settings/pricing
     */
    static getPricing(req: Request, res: Response): Promise<void>;
    /**
     * Update pricing
     * PUT /v1/api/ticketing/admin/settings/pricing
     */
    static updatePricing(req: Request, res: Response): Promise<void>;
}
