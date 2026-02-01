"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const ticketing_1 = require("../../repository/ticketing");
class CategoryController {
    static async getAll(req, res) {
        const activeOnly = req.query.active !== 'false';
        const result = await ticketing_1.CategoryRepository.findAll(activeOnly);
        res.status(result.code).json(result);
    }
    static async getById(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.CategoryRepository.findById(id);
        res.status(result.code).json(result);
    }
    static async create(req, res) {
        const result = await ticketing_1.CategoryRepository.create(req.body);
        res.status(result.code).json(result);
    }
    static async update(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.CategoryRepository.update(id, req.body);
        res.status(result.code).json(result);
    }
    static async delete(req, res) {
        const id = parseInt(req.params.id);
        const result = await ticketing_1.CategoryRepository.delete(id);
        res.status(result.code).json(result);
    }
}
exports.CategoryController = CategoryController;
