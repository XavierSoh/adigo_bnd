import { Request, Response } from 'express';
export declare class TierController {
    /**
     * Get all tier configurations
     */
    static getTierConfigs(req: Request, res: Response): Promise<void>;
    /**
     * Get customer's current tier and progress to next tier
     */
    static getCustomerTierProgress(req: Request, res: Response): Promise<void>;
    /**
     * Manually recalculate customer tier (admin/debug endpoint)
     */
    static recalculateCustomerTier(req: Request, res: Response): Promise<void>;
}
