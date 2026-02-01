"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizerController = void 0;
const ticketing_1 = require("../../repository/ticketing");
class OrganizerController {
    static async getAll(req, res) {
        const result = await ticketing_1.OrganizerRepository.findAll();
        res.status(result.code).json(result);
    }
    static async getById(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.OrganizerRepository.findById(id);
        res.status(result.code).json(result);
    }
    static async getByCustomerId(req, res) {
        const customerId = parseInt(req.params.customerId);
        const result = await ticketing_1.OrganizerRepository.findByCustomerId(customerId);
        res.status(result.code).json(result);
    }
    static async create(req, res) {
        const result = await ticketing_1.OrganizerRepository.create(req.body);
        res.status(result.code).json(result);
    }
    static async update(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.OrganizerRepository.update(id, req.body);
        res.status(result.code).json(result);
    }
    static async verify(req, res) {
        const id = parseInt(req.params.id);
        const verifiedBy = req.body.verified_by || 1; // TODO: get from auth
        const result = await ticketing_1.OrganizerRepository.verify(id, verifiedBy);
        res.status(result.code).json(result);
    }
    static async delete(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.OrganizerRepository.delete(id);
        res.status(result.code).json(result);
    }
}
exports.OrganizerController = OrganizerController;
