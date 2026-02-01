import { Request, Response } from "express";
import { EventTicketResaleRepository } from "../repositories/event-ticket-resale.repository";
import {
    EventTicketResaleCreateDto,
    EventTicketResaleUpdateDto,
    EventTicketResalePurchaseDto,
    EventTicketResaleSearchParams
} from "../models/event-ticket-resale.model";
import { I18n } from "../../utils/i18n";

export class EventTicketResaleController {

    // Create resale listing
    static async create(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const data: EventTicketResaleCreateDto = req.body;
            const created_by = (req as any).userId;

            // Validate required fields
            if (!data.ticket_purchase_id || !data.event_id || !data.ticket_type_id ||
                !data.seller_id || !data.resale_price) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            // Validate resale price is positive
            if (data.resale_price <= 0) {
                res.status(400).json({
                    status: false,
                    message: 'Resale price must be greater than 0',
                    code: 400
                });
                return;
            }

            const result = await EventTicketResaleRepository.create(data, created_by);

            if (result.status) {
                result.message = I18n.t('resale_created', lang) || 'Ticket listed for resale successfully';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.create:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get resale by ID
    static async getById(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventTicketResaleRepository.findById(id);

            if (!result.status) {
                result.message = I18n.t('resale_not_found', lang) || 'Resale listing not found';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getById:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get by resale code
    static async getByResaleCode(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const { resaleCode } = req.params;

            const result = await EventTicketResaleRepository.findByResaleCode(resaleCode);

            if (!result.status) {
                result.message = I18n.t('resale_not_found', lang) || 'Resale listing not found';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getByResaleCode:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Search resales
    static async search(req: Request, res: Response): Promise<void> {
        try {
            const {
                event_id,
                seller_id,
                buyer_id,
                status,
                min_price,
                max_price,
                limit,
                offset
            } = req.query;

            const params: EventTicketResaleSearchParams = {};

            if (event_id) {
                params.event_id = parseInt(event_id as string);
            }

            if (seller_id) {
                params.seller_id = parseInt(seller_id as string);
            }

            if (buyer_id) {
                params.buyer_id = parseInt(buyer_id as string);
            }

            if (status && typeof status === 'string') {
                params.status = status as any;
            }

            if (min_price) {
                params.min_price = parseFloat(min_price as string);
            }

            if (max_price) {
                params.max_price = parseFloat(max_price as string);
            }

            if (limit) {
                params.limit = parseInt(limit as string);
            }

            if (offset) {
                params.offset = parseInt(offset as string);
            }

            const result = await EventTicketResaleRepository.search(params);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.search:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get active resales for event
    static async getActiveByEvent(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt(req.params.eventId);

            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventTicketResaleRepository.findActiveByEvent(eventId);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getActiveByEvent:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Purchase resale ticket
    static async purchase(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const purchaseData: EventTicketResalePurchaseDto = req.body;
            const buyer_id = (req as any).userId;

            // Validate required fields
            if (!purchaseData.resale_id || !purchaseData.payment_method) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }

            // Set buyer_id from authenticated user
            purchaseData.buyer_id = buyer_id;

            const result = await EventTicketResaleRepository.purchase(purchaseData);

            if (result.status) {
                result.message = I18n.t('ticket_purchased', lang) || 'Ticket purchased successfully';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.purchase:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Update resale listing
    static async update(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const data: EventTicketResaleUpdateDto = req.body;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            // Validate resale price if provided
            if (data.resale_price !== undefined && data.resale_price <= 0) {
                res.status(400).json({
                    status: false,
                    message: 'Resale price must be greater than 0',
                    code: 400
                });
                return;
            }

            const result = await EventTicketResaleRepository.update(id, data);

            if (result.status) {
                result.message = I18n.t('resale_updated', lang) || 'Resale listing updated successfully';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.update:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Cancel resale listing
    static async cancel(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { cancellation_reason } = req.body;
            const seller_id = (req as any).userId;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventTicketResaleRepository.cancel(
                id,
                seller_id,
                cancellation_reason
            );

            if (result.status) {
                result.message = I18n.t('resale_cancelled', lang) || 'Resale listing cancelled successfully';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.cancel:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Get resale statistics
    static async getStatistics(req: Request, res: Response): Promise<void> {
        try {
            const { event_id } = req.query;
            const eventId = event_id ? parseInt(event_id as string) : undefined;

            const result = await EventTicketResaleRepository.getStatistics(eventId);
            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getStatistics:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }

    // Soft delete
    static async softDelete(req: Request, res: Response): Promise<void> {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const deleted_by = (req as any).userId;

            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }

            const result = await EventTicketResaleRepository.softDelete(id, deleted_by);

            if (result.status) {
                result.message = I18n.t('resale_deleted', lang) || 'Resale listing deleted successfully';
            }

            res.status(result.code).json(result);
        } catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.softDelete:', error);
            res.status(500).json({
                status: false,
                message: I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
