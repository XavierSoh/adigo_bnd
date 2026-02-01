"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FavoriteController = void 0;
const ticketing_1 = require("../../repository/ticketing");
class FavoriteController {
    static async getMyFavorites(req, res) {
        const customerId = parseInt(req.params.customerId);
        const result = await ticketing_1.FavoriteRepository.findByCustomerId(customerId);
        res.status(result.code).json(result);
    }
    static async add(req, res) {
        const customerId = parseInt(req.body.customer_id);
        const eventId = parseInt(req.params.eventId);
        const result = await ticketing_1.FavoriteRepository.add(customerId, eventId);
        res.status(result.code).json(result);
    }
    static async remove(req, res) {
        const customerId = parseInt(req.body.customer_id);
        const eventId = parseInt(req.params.eventId);
        const result = await ticketing_1.FavoriteRepository.remove(customerId, eventId);
        res.status(result.code).json(result);
    }
    static async toggle(req, res) {
        const customerId = parseInt(req.body.customer_id);
        const eventId = parseInt(req.params.eventId);
        const result = await ticketing_1.FavoriteRepository.toggle(customerId, eventId);
        res.status(result.code).json(result);
    }
    static async check(req, res) {
        const customerId = parseInt(req.query.customer_id);
        const eventId = parseInt(req.params.eventId);
        const isFavorite = await ticketing_1.FavoriteRepository.isFavorite(customerId, eventId);
        res.json({ status: true, body: { is_favorite: isFavorite }, code: 200 });
    }
}
exports.FavoriteController = FavoriteController;
