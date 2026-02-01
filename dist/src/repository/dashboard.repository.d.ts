import ResponseModel from "../models/response.model";
export declare class DashboardRepository {
    /**
     * Get all dashboard data
     */
    static getDashboardData(agencyId?: number): Promise<ResponseModel>;
    /**
     * Get dashboard statistics
     */
    private static getStats;
    /**
     * Get revenue chart data for the last N days
     */
    private static getRevenueChartData;
    /**
     * Get occupation data
     */
    private static getOccupationData;
    /**
     * Get upcoming trips
     */
    private static getUpcomingTrips;
    /**
     * Get recent bookings
     */
    private static getRecentBookings;
}
