import { Request, Response } from "express";
import { OrganizerRepository } from "../../repository/ticketing/organizer.repository";

// Routes historiques /organizers, réservées aux admins (routes/ticketing/index.ts).
// Création, modification et suppression passent par AdminManagementController.
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

    static async verify(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await OrganizerRepository.verify(parseInt(id), req.userId);
        res.status(response.code).json(response);
    }
}
