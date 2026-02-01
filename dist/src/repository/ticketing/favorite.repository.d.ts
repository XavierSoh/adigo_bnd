import ResponseModel from "../../models/response.model";
export declare class FavoriteRepository {
    static findByCustomerId(customerId: number): Promise<ResponseModel>;
    static isFavorite(customerId: number, eventId: number): Promise<boolean>;
    static add(customerId: number, eventId: number): Promise<ResponseModel>;
    static remove(customerId: number, eventId: number): Promise<ResponseModel>;
    static toggle(customerId: number, eventId: number): Promise<ResponseModel>;
}
