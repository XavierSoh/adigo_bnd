import { EventCategoryUpdateDto } from "../models/event-category.model";
import { EventCreateDto } from "../models/event.model";
import ResponseModel from "../../models/response.model";
export declare class EventCategoryRepository {
    static create(event: EventCreateDto, createdBy?: number): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean, activeOnly?: boolean): Promise<ResponseModel>;
    static update(id: number, category: EventCategoryUpdateDto): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static getStatistics(): Promise<ResponseModel>;
    static reorder(categoryOrders: {
        id: number;
        display_order: number;
    }[]): Promise<ResponseModel>;
}
