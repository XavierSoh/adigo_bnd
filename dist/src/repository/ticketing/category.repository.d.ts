import { CategoryCreateDto, CategoryUpdateDto } from "../../models/ticketing";
import ResponseModel from "../../models/response.model";
export declare class CategoryRepository {
    static findAll(activeOnly?: boolean): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static create(data: CategoryCreateDto): Promise<ResponseModel>;
    static update(id: number, data: CategoryUpdateDto): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
}
