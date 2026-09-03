import { Request, Response } from "express";
import { CategoryRepository } from "../../repository/ticketing/category.repository";

export class CategoryController {

    static async getAll(req: Request, res: Response) {
        const { activeOnly } = req.query as { activeOnly?: string };
        const response = await CategoryRepository.findAll(activeOnly !== 'false');
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await CategoryRepository.findById(parseInt(id));
        res.status(response.code).json(response);
    }

    static async create(req: Request, res: Response) {
        const response = await CategoryRepository.create(req.body);
        res.status(response.code).json(response);
    }

    static async update(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await CategoryRepository.update(parseInt(id), req.body);
        res.status(response.code).json(response);
    }

    static async delete(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await CategoryRepository.delete(parseInt(id));
        res.status(response.code).json(response);
    }
}
