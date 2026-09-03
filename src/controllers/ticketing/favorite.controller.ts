import { Request, Response } from "express";
import { FavoriteRepository } from "../../repository/ticketing/favorite.repository";

export class FavoriteController {

    static async getMyFavorites(req: Request, res: Response) {
        const { customerId } = req.params as { customerId: string };
        const response = await FavoriteRepository.findByCustomerId(parseInt(customerId));
        res.status(response.code).json(response);
    }

    static async check(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const { customerId } = req.query as { customerId?: string };

        if (!customerId) {
            return res.status(400).json({ status: false, message: "customerId requis", code: 400 });
        }

        const isFavorite = await FavoriteRepository.isFavorite(parseInt(customerId), parseInt(eventId));
        res.status(200).json({ status: true, message: "Statut favori récupéré", body: { is_favorited: isFavorite }, code: 200 });
    }

    static async add(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const { customer_id } = req.body as { customer_id: number };
        const response = await FavoriteRepository.add(customer_id, parseInt(eventId));
        res.status(response.code).json(response);
    }

    static async remove(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const customerId = (req.body?.customer_id ?? req.query.customerId) as string | number;
        const response = await FavoriteRepository.remove(parseInt(customerId as string), parseInt(eventId));
        res.status(response.code).json(response);
    }

    static async toggle(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const { customer_id } = req.body as { customer_id: number };
        const response = await FavoriteRepository.toggle(customer_id, parseInt(eventId));
        res.status(response.code).json(response);
    }
}
