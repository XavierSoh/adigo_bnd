import ResponseModel from "../models/response.model";
import UserModel from "../models/user.model";
export declare class UserRepository {
    static create(user: UserModel): Promise<ResponseModel>;
    static login(login: string, password: string): Promise<ResponseModel>;
    static findById(id: number, includeDeleted?: boolean): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static update(id: number, userData: Partial<UserModel>): Promise<ResponseModel>;
    static softDelete(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
}
