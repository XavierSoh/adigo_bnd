import { Request, Response } from "express";
import { ReviewRepository } from "../../repository/ticketing";

export class ReviewController {

    static async getByEventId(req: Request, res: Response) {
        const eventId = parseInt((req.params as { eventId: string }).eventId);
        const result = await ReviewRepository.findByEventId(eventId);
        res.status(result.code).json(result);
    }

    static async getEventStats(req: Request, res: Response) {
        const eventId = parseInt((req.params as { eventId: string }).eventId);
        const stats = await ReviewRepository.getEventStats(eventId);
        res.json({ status: true, body: stats, code: 200 });
    }

    static async create(req: Request, res: Response) {
        const result = await ReviewRepository.create(req.body);
        res.status(result.code).json(result);
    }

    static async update(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const customerId = parseInt(req.body.customer_id);
        const result = await ReviewRepository.update(id, customerId, req.body);
        res.status(result.code).json(result);
    }

    static async delete(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const customerId = parseInt(req.body.customer_id);
        const result = await ReviewRepository.delete(id, customerId);
        res.status(result.code).json(result);
    }

    static async approve(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const result = await ReviewRepository.approve(id);
        res.status(result.code).json(result);
    }
}
