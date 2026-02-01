import { EventFavoriteCreateDto } from "../models/event-favorite.model";
import ResponseModel from "../../models/response.model";
export declare class EventFavoriteRepository {
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static create(favorite: EventFavoriteCreateDto): Promise<ResponseModel>;
    static remove(customerId: number, eventId: number): Promise<ResponseModel>;
    static toggle(customerId: number, eventId: number): Promise<ResponseModel>;
    static findByCustomer(customerId: number): Promise<ResponseModel>;
    static findByEvent(eventId: number): Promise<ResponseModel>;
    static isFavorited(customerId: number, eventId: number): Promise<ResponseModel>;
    static getCountByEvent(eventId: number): Promise<ResponseModel>;
    static getMostFavorited(limit?: number): Promise<ResponseModel>;
    static getStatistics(customerId?: number): Promise<ResponseModel>;
    static removeAllByCustomer(customerId: number): Promise<ResponseModel>;
    static removeAllByEvent(eventId: number): Promise<ResponseModel>;
}
