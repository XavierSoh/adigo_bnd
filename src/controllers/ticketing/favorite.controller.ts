import { Request, Response } from "express";
import { FavoriteRepository } from "../../repository/ticketing";

export class FavoriteController {

    static async getMyFavorites(req: Request, res: Response) {
        const customerId = parseInt(req.params.customerId);
        const result = await FavoriteRepository.findByCustomerId(customerId);
        res.status(result.code).json(result);
    }

    static async add(req: Request, res: Response) {
        const customerId = parseInt(req.body.customer_id);
        const eventId = parseInt(req.params.eventId);
        const result = await FavoriteRepository.add(customerId, eventId);
        res.status(result.code).json(result);
    }

    static async remove(req: Request, res: Response) {
        const customerId = parseInt(req.body.customer_id);
        const eventId = parseInt(req.params.eventId);
        const result = await FavoriteRepository.remove(customerId, eventId);
        res.status(result.code).json(result);
    }

    static async toggle(req: Request, res: Response) {
        const customerId = parseInt(req.body.customer_id);
        const eventId = parseInt(req.params.eventId);
        const result = await FavoriteRepository.toggle(customerId, eventId);
        res.status(result.code).json(result);
    }

    static async check(req: Request, res: Response) {
        const customerId = parseInt(req.query.customer_id as string);
        const eventId = parseInt(req.params.eventId);
        const isFavorite = await FavoriteRepository.isFavorite(customerId, eventId);
        res.json({ status: true, body: { is_favorite: isFavorite }, code: 200 });
    }
}
