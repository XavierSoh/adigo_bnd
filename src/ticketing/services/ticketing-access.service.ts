/**
 * Qui peut voir / scanner quoi, côté app (TICKETING_MODULE_PLAN_2026-10.md §2) :
 * - l'organisateur = le compte client lié à une fiche event_organizer ;
 * - le contrôleur = un compte client ayant ACCEPTÉ une invitation sur un
 *   événement précis (event_controller.status = 'accepted').
 */
import prismaDb from "../../config/prismaClient";

export class TicketingAccess {

    static async organizerOfCustomer(customerId: number | undefined) {
        if (!customerId) return null;
        return prismaDb.event_organizer.findFirst({
            where: { customer_id: customerId, is_deleted: false },
            select: { id: true, name: true, logo: true, type: true, email: true, phone: true },
        });
    }

    static async ownsEvent(customerId: number | undefined, eventId: number): Promise<boolean> {
        if (!customerId) return false;
        const event = await prismaDb.event.findFirst({
            where: { id: eventId, is_deleted: false, event_organizer: { customer_id: customerId, is_deleted: false } },
            select: { id: true },
        });
        return !!event;
    }

    static async isAcceptedController(customerId: number | undefined, eventId: number): Promise<boolean> {
        if (!customerId) return false;
        const row = await prismaDb.event_controller.findFirst({
            where: { event_id: eventId, customer_id: customerId, status: 'accepted' },
            select: { id: true },
        });
        return !!row;
    }

    static async canScanEvent(customerId: number | undefined, eventId: number): Promise<boolean> {
        return (await this.ownsEvent(customerId, eventId)) || (await this.isAcceptedController(customerId, eventId));
    }
}
