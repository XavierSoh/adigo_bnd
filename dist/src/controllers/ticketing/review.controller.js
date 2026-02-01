"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewController = void 0;
const ticketing_1 = require("../../repository/ticketing");
class ReviewController {
    static async getByEventId(req, res) {
        const eventId = parseInt(req.params.eventId);
        const result = await ticketing_1.ReviewRepository.findByEventId(eventId);
        res.status(result.code).json(result);
    }
    static async getEventStats(req, res) {
        const eventId = parseInt(req.params.eventId);
        const stats = await ticketing_1.ReviewRepository.getEventStats(eventId);
        res.json({ status: true, body: stats, code: 200 });
    }
    static async create(req, res) {
        const result = await ticketing_1.ReviewRepository.create(req.body);
        res.status(result.code).json(result);
    }
    static async update(req, res) {
        const id = parseInt(req.params.id);
        const customerId = parseInt(req.body.customer_id);
        const result = await ticketing_1.ReviewRepository.update(id, customerId, req.body);
        res.status(result.code).json(result);
    }
    static async delete(req, res) {
        const id = parseInt(req.params.id);
        const customerId = parseInt(req.body.customer_id);
        const result = await ticketing_1.ReviewRepository.delete(id, customerId);
        res.status(result.code).json(result);
    }
    static async approve(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.ReviewRepository.approve(id);
        res.status(result.code).json(result);
    }
}
exports.ReviewController = ReviewController;
