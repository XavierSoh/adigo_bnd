"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventController = void 0;
const ticketing_1 = require("../../repository/ticketing");
class EventController {
    static async getAll(req, res) {
        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const result = await ticketing_1.EventRepository.findAll(limit, offset);
        res.status(result.code).json(result);
    }
    static async getById(req, res) {
        const id = parseInt(req.params.id);
        await ticketing_1.EventRepository.incrementViews(id);
        const result = await ticketing_1.EventRepository.findById(id);
        res.status(result.code).json(result);
    }
    static async getByCode(req, res) {
        const code = req.params.code;
        const result = await ticketing_1.EventRepository.findByCode(code);
        res.status(result.code).json(result);
    }
    static async search(req, res) {
        const params = {
            search: req.query.search,
            category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
            city: req.query.city,
            status: req.query.status,
            organizer_id: req.query.organizer_id ? parseInt(req.query.organizer_id) : undefined,
            is_featured: req.query.featured === 'true',
            limit: parseInt(req.query.limit) || 20,
            offset: parseInt(req.query.offset) || 0,
        };
        const result = await ticketing_1.EventRepository.search(params);
        res.status(result.code).json(result);
    }
    static async create(req, res) {
        const result = await ticketing_1.EventRepository.create(req.body);
        res.status(result.code).json(result);
    }
    static async update(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.EventRepository.update(id, req.body);
        res.status(result.code).json(result);
    }
    static async publish(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.EventRepository.updateStatus(id, 'pending');
        res.status(result.code).json(result);
    }
    static async approve(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.EventRepository.updateStatus(id, 'published');
        res.status(result.code).json(result);
    }
    static async cancel(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.EventRepository.updateStatus(id, 'cancelled');
        res.status(result.code).json(result);
    }
    static async delete(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.EventRepository.delete(id);
        res.status(result.code).json(result);
    }
    // Ticket Types for event
    static async getTicketTypes(req, res) {
        const eventId = parseInt(req.params.id);
        const result = await ticketing_1.TicketTypeRepository.findByEventId(eventId);
        res.status(result.code).json(result);
    }
    static async createTicketType(req, res) {
        const eventId = parseInt(req.params.id);
        const result = await ticketing_1.TicketTypeRepository.create({ ...req.body, event_id: eventId });
        res.status(result.code).json(result);
    }
    static async updateTicketType(req, res) {
        const typeId = parseInt(req.params.typeId);
        const result = await ticketing_1.TicketTypeRepository.update(typeId, req.body);
        res.status(result.code).json(result);
    }
    static async deleteTicketType(req, res) {
        const typeId = parseInt(req.params.typeId);
        const result = await ticketing_1.TicketTypeRepository.delete(typeId);
        res.status(result.code).json(result);
    }
}
exports.EventController = EventController;
