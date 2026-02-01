import { BusModel } from "../models/bus.model";
import ResponseModel from "../models/response.model";
export declare class BusRepository {
    static create(bus: BusModel): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static update(id: number, bus: Partial<BusModel>): Promise<ResponseModel>;
    static softDelete(id: number, deleted_by: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static findAllByAgency(agencyId: number, isDeleted: boolean): Promise<ResponseModel>;
    static bulkCreate(buses: BusModel[]): Promise<ResponseModel>;
}
