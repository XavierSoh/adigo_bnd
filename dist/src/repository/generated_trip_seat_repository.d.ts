import ResponseModel from "../models/response.model";
export declare class GeneratedTripSeatRepository {
    private static readonly SEAT_SELECT;
    private static readonly BUS_SELECT;
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static findById(id: number): Promise<ResponseModel>;
    static findByGeneratedTrip(generatedTripId: number): Promise<ResponseModel>;
    static findByStatus(generatedTripId: number, status: string): Promise<ResponseModel>;
    static countAvailable(generatedTripId: number): Promise<ResponseModel>;
    static findWithDetails(generatedTripId: number): Promise<ResponseModel>;
    static findAvailableWithDetails(generatedTripId: number): Promise<ResponseModel>;
    static findBookedWithDetails(generatedTripId: number): Promise<ResponseModel>;
}
