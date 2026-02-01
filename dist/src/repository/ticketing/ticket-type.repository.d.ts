import { TicketTypeCreateDto, TicketTypeUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
export declare class TicketTypeRepository {
    static findByEventId(eventId: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static create(data: TicketTypeCreateDto): Promise<ResponseModel>;
    static update(id: number, data: TicketTypeUpdateDto): Promise<ResponseModel>;
    static incrementSold(id: number, quantity: number): Promise<void>;
    static delete(id: number): Promise<ResponseModel>;
}
