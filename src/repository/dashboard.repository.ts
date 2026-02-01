import pgpDb from "../config/pgdb";
import ResponseModel from "../models/response.model";
import {
    DashboardData,
    DashboardStats,
    RevenueChartData,
    OccupationData,
    UpcomingTrip,
    RecentBooking
} from "../models/dashboard.model";

export class DashboardRepository {

    /**
     * Get all dashboard data
     */
    static async getDashboardData(agencyId?: number): Promise<ResponseModel> {
        try {
            const stats = await this.getStats(agencyId);
            const revenueChart = await this.getRevenueChartData(agencyId, 7); // Last 7 days
            const occupation = await this.getOccupationData(agencyId);
            const upcomingTrips = await this.getUpcomingTrips(agencyId, 10);
            const recentBookings = await this.getRecentBookings(agencyId, 10);

            const dashboardData: DashboardData = {
                stats,
                revenueChart,
                occupation,
                upcomingTrips,
                recentBookings
            };

            return {
                status: true,
                message: 'Dashboard data retrieved successfully',
                body: dashboardData,
                code: 200
            };
        } catch (error) {
            console.error(`Dashboard data error: ${JSON.stringify(error)}`);
            return {
                status: false,
                message: 'Error retrieving dashboard data',
                exception: error instanceof Error ? error.message : error,
                code: 500
            };
        }
    }

    /**
     * Get dashboard statistics
     */
    private static async getStats(agencyId?: number): Promise<DashboardStats> {
        const agencyFilter = agencyId ? 'AND ag.id = $1' : '';
        const params = agencyId ? [agencyId] : [];

        // Get current period stats
        const currentStats = await pgpDb.one(`
            SELECT
                COALESCE(SUM(b.total_price), 0) as total_revenue,
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(DISTINCT gt.id) as total_trips,
                COUNT(DISTINCT c.id) as total_customers
            FROM booking b
            LEFT JOIN generated_trip gt ON b.generated_trip_id = gt.id
            LEFT JOIN trip t ON gt.trip_id = t.id
            LEFT JOIN agency ag ON t.agency_id = ag.id
            LEFT JOIN customer c ON b.customer_id = c.id
            WHERE b.is_deleted = false
            AND b.booking_date >= CURRENT_DATE - INTERVAL '30 days'
            ${agencyFilter}
        `, params);

        // Get previous period stats for comparison
        const previousStats = await pgpDb.one(`
            SELECT
                COALESCE(SUM(b.total_price), 0) as total_revenue,
                COUNT(DISTINCT b.id) as total_bookings,
                COUNT(DISTINCT gt.id) as total_trips,
                COUNT(DISTINCT c.id) as total_customers
            FROM booking b
            LEFT JOIN generated_trip gt ON b.generated_trip_id = gt.id
            LEFT JOIN trip t ON gt.trip_id = t.id
            LEFT JOIN agency ag ON t.agency_id = ag.id
            LEFT JOIN customer c ON b.customer_id = c.id
            WHERE b.is_deleted = false
            AND b.booking_date >= CURRENT_DATE - INTERVAL '60 days'
            AND b.booking_date < CURRENT_DATE - INTERVAL '30 days'
            ${agencyFilter}
        `, params);

        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        return {
            totalRevenue: parseFloat(currentStats.total_revenue) || 0,
            totalBookings: parseInt(currentStats.total_bookings) || 0,
            totalTrips: parseInt(currentStats.total_trips) || 0,
            totalCustomers: parseInt(currentStats.total_customers) || 0,
            revenueChange: calculateChange(
                parseFloat(currentStats.total_revenue) || 0,
                parseFloat(previousStats.total_revenue) || 0
            ),
            bookingsChange: calculateChange(
                parseInt(currentStats.total_bookings) || 0,
                parseInt(previousStats.total_bookings) || 0
            ),
            tripsChange: calculateChange(
                parseInt(currentStats.total_trips) || 0,
                parseInt(previousStats.total_trips) || 0
            ),
            customersChange: calculateChange(
                parseInt(currentStats.total_customers) || 0,
                parseInt(previousStats.total_customers) || 0
            )
        };
    }

    /**
     * Get revenue chart data for the last N days
     */
    private static async getRevenueChartData(agencyId: number | undefined, days: number): Promise<RevenueChartData[]> {
        const agencyFilter = agencyId ? 'AND ag.id = $2' : '';
        const params = agencyId ? [days, agencyId] : [days];

        const data = await pgpDb.manyOrNone(`
            SELECT
                DATE(b.booking_date) as date,
                COALESCE(SUM(b.total_price), 0) as revenue,
                COUNT(b.id) as bookings
            FROM booking b
            LEFT JOIN generated_trip gt ON b.generated_trip_id = gt.id
            LEFT JOIN trip t ON gt.trip_id = t.id
            LEFT JOIN agency ag ON t.agency_id = ag.id
            WHERE b.is_deleted = false
            AND b.booking_date >= CURRENT_DATE - ($1 || ' days')::INTERVAL
            ${agencyFilter}
            GROUP BY DATE(b.booking_date)
            ORDER BY date ASC
        `, params);

        return data.map(row => ({
            date: row.date,
            revenue: parseFloat(row.revenue) || 0,
            bookings: parseInt(row.bookings) || 0
        }));
    }

    /**
     * Get occupation data
     */
    private static async getOccupationData(agencyId?: number): Promise<OccupationData> {
        const agencyFilter = agencyId ? 'AND ag.id = $1' : '';
        const params = agencyId ? [agencyId] : [];

        const data = await pgpDb.one(`
            SELECT
                COUNT(DISTINCT gts.id) FILTER (WHERE gts.status = 'booked') as occupied,
                COUNT(DISTINCT gts.id) FILTER (WHERE gts.status = 'available') as available,
                COUNT(DISTINCT gts.id) as total
            FROM generated_trip_seat gts
            LEFT JOIN generated_trip gt ON gts.generated_trip_id = gt.id
            LEFT JOIN trip t ON gt.trip_id = t.id
            LEFT JOIN agency ag ON t.agency_id = ag.id
            WHERE gt.status IN ('scheduled', 'boarding', 'departed')
            AND gt.actual_departure_time >= NOW()
            ${agencyFilter}
        `, params);

        const occupied = parseInt(data.occupied) || 0;
        const available = parseInt(data.available) || 0;
        const total = parseInt(data.total) || 1; // Avoid division by zero

        return {
            occupied,
            available,
            total,
            percentage: (occupied / total) * 100
        };
    }

    /**
     * Get upcoming trips
     */
    private static async getUpcomingTrips(agencyId: number | undefined, limit: number): Promise<UpcomingTrip[]> {
        const agencyFilter = agencyId ? `AND ag.id = $2` : '';
        const params = agencyId ? [limit, agencyId] : [limit];

        const trips = await pgpDb.manyOrNone(`
            SELECT
                gt.id,
                gt.trip_id,
                t.departure_city,
                t.arrival_city,
                gt.actual_departure_time as departure_time,
                b.registration_number as bus_name,
                b.registration_number as bus_plate_number,
                gt.available_seats,
                b.capacity as total_seats,
                gt.status,
                CONCAT(s.first_name, ' ', s.last_name) as driver_name
            FROM generated_trip gt
            LEFT JOIN trip t ON gt.trip_id = t.id
            LEFT JOIN agency ag ON t.agency_id = ag.id
            LEFT JOIN bus b ON gt.bus_id = b.id
            LEFT JOIN staff s ON gt.driver_id = s.id
            WHERE gt.status IN ('scheduled', 'boarding')
            AND gt.actual_departure_time >= NOW()
            ${agencyFilter}
            ORDER BY gt.actual_departure_time ASC
            LIMIT $1
        `, params);

        return trips.map(trip => ({
            id: trip.id,
            trip_id: trip.trip_id,
            departure_city: trip.departure_city,
            arrival_city: trip.arrival_city,
            departure_time: trip.departure_time,
            bus_name: trip.bus_name,
            bus_plate_number: trip.bus_plate_number,
            available_seats: trip.available_seats,
            total_seats: trip.total_seats,
            status: trip.status,
            driver_name: trip.driver_name
        }));
    }

    /**
     * Get recent bookings
     */
    private static async getRecentBookings(agencyId: number | undefined, limit: number): Promise<RecentBooking[]> {
        const agencyFilter = agencyId ? `AND ag.id = $2` : '';
        const params = agencyId ? [limit, agencyId] : [limit];

        const bookings = await pgpDb.manyOrNone(`
            SELECT
                b.id,
                b.booking_reference,
                CONCAT(c.first_name, ' ', c.last_name) as customer_name,
                c.phone as customer_phone,
                CONCAT(t.departure_city, ' → ', t.arrival_city) as trip_route,
                gt.actual_departure_time as departure_time,
                b.total_price,
                b.payment_method,
                b.payment_status,
                b.status,
                b.booking_date
            FROM booking b
            LEFT JOIN customer c ON b.customer_id = c.id
            LEFT JOIN generated_trip gt ON b.generated_trip_id = gt.id
            LEFT JOIN trip t ON gt.trip_id = t.id
            LEFT JOIN agency ag ON t.agency_id = ag.id
            WHERE b.is_deleted = false
            ${agencyFilter}
            ORDER BY b.booking_date DESC
            LIMIT $1
        `, params);

        return bookings.map(booking => ({
            id: booking.id,
            booking_reference: booking.booking_reference,
            customer_name: booking.customer_name,
            customer_phone: booking.customer_phone,
            trip_route: booking.trip_route,
            departure_time: booking.departure_time,
            total_price: parseFloat(booking.total_price),
            payment_method: booking.payment_method,
            payment_status: booking.payment_status,
            status: booking.status,
            booking_date: booking.booking_date
        }));
    }
}
