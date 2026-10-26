// Lecture des types de billet d'un événement. Migrated to Prisma's native
// model API (prisma.event_ticket_type.*) — see BOOKING_MODULE_NOTES.md.
//
// Les écritures (création, modification, suppression) et la réservation de
// places passent par src/ticketing/services/admin-events.service.ts et
// ticket-purchase.service.ts.
import prismaDb from "../../config/prismaClient";
import ResponseModel from "../../models/response.model";

// `available = quantity - sold` (sold = places réservées, paiements en
// cours inclus) — computed in JS, same flat shape as the original SQL.
function withAvailable<T extends { quantity: number; sold: number | null }>(row: T) {
    return { ...row, available: Math.max(0, row.quantity - (row.sold ?? 0)) };
}

export class TicketTypeRepository {

    /** `activeOnly` : vue publique, les types désactivés par l'admin sont masqués. */
    static async findByEventId(eventId: number, activeOnly = false): Promise<ResponseModel> {
        try {
            const rows = await prismaDb.event_ticket_type.findMany({
                where: { event_id: eventId, ...(activeOnly ? { is_active: true } : {}) },
                orderBy: { price: 'asc' },
            });
            return { status: true, message: "Types de tickets récupérés", body: rows.map(withAvailable), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la récupération", code: 500 };
        }
    }

    static async findById(id: number): Promise<ResponseModel> {
        try {
            const result = await prismaDb.event_ticket_type.findUnique({ where: { id } });
            if (!result) return { status: false, message: "Type de ticket non trouvé", code: 404 };
            return { status: true, message: "Type trouvé", body: withAvailable(result), code: 200 };
        } catch (error) {
            return { status: false, message: "Erreur lors de la recherche", code: 500 };
        }
    }
}
