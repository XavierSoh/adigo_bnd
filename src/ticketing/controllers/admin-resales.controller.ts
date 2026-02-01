/**
 * Admin Resales Controller
 *
 * Moderation of ticket resale marketplace
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
import pgpDb from '../../config/pgdb';

export class AdminResalesController {

    /**
     * Get all resales
     * GET /v1/api/ticketing/admin/resales
     */
    static async getAllResales(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { limit = 50, offset = 0, status } = req.query;

            let query = `
                SELECT
                    etr.*,
                    json_build_object(
                        'id', et.id,
                        'reference', et.reference,
                        'original_price', et.total_price
                    ) AS ticket,
                    json_build_object(
                        'id', e.id,
                        'title', e.title,
                        'event_code', e.event_code
                    ) AS event,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email
                    ) AS seller
                FROM event_ticket_resale etr
                JOIN event_ticket et ON etr.ticket_purchase_id = et.id
                JOIN event e ON et.event_id = e.id
                JOIN customer c ON etr.seller_id = c.id
                WHERE etr.is_deleted = FALSE
            `;

            const params: any[] = [];

            if (status) {
                params.push(status);
                query += ` AND etr.status = $${params.length}`;
            }

            query += ` ORDER BY etr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(parseInt(limit as string), parseInt(offset as string));

            const resales = await pgpDb.any(query, params);

            // Get total count
            let countQuery = `SELECT COUNT(*)::int AS total FROM event_ticket_resale WHERE is_deleted = FALSE`;
            const countParams: any[] = [];

            if (status) {
                countParams.push(status);
                countQuery += ` AND status = $${countParams.length}`;
            }

            const { total } = await pgpDb.one(countQuery, countParams);

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

            const stats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_resales,
                    COUNT(*) FILTER (WHERE status = 'available')::int AS available_resales,
                    COUNT(*) FILTER (WHERE status = 'sold')::int AS sold_resales,
                    COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_resales,
                    COUNT(*) FILTER (WHERE status = 'expired')::int AS expired_resales,
                    COALESCE(AVG(resale_price), 0)::int AS average_resale_price,
                    COALESCE(SUM(resale_price) FILTER (WHERE status = 'sold'), 0)::int AS total_resale_revenue
                FROM event_ticket_resale
                WHERE is_deleted = FALSE
            `);

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

            const updatedResale = await pgpDb.one(`
                UPDATE event_ticket_resale
                SET status = 'available', approved_by = $2, approved_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [resaleId, adminId]);

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
            const adminId = req.userId;

            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Rejection reason required',
                    code: 400
                });
                return;
            }

            const updatedResale = await pgpDb.one(`
                UPDATE event_ticket_resale
                SET status = 'cancelled', cancellation_reason = $2, cancelled_by = $3, cancelled_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [resaleId, reason, adminId]);

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
            const { reason } = req.body;
            const adminId = req.userId;

            const deletedResale = await pgpDb.one(`
                UPDATE event_ticket_resale
                SET is_deleted = TRUE, deleted_at = CURRENT_TIMESTAMP, deleted_by = $2, deletion_reason = $3
                WHERE id = $1
                RETURNING *
            `, [resaleId, adminId, reason || 'Deleted by admin']);

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
