import { GeneratedTripModel } from "../models/generated_trip.model";
import ResponseModel from "../models/response.model";
export declare class GeneratedTripRepository {
    private static readonly BUS_SELECT;
    private static readonly BASE_SELECT;
    static create(generatedTrip: GeneratedTripModel): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static update(id: number, generatedTrip: Partial<GeneratedTripModel>): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static findAll(): Promise<ResponseModel>;
    static findByTrip(tripId: number): Promise<ResponseModel>;
    static findByStatus(status: string): Promise<ResponseModel>;
    static findByDateRange(startDate: Date, endDate: Date): Promise<ResponseModel>;
    static findAllWithDetails(agencyId?: number): Promise<ResponseModel>;
    static updateStatus(id: number, status: string): Promise<ResponseModel>;
    static getAvailableSeatsCount(id: number): Promise<ResponseModel>;
    static updateAvailableSeats(id: number, availableSeats: number): Promise<ResponseModel>;
    static assignStaff(id: number, driverId?: number, conductorId?: number): Promise<ResponseModel>;
    static getStatistics(agencyId?: number): Promise<ResponseModel>;
    static getAvailableCities(): Promise<ResponseModel>;
}
