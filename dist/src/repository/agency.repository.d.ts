import { AgencyModel } from "../models/agency.model";
import ResponseModel from "../models/response.model";
export declare class AgencyRepository {
    static create(agency: AgencyModel): Promise<ResponseModel>;
    static update(id: number, agencyData: Partial<AgencyModel>): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static findById(id: number, includeDeleted?: boolean): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static bulkCreate(agencies: AgencyModel[]): Promise<ResponseModel>;
}
