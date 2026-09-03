/**
 * Admin Promo Codes Controller
 *
 * Manage promotional codes
 */

import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminPromoRepository (prisma.promo_code.*), see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 3).
import { AdminPromoRepository } from '../repositories/admin-promo.repository';

export class AdminPromoController {

    /**
     * Create promo code
     * POST /v1/api/ticketing/admin/promo-codes
     */
    static async createPromoCode(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { code, discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount } = req.body;
            const adminId = req.userId;

            if (!code || !discount_type || !discount_value) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            const promoCode = await AdminPromoRepository.create({
                code, discount_type, discount_value, max_uses,
                valid_from: valid_from || undefined, valid_until: valid_until || undefined,
                min_purchase_amount, created_by: adminId,
            });

            res.status(201).json({
                status: true,
                message: I18n.t('promo_code_created', lang),
                body: promoCode,
                code: 201
            });
        } catch (error) {
            const lang = req.lang || 'en';

            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                res.status(400).json({
                    status: false,
                    message: 'Promo code already exists',
                    code: 400
                });
                return;
            }

            console.error('Error in createPromoCode:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get all promo codes
     * GET /v1/api/ticketing/admin/promo-codes
     */
    static async getAllPromoCodes(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { status, include_deleted = 'false' } = req.query;

            const promoCodes = await AdminPromoRepository.findAll(
                status as string | undefined,
                include_deleted === 'true'
            );

            res.status(200).json({
                status: true,
                message: I18n.t('promo_codes_retrieved', lang),
                body: { promo_codes: promoCodes, total: promoCodes.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAllPromoCodes:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Update promo code
     * PUT /v1/api/ticketing/admin/promo-codes/:id
     */
    static async updatePromoCode(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const promoId = parseInt((req.params as { id: string }).id);
            const { discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount, is_active } = req.body;

            const updatedPromo = await AdminPromoRepository.update(promoId, {
                discount_type, discount_value, max_uses, valid_from, valid_until, min_purchase_amount, is_active,
            });

            res.status(200).json({
                status: true,
                message: I18n.t('promo_code_updated', lang),
                body: updatedPromo,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in updatePromoCode:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Delete promo code
     * DELETE /v1/api/ticketing/admin/promo-codes/:id
     */
    static async deletePromoCode(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const promoId = parseInt((req.params as { id: string }).id);
            const adminId = req.userId;

            const deletedPromo = await AdminPromoRepository.softDelete(promoId, adminId);

            res.status(200).json({
                status: true,
                message: I18n.t('promo_code_deleted', lang),
                body: deletedPromo,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in deletePromoCode:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get promo code usage stats
     * GET /v1/api/ticketing/admin/promo-codes/stats
     */
    static async getPromoStats(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const stats = await AdminPromoRepository.getStats();

            res.status(200).json({
                status: true,
                message: I18n.t('stats_retrieved', lang),
                body: stats,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPromoStats:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
