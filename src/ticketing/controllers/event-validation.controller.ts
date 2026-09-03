/**
 * Event Validation Controller (Admin ADIGO)
 *
 * Handles event and organizer validation by ADIGO admins
 */

import { Request, Response } from 'express';
import { I18n } from '../../utils/i18n';
// Migrated to Prisma's native model API — logic lives in
// EventValidationRepository, see BOOKING_MODULE_NOTES.md ("Full Prisma
// relational-API migration", tier 3). The old `EventRepository`/
// `EventOrganizerRepository` imports here were dead code — every method
// in this controller always did its own raw SQL directly, never actually
// called them (confirmed via grep before removing).
import { EventValidationRepository } from '../repositories/event-validation.repository';

export class EventValidationController {

    /**
     * Get pending events for validation
     * GET /v1/api/ticketing/admin/events/pending
     */
    static async getPendingEvents(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';

            const events = await EventValidationRepository.getPendingEvents();

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

            const result = await EventValidationRepository.approveEvent(eventId, adminId);

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

            const result = await EventValidationRepository.rejectEvent(eventId, adminId, reason);

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

            const organizers = await EventValidationRepository.getPendingOrganizers();

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

            const result = await EventValidationRepository.verifyOrganizer(organizerId, status, adminId, reason);

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

            const stats = await EventValidationRepository.getEventsStats();

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
