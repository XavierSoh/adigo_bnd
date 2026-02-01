import { ReviewCreateDto, ReviewUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
export declare class ReviewRepository {
    static findByEventId(eventId: number): Promise<ResponseModel>;
    static getEventStats(eventId: number): Promise<{
        average: number;
        count: number;
    }>;
    static create(data: ReviewCreateDto): Promise<ResponseModel>;
    static update(id: number, customerId: number, data: ReviewUpdateDto): Promise<ResponseModel>;
    static delete(id: number, customerId: number): Promise<ResponseModel>;
    static approve(id: number): Promise<ResponseModel>;
}
