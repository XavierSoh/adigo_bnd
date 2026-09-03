/**
 * Admin Resales Controller
 *
 * Moderation of ticket resale marketplace
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// AdminResalesRepository (prisma.event_ticket_resale.*), see
// BOOKING_MODULE_NOTES.md ("Full Prisma relational-API migration", tier 3).
import { AdminResalesRepository } from '../repositories/admin-resales.repository';

export class AdminResalesController {

    /**
     * Get all resales
     * GET /v1/api/ticketing/admin/resales
     */
    static async getAllResales(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, status } = req.query;

            const { resales, total } = await AdminResalesRepository.findAll(
                parseInt(limit as string),
                parseInt(offset as string),
                status as string | undefined
            );

            res.status(200).json({
                status: true,
                message: I18n.t('resales_retrieved', lang),
                body: {
                    resales,
                    pagination: {
                        total,
                        limit: parseInt(limit as string),
                        offset: parseInt(offset as string),
                        has_more: parseInt(offset as string) + parseInt(limit as string) < total
                    }
                },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getAllResales:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get resale statistics
     * GET /v1/api/ticketing/admin/resales/stats
     */
    static async getResaleStats(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const stats = await AdminResalesRepository.getStats();

            res.status(200).json({
                status: true,
                message: I18n.t('stats_retrieved', lang),
                body: stats,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getResaleStats:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Approve a resale
     * POST /v1/api/ticketing/admin/resales/:id/approve
     */
    static async approveResale(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const resaleId = parseInt((req.params as { id: string }).id);
            const adminId = req.userId;

            const updatedResale = await AdminResalesRepository.approve(resaleId, adminId);

            res.status(200).json({
                status: true,
                message: I18n.t('resale_approved', lang),
                body: updatedResale,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in approveResale:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Reject/Cancel a resale (fraudulent)
     * POST /v1/api/ticketing/admin/resales/:id/reject
     */
    static async rejectResale(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const resaleId = parseInt((req.params as { id: string }).id);
            const { reason } = req.body;

            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Rejection reason required',
                    code: 400
                });
                return;
            }

            const updatedResale = await AdminResalesRepository.reject(resaleId, reason);

            res.status(200).json({
                status: true,
                message: I18n.t('resale_rejected', lang),
                body: updatedResale,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in rejectResale:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Delete a resale (soft delete)
     * DELETE /v1/api/ticketing/admin/resales/:id
     */
    static async deleteResale(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const resaleId = parseInt((req.params as { id: string }).id);
            const adminId = req.userId;

            const deletedResale = await AdminResalesRepository.softDelete(resaleId, adminId);

            res.status(200).json({
                status: true,
                message: I18n.t('resale_deleted', lang),
                body: deletedResale,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in deleteResale:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
