"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventTicketResaleController = void 0;
const event_ticket_resale_repository_1 = require("../repositories/event-ticket-resale.repository");
const i18n_1 = require("../../utils/i18n");
class EventTicketResaleController {
    // Create resale listing
    static async create(req, res) {
        try {
            const lang = req.lang || 'en';
            const data = req.body;
            const created_by = req.userId;
            // Validate required fields
            if (!data.ticket_purchase_id || !data.event_id || !data.ticket_type_id ||
                !data.seller_id || !data.resale_price) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('required_fields', lang),
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
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.create(data, created_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('resale_created', lang) || 'Ticket listed for resale successfully';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.create:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get resale by ID
    static async getById(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.findById(id);
            if (!result.status) {
                result.message = i18n_1.I18n.t('resale_not_found', lang) || 'Resale listing not found';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getById:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by resale code
    static async getByResaleCode(req, res) {
        try {
            const lang = req.lang || 'en';
            const { resaleCode } = req.params;
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.findByResaleCode(resaleCode);
            if (!result.status) {
                result.message = i18n_1.I18n.t('resale_not_found', lang) || 'Resale listing not found';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getByResaleCode:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Search resales
    static async search(req, res) {
        try {
            const { event_id, seller_id, buyer_id, status, min_price, max_price, limit, offset } = req.query;
            const params = {};
            if (event_id) {
                params.event_id = parseInt(event_id);
            }
            if (seller_id) {
                params.seller_id = parseInt(seller_id);
            }
            if (buyer_id) {
                params.buyer_id = parseInt(buyer_id);
            }
            if (status && typeof status === 'string') {
                params.status = status;
            }
            if (min_price) {
                params.min_price = parseFloat(min_price);
            }
            if (max_price) {
                params.max_price = parseFloat(max_price);
            }
            if (limit) {
                params.limit = parseInt(limit);
            }
            if (offset) {
                params.offset = parseInt(offset);
            }
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.search(params);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.search:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get active resales for event
    static async getActiveByEvent(req, res) {
        try {
            const lang = req.lang || 'en';
            const eventId = parseInt(req.params.eventId);
            if (isNaN(eventId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.findActiveByEvent(eventId);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getActiveByEvent:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Purchase resale ticket
    static async purchase(req, res) {
        try {
            const lang = req.lang || 'en';
            const purchaseData = req.body;
            const buyer_id = req.userId;
            // Validate required fields
            if (!purchaseData.resale_id || !purchaseData.payment_method) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }
            // Set buyer_id from authenticated user
            purchaseData.buyer_id = buyer_id;
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.purchase(purchaseData);
            if (result.status) {
                result.message = i18n_1.I18n.t('ticket_purchased', lang) || 'Ticket purchased successfully';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.purchase:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Update resale listing
    static async update(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const data = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
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
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.update(id, data);
            if (result.status) {
                result.message = i18n_1.I18n.t('resale_updated', lang) || 'Resale listing updated successfully';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.update:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Cancel resale listing
    static async cancel(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { cancellation_reason } = req.body;
            const seller_id = req.userId;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.cancel(id, seller_id, cancellation_reason);
            if (result.status) {
                result.message = i18n_1.I18n.t('resale_cancelled', lang) || 'Resale listing cancelled successfully';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.cancel:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get resale statistics
    static async getStatistics(req, res) {
        try {
            const { event_id } = req.query;
            const eventId = event_id ? parseInt(event_id) : undefined;
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.getStatistics(eventId);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.getStatistics:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Soft delete
    static async softDelete(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const deleted_by = req.userId;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_ticket_resale_repository_1.EventTicketResaleRepository.softDelete(id, deleted_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('resale_deleted', lang) || 'Resale listing deleted successfully';
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventTicketResaleController.softDelete:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.EventTicketResaleController = EventTicketResaleController;
