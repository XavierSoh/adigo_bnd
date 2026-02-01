import { EventCreateDto, EventUpdateDto, EventPublishDto, EventSearchParams } from "../models/event.model";
import ResponseModel from "../../models/response.model";
export declare class EventRepository {
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static create(event: EventCreateDto, createdBy?: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByEventCode(eventCode: string): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static findByOrganizer(organizerId: number): Promise<ResponseModel>;
    static findByCategory(categoryId: number): Promise<ResponseModel>;
    static update(id: number, event: EventUpdateDto): Promise<ResponseModel>;
    static publish(id: number, publishData: EventPublishDto): Promise<ResponseModel>;
    static approve(id: number, validatedBy: number, validationNotes?: string): Promise<ResponseModel>;
    static reject(id: number, validatedBy: number, validationNotes: string): Promise<ResponseModel>;
    static cancel(id: number, cancellationReason: string): Promise<ResponseModel>;
    static search(params: EventSearchParams): Promise<ResponseModel>;
    static getUpcoming(limit?: number): Promise<ResponseModel>;
    static getPast(limit?: number): Promise<ResponseModel>;
    static getFeatured(limit?: number): Promise<ResponseModel>;
    static getPopular(limit?: number): Promise<ResponseModel>;
    static getStatistics(organizerId?: number): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
