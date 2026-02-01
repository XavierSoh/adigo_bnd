"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const event_repository_1 = require("../repositories/event.repository");
const event_ticket_type_repository_1 = require("../repositories/event-ticket-type.repository");
const customer_repository_1 = require("../../repository/customer.repository");
const i18n_1 = require("../../utils/i18n");
const premium_payment_service_1 = require("../services/premium-payment.service");
const premium_design_service_1 = require("../services/premium-design.service");
class EventController {
    // Create event
    static async create(req, res) {
        try {
            const lang = req.lang || 'en';
            const event = req.body;
            const created_by = req.userId; // From auth middleware
            // Validate required fields
            if (!event.title || !event.category_id || !event.organizer_id ||
                !event.event_date || !event.venue_name || !event.city) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.create(event, created_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_created', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.create:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by ID
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
            const result = await event_repository_1.EventRepository.findById(id);
            if (!result.status) {
                result.message = i18n_1.I18n.t('event_not_found', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getById:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by event code
    static async getByEventCode(req, res) {
        try {
            const lang = req.lang || 'en';
            const { eventCode } = req.params;
            const result = await event_repository_1.EventRepository.findByEventCode(eventCode);
            if (!result.status) {
                result.message = i18n_1.I18n.t('event_not_found', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getByEventCode:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get all events
    static async getAll(req, res) {
        try {
            const { include_deleted } = req.query;
            const result = await event_repository_1.EventRepository.findAll(include_deleted === 'true');
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getAll:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by organizer
    static async getByOrganizer(req, res) {
        try {
            const lang = req.lang || 'en';
            const organizerId = parseInt(req.params.organizerId);
            if (isNaN(organizerId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.findByOrganizer(organizerId);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getByOrganizer:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by category
    static async getByCategory(req, res) {
        try {
            const lang = req.lang || 'en';
            const categoryId = parseInt(req.params.categoryId);
            if (isNaN(categoryId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.findByCategory(categoryId);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getByCategory:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Update event
    static async update(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const event = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.update(id, event);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_updated', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.update:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Publish event (with premium services payment via wallet)
    static async publish(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const premiumServicesData = req.body;
            const organizerId = req.userId;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            // Get event and organizer info
            const eventResult = await event_repository_1.EventRepository.findById(id);
            if (!eventResult.status) {
                res.status(404).json(eventResult);
                return;
            }
            const event = eventResult.body;
            const customerId = event.organizer?.customer_id;
            if (!customerId) {
                res.status(400).json({
                    status: false,
                    message: 'Organizer customer not found',
                    code: 400
                });
                return;
            }
            // MANDATORY: Check premium design requirement
            const designValidation = await premium_design_service_1.PremiumDesignService.validateDesignRequirement(id);
            if (!designValidation.canPublish) {
                res.status(400).json({
                    status: false,
                    message: designValidation.message || 'Premium design payment required before publishing',
                    body: {
                        required_amount: designValidation.amount,
                        design_paid: designValidation.paid
                    },
                    code: 400
                });
                return;
            }
            // Build premium services request
            const request = {
                eventId: id,
                customerId: customerId,
                designRequired: true,
                // Visibility boost (optional)
                boostHomepage: premiumServicesData.boostHomepage || false,
                boostCategory: premiumServicesData.boostCategory || false,
                boostDurationDays: premiumServicesData.boostDurationDays || undefined,
                // Field service (optional)
                fieldServiceAgents: premiumServicesData.fieldServiceAgents || undefined,
                fieldServiceScanners: premiumServicesData.fieldServiceScanners || undefined,
                fieldServiceDays: premiumServicesData.fieldServiceDays || 1,
                // Marketing (optional)
                marketingPosterBasic: premiumServicesData.marketingPosterBasic || false,
                marketingPosterPremium: premiumServicesData.marketingPosterPremium || false,
                marketingAdsEnabled: premiumServicesData.marketingAdsEnabled || false,
                marketingAdsBudget: premiumServicesData.marketingAdsBudget || undefined,
                // SMS (optional)
                smsNotifications: premiumServicesData.smsNotifications || undefined
            };
            // Calculate total cost
            const breakdown = await premium_payment_service_1.PremiumPaymentService.calculateTotalCost(request);
            // Check wallet balance
            const balanceCheck = await customer_repository_1.CustomerRepository.getWalletBalance(customerId);
            if (!balanceCheck.status) {
                res.status(balanceCheck.code).json(balanceCheck);
                return;
            }
            const currentBalance = balanceCheck.body.balance || 0;
            if (currentBalance < breakdown.total) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('insufficient_wallet_balance', lang),
                    body: {
                        required: breakdown.total,
                        current_balance: currentBalance,
                        breakdown: breakdown
                    },
                    code: 400
                });
                return;
            }
            // Process payment
            const payment = await premium_payment_service_1.PremiumPaymentService.processWalletPayment(customerId, breakdown.total, `Premium services for event ${event.event_code}`, id);
            if (!payment.success) {
                res.status(400).json({
                    status: false,
                    message: payment.error || 'Payment failed',
                    code: 400
                });
                return;
            }
            // Apply all premium services to event
            const servicesApplied = await premium_payment_service_1.PremiumPaymentService.applyPremiumServices(request, breakdown);
            if (!servicesApplied) {
                // Rollback payment if services application failed
                // (In production, implement proper transaction rollback)
                console.error('❌ Failed to apply premium services after payment');
            }
            // Publish event
            const publishData = {
                has_premium_design: true,
                premium_design_amount: breakdown.design
            };
            const result = await event_repository_1.EventRepository.publish(id, publishData);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_published', lang);
                result.body = {
                    ...result.body,
                    premium_services: breakdown
                };
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.publish:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Approve event (Admin only)
    static async approve(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { validation_notes } = req.body;
            const validated_by = req.userId;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.approve(id, validated_by, validation_notes);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_approved', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.approve:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Reject event (Admin only)
    static async reject(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { validation_notes } = req.body;
            const validated_by = req.userId;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            if (!validation_notes) {
                res.status(400).json({
                    status: false,
                    message: 'Rejection reason is required',
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.reject(id, validated_by, validation_notes);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_rejected', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.reject:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Cancel event
    static async cancel(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { cancellation_reason } = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            if (!cancellation_reason) {
                res.status(400).json({
                    status: false,
                    message: 'Cancellation reason is required',
                    code: 400
                });
                return;
            }
            const result = await event_repository_1.EventRepository.cancel(id, cancellation_reason);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_cancelled', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.cancel:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Search events
    static async search(req, res) {
        try {
            const { q, category_id, city, status, start_date, end_date, min_price, max_price, organizer_id, has_available_tickets, is_featured, sort_by, sort_order, limit, offset } = req.query;
            const params = {};
            if (q && typeof q === 'string') {
                params.searchTerm = q;
            }
            if (category_id) {
                params.categoryId = parseInt(category_id);
            }
            if (city && typeof city === 'string') {
                params.city = city;
            }
            if (status && typeof status === 'string') {
                params.status = status;
            }
            if (start_date) {
                params.startDate = new Date(start_date);
            }
            if (end_date) {
                params.endDate = new Date(end_date);
            }
            if (min_price) {
                params.minPrice = parseFloat(min_price);
            }
            if (max_price) {
                params.maxPrice = parseFloat(max_price);
            }
            if (organizer_id) {
                params.organizerId = parseInt(organizer_id);
            }
            if (has_available_tickets !== undefined) {
                params.hasAvailableTickets = has_available_tickets === 'true';
            }
            if (is_featured !== undefined) {
                params.isFeatured = is_featured === 'true';
            }
            if (sort_by && typeof sort_by === 'string') {
                params.sortBy = sort_by;
            }
            if (sort_order && typeof sort_order === 'string') {
                params.sortOrder = sort_order;
            }
            if (limit) {
                params.limit = parseInt(limit);
            }
            if (offset) {
                params.offset = parseInt(offset);
            }
            const result = await event_repository_1.EventRepository.search(params);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.search:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get upcoming events
    static async getUpcoming(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 10;
            const result = await event_repository_1.EventRepository.getUpcoming(limitNum);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getUpcoming:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get past events
    static async getPast(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 10;
            const result = await event_repository_1.EventRepository.getPast(limitNum);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getPast:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get featured events
    static async getFeatured(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 5;
            const result = await event_repository_1.EventRepository.getFeatured(limitNum);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getFeatured:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get popular events
    static async getPopular(req, res) {
        try {
            const { limit } = req.query;
            const limitNum = limit ? parseInt(limit) : 10;
            const result = await event_repository_1.EventRepository.getPopular(limitNum);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getPopular:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get statistics
    static async getStatistics(req, res) {
        try {
            const { organizer_id } = req.query;
            const organizerId = organizer_id ? parseInt(organizer_id) : undefined;
            const result = await event_repository_1.EventRepository.getStatistics(organizerId);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getStatistics:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get event with ticket types
    static async getEventWithTickets(req, res) {
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
            const eventResult = await event_repository_1.EventRepository.findById(id);
            if (!eventResult.status) {
                res.status(eventResult.code).json(eventResult);
                return;
            }
            const ticketTypesResult = await event_ticket_type_repository_1.EventTicketTypeRepository.findByEventId(id, true);
            res.status(200).json({
                status: true,
                message: 'Event with ticket types retrieved',
                body: {
                    event: eventResult.body,
                    ticket_types: ticketTypesResult.body
                },
                code: 200
            });
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.getEventWithTickets:', error);
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
            const result = await event_repository_1.EventRepository.softDelete(id, deleted_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_deleted', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.softDelete:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Restore
    static async restore(req, res) {
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
            const result = await event_repository_1.EventRepository.restore(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_restored', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.restore:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Hard delete
    static async delete(req, res) {
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
            const result = await event_repository_1.EventRepository.delete(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('event_deleted_permanently', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventController.delete:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.EventController = EventController;
