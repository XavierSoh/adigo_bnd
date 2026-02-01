import { EventReviewCreateDto, EventReviewUpdateDto } from "../models/event-review.model";
import ResponseModel from "../../models/response.model";
export declare class EventReviewRepository {
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static create(review: EventReviewCreateDto): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByEvent(eventId: number, approvedOnly?: boolean): Promise<ResponseModel>;
    static findByCustomer(customerId: number): Promise<ResponseModel>;
    static update(id: number, review: EventReviewUpdateDto): Promise<ResponseModel>;
    static approve(id: number): Promise<ResponseModel>;
    static flag(id: number, flagReason: string): Promise<ResponseModel>;
    static unflag(id: number): Promise<ResponseModel>;
    static getStatisticsByEvent(eventId: number): Promise<ResponseModel>;
    static getTopRated(limit?: number, minReviews?: number): Promise<ResponseModel>;
    static getPending(): Promise<ResponseModel>;
    static getFlagged(): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
