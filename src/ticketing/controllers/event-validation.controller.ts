/**
 * Event Validation Controller (Admin ADIGO)
 *
 * Handles event and organizer validation by ADIGO admins
 */

import { Request, Response } from 'express';
import { EventRepository } from '../repositories/event.repository';
import { EventOrganizerRepository } from '../repositories/event-organizer.repository';
import { I18n } from '../../utils/i18n';
import pgpDb from '../../config/pgdb';

export class EventValidationController {

    /**
     * Get pending events for validation
     * GET /v1/api/ticketing/admin/events/pending
     */
    static async getPendingEvents(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const events = await pgpDb.any(`
                SELECT
                    e.*,
                    json_build_object(
                        'id', o.id,
                        'name', o.name,
                        'email', o.email,
                        'phone', o.phone,
                        'is_verified', o.is_verified
                    ) AS organizer,
                    json_build_object(
                        'id', c.id,
                        'name', c.name,
                        'name_fr', c.name_fr,
                        'name_en', c.name_en
                    ) AS category
                FROM event e
                LEFT JOIN event_organizer o ON e.organizer_id = o.id
                LEFT JOIN event_category c ON e.category_id = c.id
                WHERE e.status = 'pending_validation'
                ORDER BY e.created_at ASC
            `);

            res.status(200).json({
                status: true,
                message: I18n.t('events_retrieved', lang),
                body: { events, total: events.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPendingEvents:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Approve event
     * POST /v1/api/ticketing/admin/events/:id/approve
     */
    static async approveEvent(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt((req.params as { id: string }).id);
            const adminId = (req as any).userId;

            const result = await pgpDb.one(`
                UPDATE event
                SET status = 'published',
                    validation_status = 'approved',
                    validated_by = $2,
                    validation_date = CURRENT_TIMESTAMP,
                    published_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [eventId, adminId]);

            res.status(200).json({
                status: true,
                message: I18n.t('event_approved', lang),
                body: result,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in approveEvent:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Reject event
     * POST /v1/api/ticketing/admin/events/:id/reject
     */
    static async rejectEvent(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt((req.params as { id: string }).id);
            const adminId = (req as any).userId;
            const { reason } = req.body;

            if (!reason) {
                res.status(400).json({
                    status: false,
                    message: 'Rejection reason required',
                    code: 400
                });
                return;
            }

            const result = await pgpDb.one(`
                UPDATE event
                SET status = 'draft',
                    validation_status = 'rejected',
                    validated_by = $2,
                    validation_date = CURRENT_TIMESTAMP,
                    rejection_reason = $3,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [eventId, adminId, reason]);

            res.status(200).json({
                status: true,
                message: I18n.t('event_rejected', lang),
                body: result,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in rejectEvent:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get pending organizers for verification
     * GET /v1/api/ticketing/admin/organizers/pending
     */
    static async getPendingOrganizers(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const organizers = await pgpDb.any(`
                SELECT
                    o.*,
                    json_build_object(
                        'id', c.id,
                        'first_name', c.first_name,
                        'last_name', c.last_name,
                        'email', c.email,
                        'phone', c.phone
                    ) AS customer
                FROM event_organizer o
                LEFT JOIN customer c ON o.customer_id = c.id
                WHERE o.verification_status = 'pending'
                AND o.is_deleted = FALSE
                ORDER BY o.created_at ASC
            `);

            res.status(200).json({
                status: true,
                message: I18n.t('organizers_retrieved', lang),
                body: { organizers, total: organizers.length },
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in getPendingOrganizers:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Verify organizer
     * POST /v1/api/ticketing/admin/organizers/:id/verify
     */
    static async verifyOrganizer(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt((req.params as { id: string }).id);
            const adminId = (req as any).userId;
            const { status, reason } = req.body;

            if (!['verified', 'rejected'].includes(status)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid status. Must be "verified" or "rejected"',
                    code: 400
                });
                return;
            }

            const result = await pgpDb.one(`
                UPDATE event_organizer
                SET verification_status = $2,
                    is_verified = $3,
                    verified_by = $4,
                    verification_date = CURRENT_TIMESTAMP,
                    rejection_reason = $5,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `, [
                organizerId,
                status,
                status === 'verified',
                adminId,
                reason || null
            ]);

            res.status(200).json({
                status: true,
                message: I18n.t('organizer_verified', lang),
                body: result,
                code: 200
            });
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in verifyOrganizer:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    /**
     * Get all events with stats (admin dashboard)
     * GET /v1/api/ticketing/admin/events/stats
     */
    static async getEventsStats(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const stats = await pgpDb.one(`
                SELECT
                    COUNT(*)::int AS total_events,
                    COUNT(*) FILTER (WHERE status = 'pending_validation')::int AS pending_events,
                    COUNT(*) FILTER (WHERE status = 'published')::int AS published_events,
                    COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_events,
                    COALESCE(SUM(total_tickets), 0)::int AS total_tickets_across_all,
                    COALESCE(SUM(sold_tickets), 0)::int AS total_tickets_sold,
                    COUNT(*) FILTER (WHERE has_premium_design = TRUE)::int AS events_with_premium_design,
                    COUNT(*) FILTER (WHERE boost_visibility = TRUE)::int AS events_with_boost
                FROM event
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
            console.error('Error in getEventsStats:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
