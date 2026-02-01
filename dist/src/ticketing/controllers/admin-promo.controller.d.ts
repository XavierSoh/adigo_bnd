/**
 * Admin Promo Codes Controller
 *
 * Manage promotional codes
 */
import { Request, Response } from 'express';
export declare class AdminPromoController {
    /**
     * Create promo code
     * POST /v1/api/ticketing/admin/promo-codes
     */
    static createPromoCode(req: Request, res: Response): Promise<void>;
    /**
     * Get all promo codes
     * GET /v1/api/ticketing/admin/promo-codes
     */
    static getAllPromoCodes(req: Request, res: Response): Promise<void>;
    /**
     * Update promo code
     * PUT /v1/api/ticketing/admin/promo-codes/:id
     */
    static updatePromoCode(req: Request, res: Response): Promise<void>;
    /**
     * Delete promo code
     * DELETE /v1/api/ticketing/admin/promo-codes/:id
     */
    static deletePromoCode(req: Request, res: Response): Promise<void>;
    /**
     * Get promo code usage stats
     * GET /v1/api/ticketing/admin/promo-codes/stats
     */
    static getPromoStats(req: Request, res: Response): Promise<void>;
}
