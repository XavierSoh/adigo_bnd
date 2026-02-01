import { Request, Response } from "express";
import { OrganizerRepository } from "../../repository/ticketing";

export class OrganizerController {

    static async getAll(req: Request, res: Response) {
        const result = await OrganizerRepository.findAll();
        res.status(result.code).json(result);
    }

    static async getById(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await OrganizerRepository.findById(id);
        res.status(result.code).json(result);
    }

    static async getByCustomerId(req: Request, res: Response) {
        const customerId = parseInt(req.params.customerId);
        const result = await OrganizerRepository.findByCustomerId(customerId);
        res.status(result.code).json(result);
    }

    static async create(req: Request, res: Response) {
        const result = await OrganizerRepository.create(req.body);
        res.status(result.code).json(result);
    }

    static async update(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await OrganizerRepository.update(id, req.body);
        res.status(result.code).json(result);
    }

    static async verify(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const verifiedBy = req.body.verified_by || 1; // TODO: get from auth
        const result = await OrganizerRepository.verify(id, verifiedBy);
        res.status(result.code).json(result);
    }

    static async delete(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        const result = await OrganizerRepository.delete(id);
        res.status(result.code).json(result);
    }
}
