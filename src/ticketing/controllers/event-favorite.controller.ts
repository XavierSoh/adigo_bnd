import { Request, Response } from "express";
import { EventFavoriteRepository } from "../repositories/event-favorite.repository";
import { EventFavoriteCreateDto } from "../models/event-favorite.model";
import { I18n } from "../../utils/i18n";

export class EventFavoriteController {

    // Create favorite
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const favorite: EventFavoriteCreateDto = req.body;

            // Validate required fields
            if (!favorite.customer_id || !favorite.event_id) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.create(favorite);

            if (result.status) {
                result.message = I18n.t('favorite_added', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.create:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Remove favorite
    static async remove(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);
            const eventId = parseInt((req.params as { eventId: string }).eventId);

            if (isNaN(customerId) || isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.remove(customerId, eventId);

            if (result.status) {
                result.message = I18n.t('favorite_removed', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.remove:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Toggle favorite (add or remove)
    static async toggle(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { customer_id, event_id } = req.body;

            if (!customer_id || !event_id) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.toggle(customer_id, event_id);

            if (result.status) {
                const isFavorited = (result.body as any).is_favorited;
                result.message = I18n.t(
                    isFavorited ? 'favorite_added' : 'favorite_removed',
                    lang
                );
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.toggle:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get favorites by customer
    static async getByCustomer(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.findByCustomer(customerId);

            if (result.status) {
                result.message = I18n.t('favorites_retrieved', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.getByCustomer:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get favorites by event (who favorited this event)
    static async getByEvent(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt((req.params as { eventId: string }).eventId);

            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.findByEvent(eventId);

            if (result.status) {
                result.message = I18n.t('event_favorites_retrieved', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.getByEvent:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Check if event is favorited by customer
    static async isFavorited(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);
            const eventId = parseInt((req.params as { eventId: string }).eventId);

            if (isNaN(customerId) || isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.isFavorited(customerId, eventId);

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.isFavorited:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get favorite count for event
    static async getCountByEvent(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt((req.params as { eventId: string }).eventId);

            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.getCountByEvent(eventId);

            if (result.status) {
                result.message = I18n.t('favorite_count_retrieved', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.getCountByEvent:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get most favorited events
    static async getMostFavorited(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

            if (isNaN(limit) || limit < 1) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid limit parameter',
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.getMostFavorited(limit);

            if (result.status) {
                result.message = I18n.t('most_favorited_events_retrieved', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.getMostFavorited:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get statistics
    static async getStatistics(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined;

            if (customerId !== undefined && isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.getStatistics(customerId);

            if (result.status) {
                result.message = I18n.t('statistics_retrieved', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.getStatistics:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Remove all favorites by customer
    static async removeAllByCustomer(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt((req.params as { customerId: string }).customerId);

            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.removeAllByCustomer(customerId);

            if (result.status) {
                result.message = I18n.t('all_favorites_removed', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.removeAllByCustomer:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Remove all favorites by event (admin only)
    static async removeAllByEvent(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt((req.params as { eventId: string }).eventId);

            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventFavoriteRepository.removeAllByEvent(eventId);

            if (result.status) {
                result.message = I18n.t('all_event_favorites_removed', lang);
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventFavoriteController.removeAllByEvent:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
