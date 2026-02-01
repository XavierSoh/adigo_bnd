"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventOrganizerController = void 0;
const event_organizer_repository_1 = require("../repositories/event-organizer.repository");
const i18n_1 = require("../../utils/i18n");
class EventOrganizerController {
    // Create organizer profile
    static async create(req, res) {
        try {
            const lang = req.lang || 'en';
            const organizer = req.body;
            const created_by = req.userId; // From auth middleware
            // Validate required fields
            if (!organizer.customer_id || !organizer.organization_name) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('required_fields', lang),
                    code: 400
                });
                return;
            }
            const result = await event_organizer_repository_1.EventOrganizerRepository.create(organizer, created_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('organizer_created', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.create:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get by customer ID
    static async getByCustomerId(req, res) {
        try {
            const lang = req.lang || 'en';
            const customerId = parseInt(req.params.customerId);
            if (isNaN(customerId)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_organizer_repository_1.EventOrganizerRepository.findByCustomerId(customerId);
            if (!result.status) {
                result.message = i18n_1.I18n.t('organizer_not_found', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getByCustomerId:', error);
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
            const result = await event_organizer_repository_1.EventOrganizerRepository.findById(id);
            if (!result.status) {
                result.message = i18n_1.I18n.t('organizer_not_found', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getById:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get all organizers
    static async getAll(req, res) {
        try {
            const { include_deleted } = req.query;
            const result = await event_organizer_repository_1.EventOrganizerRepository.findAll(include_deleted === 'true');
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getAll:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Update organizer
    static async update(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const organizer = req.body;
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            const result = await event_organizer_repository_1.EventOrganizerRepository.update(id, organizer);
            if (result.status) {
                result.message = i18n_1.I18n.t('organizer_updated', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.update:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Update verification status (Admin only)
    static async updateVerificationStatus(req, res) {
        try {
            const lang = req.lang || 'en';
            const id = parseInt(req.params.id);
            const { status, verification_notes } = req.body;
            const verified_by = req.userId; // From auth middleware
            if (isNaN(id)) {
                res.status(400).json({
                    status: false,
                    message: i18n_1.I18n.t('invalid_id', lang),
                    code: 400
                });
                return;
            }
            if (!status || !['pending', 'verified', 'rejected', 'suspended'].includes(status)) {
                res.status(400).json({
                    status: false,
                    message: 'Invalid verification status',
                    code: 400
                });
                return;
            }
            const result = await event_organizer_repository_1.EventOrganizerRepository.updateVerificationStatus(id, status, verified_by, verification_notes);
            if (result.status) {
                result.message = i18n_1.I18n.t('verification_status_updated', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.updateVerificationStatus:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Search organizers
    static async search(req, res) {
        try {
            const { q, verification_status, organization_type } = req.query;
            const filters = {};
            if (q && typeof q === 'string') {
                filters.searchTerm = q;
            }
            if (verification_status && typeof verification_status === 'string') {
                filters.verificationStatus = verification_status;
            }
            if (organization_type && typeof organization_type === 'string') {
                filters.organizationType = organization_type;
            }
            const result = await event_organizer_repository_1.EventOrganizerRepository.search(filters);
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.search:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
    // Get verified organizers
    static async getVerified(req, res) {
        try {
            const result = await event_organizer_repository_1.EventOrganizerRepository.getVerified();
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getVerified:', error);
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
            const result = await event_organizer_repository_1.EventOrganizerRepository.getStatistics();
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.getStatistics:', error);
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
            const result = await event_organizer_repository_1.EventOrganizerRepository.softDelete(id, deleted_by);
            if (result.status) {
                result.message = i18n_1.I18n.t('organizer_deleted', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.softDelete:', error);
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
            const result = await event_organizer_repository_1.EventOrganizerRepository.restore(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('organizer_restored', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.restore:', error);
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
            const result = await event_organizer_repository_1.EventOrganizerRepository.delete(id);
            if (result.status) {
                result.message = i18n_1.I18n.t('organizer_deleted_permanently', lang);
            }
            res.status(result.code).json(result);
        }
        catch (error) {
            const lang = req.lang || 'en';
            console.error('Error in EventOrganizerController.delete:', error);
            res.status(500).json({
                status: false,
                message: i18n_1.I18n.t('server_error', lang),
                code: 500
            });
        }
    }
}
exports.EventOrganizerController = EventOrganizerController;
