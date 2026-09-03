import { Request, Response } from "express";
import { OrganizerRepository } from "../../repository/ticketing/organizer.repository";

export class OrganizerController {

    static async getAll(req: Request, res: Response) {
        const response = await OrganizerRepository.findAll();
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await OrganizerRepository.findById(parseInt(id));
        res.status(response.code).json(response);
    }

    static async getByCustomerId(req: Request, res: Response) {
        const { customerId } = req.params as { customerId: string };
        const response = await OrganizerRepository.findByCustomerId(parseInt(customerId));
        res.status(response.code).json(response);
    }

    static async create(req: Request, res: Response) {
        const response = await OrganizerRepository.create(req.body);
        res.status(response.code).json(response);
    }

    static async update(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await OrganizerRepository.update(parseInt(id), req.body);
        res.status(response.code).json(response);
    }

    static async verify(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { verified_by } = req.body as { verified_by: number };
        const response = await OrganizerRepository.verify(parseInt(id), verified_by);
        res.status(response.code).json(response);
    }

    static async delete(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await OrganizerRepository.delete(parseInt(id));
        res.status(response.code).json(response);
    }
}
