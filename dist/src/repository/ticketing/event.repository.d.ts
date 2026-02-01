import { EventCreateDto, EventUpdateDto, EventSearchParams, EventStatus } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
export declare class EventRepository {
    private static readonly SELECT_WITH_JOINS;
    static findAll(limit?: number, offset?: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByCode(code: string): Promise<ResponseModel>;
    static search(params: EventSearchParams): Promise<ResponseModel>;
    static create(data: EventCreateDto): Promise<ResponseModel>;
    static update(id: number, data: EventUpdateDto): Promise<ResponseModel>;
    static updateStatus(id: number, status: EventStatus): Promise<ResponseModel>;
    static incrementViews(id: number): Promise<void>;
    static delete(id: number): Promise<ResponseModel>;
}
