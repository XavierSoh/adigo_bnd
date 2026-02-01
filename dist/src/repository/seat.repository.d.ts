import { Seat } from "../models/seat.model";
import ResponseModel from "../models/response.model";
export declare class SeatRepository {
    static create(seat: Seat): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static update(id: number, seat: Partial<Seat>): Promise<ResponseModel>;
    static softDelete(id: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static findAllByBus(busId: number): Promise<ResponseModel>;
}
