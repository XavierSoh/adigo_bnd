import { Customer } from "../models/customer.model";
import ResponseModel from "../models/response.model";
export declare class CustomerRepository {
    private static resetCodes;
    static setResetCode(email: string, code: string): Promise<void>;
    static verifyResetCode(email: string, code: string): Promise<boolean>;
    static updatePasswordByEmail(email: string, newPassword: string): Promise<ResponseModel>;
    static create(customer: Customer): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByEmail(email: string): Promise<ResponseModel>;
    static findByPhone(phone: string): Promise<ResponseModel>;
    static update(id: number, customer: Partial<Customer>): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static search(filters: {
        searchTerm?: string;
        accountStatus?: string;
        customerTier?: string;
        emailVerified?: boolean;
        phoneVerified?: boolean;
        minLoyaltyPoints?: number;
        city?: string;
    }): Promise<ResponseModel>;
    static authenticate(emailOrPhone: string, password: string): Promise<ResponseModel>;
    static updateLoyaltyPoints(id: number, points: number): Promise<ResponseModel>;
    static checkAndUpdateTier(id: number, points: number): Promise<void>;
    static verifyEmail(id: number): Promise<ResponseModel>;
    static verifyPhone(id: number): Promise<ResponseModel>;
    static getStatistics(): Promise<ResponseModel>;
    static bulkCreate(customers: Customer[]): Promise<ResponseModel>;
    static updateWalletBalance(customerId: number, amount: number): Promise<ResponseModel>;
    static getWalletBalance(customerId: number): Promise<ResponseModel>;
}
