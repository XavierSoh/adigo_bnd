import { TripModel } from "../models/trip.model";
import ResponseModel from "../models/response.model";
export declare class TripRepository {
    static create(trip: TripModel): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static update(id: number, trip: Partial<TripModel>): Promise<ResponseModel>;
    static softDelete(id: number, deleted_by: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static findAllByAgency(agencyId: number, isDeleted?: boolean): Promise<ResponseModel>;
    static findByRoute(departureCity: string, arrivalCity: string, departureDate?: Date): Promise<ResponseModel>;
}
