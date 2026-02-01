import { Request, Response } from "express";
import { CategoryRepository } from "../../repository/ticketing";

export class CategoryController {

    static async getAll(req: Request, res: Response) {
        const activeOnly = req.query.active !== 'false';
        const result = await CategoryRepository.findAll(activeOnly);
        res.status(result.code).json(result);
    }

    static async getById(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await CategoryRepository.findById(id);
        res.status(result.code).json(result);
    }

    static async create(req: Request, res: Response) {
        const result = await CategoryRepository.create(req.body);
        res.status(result.code).json(result);
    }

    static async update(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await CategoryRepository.update(id, req.body);
        res.status(result.code).json(result);
    }

    static async delete(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await CategoryRepository.delete(id);
        res.status(result.code).json(result);
    }
}
