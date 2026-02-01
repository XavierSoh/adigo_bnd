import { Request, Response } from "express";
import { EventRepository, TicketTypeRepository } from "../../repository/ticketing";
import { EventSearchParams } from "../../models/ticketing";

export class EventController {

    static async getAll(req: Request, res: Response) {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const result = await EventRepository.findAll(limit, offset);
        res.status(result.code).json(result);
    }

    static async getById(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        await EventRepository.incrementViews(id);
        const result = await EventRepository.findById(id);
        res.status(result.code).json(result);
    }

    static async getByCode(req: Request, res: Response) {
        const code = (req.params as { code: string }).code;
        const result = await EventRepository.findByCode(code);
        res.status(result.code).json(result);
    }

    static async search(req: Request, res: Response) {
        const params: EventSearchParams = {
            search: req.query.search as string,
            category_id: req.query.category_id ? parseInt(req.query.category_id as string) : undefined,
            city: req.query.city as string,
            status: req.query.status as any,
            organizer_id: req.query.organizer_id ? parseInt(req.query.organizer_id as string) : undefined,
            is_featured: req.query.featured === 'true',
            limit: parseInt(req.query.limit as string) || 20,
            offset: parseInt(req.query.offset as string) || 0,
        };
        const result = await EventRepository.search(params);
        res.status(result.code).json(result);
    }

    static async create(req: Request, res: Response) {
        const result = await EventRepository.create(req.body);
        res.status(result.code).json(result);
    }

    static async update(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const result = await EventRepository.update(id, req.body);
        res.status(result.code).json(result);
    }

    static async publish(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const result = await EventRepository.updateStatus(id, 'pending');
        res.status(result.code).json(result);
    }

    static async approve(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const result = await EventRepository.updateStatus(id, 'published');
        res.status(result.code).json(result);
    }

    static async cancel(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const result = await EventRepository.updateStatus(id, 'cancelled');
        res.status(result.code).json(result);
    }

    static async delete(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const result = await EventRepository.delete(id);
        res.status(result.code).json(result);
    }

    // Ticket Types for event
    static async getTicketTypes(req: Request, res: Response) {
        const eventId = parseInt((req.params as { id: string }).id);
        const result = await TicketTypeRepository.findByEventId(eventId);
        res.status(result.code).json(result);
    }

    static async createTicketType(req: Request, res: Response) {
        const eventId = parseInt((req.params as { id: string }).id);
        const result = await TicketTypeRepository.create({ ...req.body, event_id: eventId });
        res.status(result.code).json(result);
    }

    static async updateTicketType(req: Request, res: Response) {
        const typeId = parseInt((req.params as { typeId: string }).typeId);
        const result = await TicketTypeRepository.update(typeId, req.body);
        res.status(result.code).json(result);
    }

    static async deleteTicketType(req: Request, res: Response) {
        const typeId = parseInt((req.params as { typeId: string }).typeId);
        const result = await TicketTypeRepository.delete(typeId);
        res.status(result.code).json(result);
    }
}
