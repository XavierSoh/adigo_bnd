import { Request, Response } from "express";
import { EventRepository } from "../../repository/ticketing/event.repository";
import { TicketTypeRepository } from "../../repository/ticketing/ticket-type.repository";
import { EventSearchParams } from "../../models/ticketing";

export class EventController {

    static async getAll(req: Request, res: Response) {
        const { limit, offset } = req.query as { limit?: string; offset?: string };
        const response = await EventRepository.findAll(
            limit ? parseInt(limit) : undefined,
            offset ? parseInt(offset) : undefined
        );
        res.status(response.code).json(response);
    }

    static async search(req: Request, res: Response) {
        const {
            search, category_id, city, status, organizer_id,
            is_featured, start_date, end_date, limit, offset
        } = req.query as Record<string, string | undefined>;

        const params: EventSearchParams = {
            search,
            category_id: category_id ? parseInt(category_id) : undefined,
            city,
            status: status as EventSearchParams['status'],
            organizer_id: organizer_id ? parseInt(organizer_id) : undefined,
            is_featured: is_featured === 'true',
            start_date: start_date ? new Date(start_date) : undefined,
            end_date: end_date ? new Date(end_date) : undefined,
            limit: limit ? parseInt(limit) : undefined,
            offset: offset ? parseInt(offset) : undefined
        };

        const response = await EventRepository.search(params);
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await EventRepository.findById(parseInt(id));
        if (response.status) {
            EventRepository.incrementViews(parseInt(id)).catch(() => {});
        }
        res.status(response.code).json(response);
    }

    static async getByCode(req: Request, res: Response) {
        const { code } = req.params as { code: string };
        const response = await EventRepository.findByCode(code);
        res.status(response.code).json(response);
    }

    static async create(req: Request, res: Response) {
        const response = await EventRepository.create(req.body);
        res.status(response.code).json(response);
    }

    static async update(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await EventRepository.update(parseInt(id), req.body);
        res.status(response.code).json(response);
    }

    // Neither of these publishes directly anymore — organizers submit for
    // admin validation; only EventValidationController.approveEvent (the
    // real admin-gated route, under /admin/events/:id/approve) sets
    // status='published'. Both kept (rather than removed) so any existing
    // caller of either route keeps working, just without the ability to
    // self-approve.
    static async publish(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await EventRepository.submitForValidation(parseInt(id));
        res.status(response.code).json(response);
    }

    static async approve(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await EventRepository.submitForValidation(parseInt(id));
        res.status(response.code).json(response);
    }

    static async cancel(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await EventRepository.updateStatus(parseInt(id), 'cancelled');
        res.status(response.code).json(response);
    }

    static async delete(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await EventRepository.delete(parseInt(id));
        res.status(response.code).json(response);
    }

    // Ticket types (nested under an event)

    static async getTicketTypes(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketTypeRepository.findByEventId(parseInt(id));
        res.status(response.code).json(response);
    }

    static async createTicketType(req: Request, res: Response) {
        const { id } = req.params as { id: string };
        const response = await TicketTypeRepository.create({ ...req.body, event_id: parseInt(id) });
        res.status(response.code).json(response);
    }

    static async updateTicketType(req: Request, res: Response) {
        const { typeId } = req.params as { id: string; typeId: string };
        const response = await TicketTypeRepository.update(parseInt(typeId), req.body);
        res.status(response.code).json(response);
    }

    static async deleteTicketType(req: Request, res: Response) {
        const { typeId } = req.params as { id: string; typeId: string };
        const response = await TicketTypeRepository.delete(parseInt(typeId));
        res.status(response.code).json(response);
    }
}
