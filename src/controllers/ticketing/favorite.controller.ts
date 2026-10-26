import { Request, Response } from "express";
import { FavoriteRepository } from "../../repository/ticketing/favorite.repository";

// Toutes les routes sont authentifiées : le client est celui du token. Un
// `customer_id` envoyé dans le corps ou l'URL n'est plus jamais cru (il
// permettait de lire ou modifier les favoris de n'importe qui).
export class FavoriteController {

    static async getMyFavorites(req: Request, res: Response) {
        const customerId = parseInt((req.params as { customerId: string }).customerId);
        if (!req.userRole && req.userId !== customerId) {
            res.status(403).json({ status: false, message: "Accès refusé", code: 403 });
            return;
        }
        const response = await FavoriteRepository.findByCustomerId(customerId);
        res.status(response.code).json(response);
    }

    static async check(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const isFavorite = await FavoriteRepository.isFavorite(req.userId!, parseInt(eventId));
        res.status(200).json({ status: true, message: "Statut favori récupéré", body: { is_favorited: isFavorite }, code: 200 });
    }

    static async add(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const response = await FavoriteRepository.add(req.userId!, parseInt(eventId));
        res.status(response.code).json(response);
    }

    static async remove(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const response = await FavoriteRepository.remove(req.userId!, parseInt(eventId));
        res.status(response.code).json(response);
    }

    static async toggle(req: Request, res: Response) {
        const { eventId } = req.params as { eventId: string };
        const response = await FavoriteRepository.toggle(req.userId!, parseInt(eventId));
        res.status(response.code).json(response);
    }
}
