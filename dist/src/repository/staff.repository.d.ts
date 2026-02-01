import ResponseModel from "../models/response.model";
import { StaffModel } from "../models/staff.model";
/**
 * StaffRepository handles database operations related to staff members.
 */
export declare class StaffRepository {
    static create(staff: StaffModel): Promise<ResponseModel>;
    static findById(id: number, includeDeleted?: boolean): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static update(id: number, staffData: Partial<StaffModel>): Promise<ResponseModel>;
    static softDelete(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static updateLastSalaryPayment(id: number, paymentDate: Date): Promise<ResponseModel>;
    static getStaffWithoutUser(): Promise<StaffModel[]>;
    static generateUniqueEmployeeId(): Promise<any>;
}
