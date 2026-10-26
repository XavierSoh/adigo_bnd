import { Request, Response } from "express";
import { EventRepository, PublicEventFilters } from "../../repository/ticketing/event.repository";
import { TicketTypeRepository } from "../../repository/ticketing/ticket-type.repository";

// Lecture publique des événements. Les écritures (création, publication,
// annulation, types de billet) sont servies par AdminManagementController,
// réservé aux admins — voir routes/ticketing/index.ts.

function isAdmin(req: Request): boolean {
    return ['admin', 'super_admin'].includes((req.userRole ?? '').toLowerCase());
}

function num(value: unknown): number | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
}

function date(value: unknown): Date | undefined {
    if (typeof value !== 'string' || !value) return undefined;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
}

function filtersFrom(query: Record<string, unknown>): PublicEventFilters {
    const limit = num(query.limit) ?? 50;
    // L'app envoie `page` (1-based) ; `offset` reste accepté.
    const page = num(query.page);
    const offset = num(query.offset) ?? (page && page > 1 ? (page - 1) * limit : 0);
    return {
        search: typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined,
        category_id: num(query.category_id),
        city: typeof query.city === 'string' && query.city.trim() ? query.city.trim() : undefined,
        organizer_id: num(query.organizer_id),
        is_featured: query.is_featured === 'true',
        start_date: date(query.start_date),
        end_date: date(query.end_date),
        min_price: num(query.min_price),
        max_price: num(query.max_price),
        limit,
        offset,
    };
}

export class EventController {

    static async getAll(req: Request, res: Response) {
        const response = await EventRepository.findPublic(filtersFrom(req.query as Record<string, unknown>));
        res.status(response.code).json(response);
    }

    static async search(req: Request, res: Response) {
        const response = await EventRepository.findPublic(filtersFrom(req.query as Record<string, unknown>));
        res.status(response.code).json(response);
    }

    static async getById(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        const response = await EventRepository.findVisibleById(id, isAdmin(req));
        if (response.status) {
            EventRepository.incrementViews(id).catch(() => {});
        }
        res.status(response.code).json(response);
    }

    static async getByCode(req: Request, res: Response) {
        const { code } = req.params as { code: string };
        const response = await EventRepository.findVisibleByCode(code, isAdmin(req));
        res.status(response.code).json(response);
    }

    static async getTicketTypes(req: Request, res: Response) {
        const id = parseInt((req.params as { id: string }).id);
        if (!(await EventRepository.isVisible(id, isAdmin(req)))) {
            res.status(404).json({ status: false, message: "Événement non trouvé", code: 404 });
            return;
        }
        const response = await TicketTypeRepository.findByEventId(id, !isAdmin(req));
        res.status(response.code).json(response);
    }
}
