import { Booking } from "../models/booking.model";
import ResponseModel from "../models/response.model";
export declare class BookingRepository {
    static addPassenger(bookingId: number, name?: string, phone?: string, document_type?: string, document_number?: string): Promise<void>;
    static create(booking: Booking): Promise<ResponseModel>;
    static update(id: number, booking: Partial<Booking>): Promise<ResponseModel>;
    static getStatisticsByPaymentMethod(agencyId?: number): Promise<ResponseModel>;
    static softDelete(id: number, deletedBy?: number): Promise<ResponseModel>;
    static restore(id: number): Promise<ResponseModel>;
    static delete(id: number): Promise<ResponseModel>;
    static findByTripAndStatus(tripId: number, status: string): Promise<ResponseModel>;
    static checkSeatAvailability(tripId: number, seatId: number, excludeBookingId?: number): Promise<ResponseModel>;
    static getBookedSeatIds(tripId: number): Promise<ResponseModel>;
    static getStatistics(agencyId?: number): Promise<ResponseModel>;
    static getRevenueStatistics(agencyId?: number, startDate?: Date, endDate?: Date): Promise<ResponseModel>;
    static search(filters: {
        customerName?: string;
        departureCity?: string;
        arrivalCity?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        agencyId?: number;
    }): Promise<ResponseModel>;
    static cancelBatch(bookingIds: number[], cancellationReason: string): Promise<ResponseModel>;
    static findRecent(limit?: number, agencyId?: number): Promise<ResponseModel>;
    static cleanupSoftDeleted(olderThanDays?: number): Promise<ResponseModel>;
    private static readonly AGENCY_SELECT;
    private static readonly CUSTOMER_SELECT;
    private static readonly BUS_SELECT;
    private static readonly SEAT_SELECT;
    private static readonly GENERATED_TRIP_SELECT;
    private static readonly GENERATED_TRIP_SEAT_SELECT;
    private static readonly BOOKING_PASSENGER_SELECT;
    /**
     * Convert numeric string fields to actual numbers for mobile app compatibility
     * PostgreSQL NUMERIC/DECIMAL types are returned as strings by pg-promise
     */
    private static normalizeNumericFields;
    private static readonly BASE_SELECT;
    private static readonly BASE_JOINS;
    static findByAgency(agencyId: number): Promise<ResponseModel>;
    static findAll(includeDeleted?: boolean): Promise<ResponseModel>;
    static findById(id: number): Promise<ResponseModel>;
    static findByTrip(tripId: number): Promise<ResponseModel>;
    static findByUser(customerId: number): Promise<ResponseModel>;
    static findByGroupId(groupId: string): Promise<ResponseModel>;
    static findByStatus(status: string): Promise<ResponseModel>;
    static findByDateRange(startDate: Date, endDate: Date): Promise<ResponseModel>;
    static findAllWithDetails(agencyId?: number): Promise<ResponseModel>;
    static softDeleteByGroup(groupId: string): Promise<void>;
}
