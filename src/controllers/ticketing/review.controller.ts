import { Request, Response } from "express";
import { ReviewRepository } from "../../repository/ticketing/review.repository";

export class ReviewController {

    static async getByEventId(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const response = await ReviewRepository.findByEventId(parseInt(eventId));
        res.status(response.code).json(response);
    }

    static async getEventStats(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const stats = await ReviewRepository.getEventStats(parseInt(eventId));
        res.status(200).json({ status: true, message: "Statistiques récupérées", body: stats, code: 200 });
    }

    static async create(req: Request, res: Response) {
        const response = await ReviewRepository.create(req.body);
        res.status(response.code).json(response);
    }

    static async update(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const { customer_id } = req.body as { customer_id: number };
        const response = await ReviewRepository.update(parseInt(id), customer_id, req.body);
        res.status(response.code).json(response);
    }

    static async delete(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const customerId = (req.body?.customer_id ?? req.query.customerId) as string | number;
        const response = await ReviewRepository.delete(parseInt(id), parseInt(customerId as string));
        res.status(response.code).json(response);
    }

    static async approve(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await ReviewRepository.approve(parseInt(id));
        res.status(response.code).json(response);
    }
}
