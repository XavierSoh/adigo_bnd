import { ContractTypeModel } from '../models/contract_type.model';
import ResponseModel from '../models/response.model';
export declare class ContractTypeRepository {
    static create(data: Partial<ContractTypeModel>): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static findById(id: number, includeDeleted: boolean): Promise<ResponseModel>;
    static update(id: number, data: Partial<ContractTypeModel>): Promise<ResponseModel>;
    static softDelete(id: number, userId: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
