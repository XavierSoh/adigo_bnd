import { Request, Response } from "express";
import { ReviewRepository } from "../../repository/ticketing/review.repository";

// Écriture authentifiée : l'auteur d'un avis est toujours le client du
// token (le corps de la requête permettait de publier au nom de n'importe qui).
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
        const { event_id, rating, comment } = (req.body ?? {}) as { event_id?: number; rating?: number; comment?: string };
        const eventId = Number(event_id);
        const value = Number(rating);
        if (!eventId || !Number.isInteger(value) || value < 1 || value > 5) {
            res.status(400).json({ status: false, message: "event_id et une note de 1 à 5 sont requis", code: 400 });
            return;
        }
        const response = await ReviewRepository.create({ event_id: eventId, customer_id: req.userId!, rating: value, comment });
        res.status(response.code).json(response);
    }

    static async update(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await ReviewRepository.update(parseInt(id), req.userId!, req.body ?? {});
        res.status(response.code).json(response);
    }

    static async delete(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await ReviewRepository.delete(parseInt(id), req.userId!);
        res.status(response.code).json(response);
    }

    static async approve(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await ReviewRepository.approve(parseInt(id));
        res.status(response.code).json(response);
    }
}
