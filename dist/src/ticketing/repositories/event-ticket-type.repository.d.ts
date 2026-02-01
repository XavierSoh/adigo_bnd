import { EventTicketTypeCreateDto, EventTicketTypeUpdateDto } from "../models/event-ticket-type.model";
import ResponseModel from "../../models/response.model";
export declare class EventTicketTypeRepository {
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static create(ticketType: EventTicketTypeCreateDto, createdBy?: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByEventId(eventId: number, activeOnly?: boolean): Promise<ResponseModel>;
    static update(id: number, ticketType: EventTicketTypeUpdateDto): Promise<ResponseModel>;
    static decreaseAvailableQuantity(id: number, quantity: number): Promise<ResponseModel>;
    static increaseAvailableQuantity(id: number, quantity: number): Promise<ResponseModel>;
    static checkAvailability(id: number, requestedQuantity: number): Promise<ResponseModel>;
    static getStatisticsByEvent(eventId: number): Promise<ResponseModel>;
    static reorder(ticketTypeOrders: {
        id: number;
        display_order: number;
    }[]): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
