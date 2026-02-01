import { OrganizerCreateDto, OrganizerUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
export declare class OrganizerRepository {
    static findAll(): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByCustomerId(customerId: number): Promise<ResponseModel>;
    static create(data: OrganizerCreateDto): Promise<ResponseModel>;
    static update(id: number, data: OrganizerUpdateDto): Promise<ResponseModel>;
    static verify(id: number, verifiedBy: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
