// Migrated to Prisma's native model API — see BOOKING_MODULE_NOTES.md
// ("Full Prisma relational-API migration", tier 4).
import { Prisma } from "@prisma/client";
import prismaDb from "../config/prismaClient";
import ResponseModel from "../models/response.model";
import {
    DashboardData,
    DashboardStats,
    RevenueChartData,
    OccupationData,
    UpcomingTrip,
    RecentBooking
} from "../models/dashboard.model";

// `CURRENT_DATE - INTERVAL '...'` depends on Postgres's session TimeZone
// GUC (observed as Europe/Paris elsewhere in this migration, distinct from
// the Node process's Africa/Douala) — this uses the Node process's local
// midnight instead, consistent with how every other "local day" boundary
// in this migration is computed. Flagged, not assumed identical.
function localMidnightDaysAgo(days: number): Date {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(todayMidnight.getTime() - days * 24 * 60 * 60 * 1000);
}

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
        const agencyWhere: Prisma.bookingWhereInput = agencyId ? { generated_trip: { trip: { agency_id: agencyId } } } : {};

        // `COUNT(DISTINCT gt.id)`/`COUNT(DISTINCT c.id)` across a JOIN —
        // no server-side distinct-count-of-a-related-column in the model
        // API, so both windows fetch the matching bookings' own
        // total_price/generated_trip_id/customer_id and compute
        // SUM/COUNT/DISTINCT-count in JS instead (flagged perf tradeoff:
        // N rows over the wire instead of a single aggregate query, same
        // tradeoff already accepted elsewhere in this migration).
        const fetchWindow = async (gte: Date, lt?: Date) => {
            const rows = await prismaDb.booking.findMany({
                where: {
                    ...agencyWhere,
                    is_deleted: false,
                    booking_date: lt ? { gte, lt } : { gte },
                },
                select: { total_price: true, generated_trip_id: true, customer_id: true },
            });
            return {
                totalRevenue: rows.reduce((sum, r) => sum + r.total_price, 0),
                totalBookings: rows.length,
                totalTrips: new Set(rows.map((r) => r.generated_trip_id)).size,
                totalCustomers: new Set(rows.map((r) => r.customer_id)).size,
            };
        };

        const thirtyDaysAgo = localMidnightDaysAgo(30);
        const sixtyDaysAgo = localMidnightDaysAgo(60);

        const [currentStats, previousStats] = await Promise.all([
            fetchWindow(thirtyDaysAgo),
            fetchWindow(sixtyDaysAgo, thirtyDaysAgo),
        ]);

        const calculateChange = (current: number, previous: number): number => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return ((current - previous) / previous) * 100;
        };

        return {
            totalRevenue: currentStats.totalRevenue,
            totalBookings: currentStats.totalBookings,
            totalTrips: currentStats.totalTrips,
            totalCustomers: currentStats.totalCustomers,
            revenueChange: calculateChange(currentStats.totalRevenue, previousStats.totalRevenue),
            bookingsChange: calculateChange(currentStats.totalBookings, previousStats.totalBookings),
            tripsChange: calculateChange(currentStats.totalTrips, previousStats.totalTrips),
            customersChange: calculateChange(currentStats.totalCustomers, previousStats.totalCustomers),
        };
    }

    /**
     * Get revenue chart data for the last N days
     */
    private static async getRevenueChartData(agencyId: number | undefined, days: number): Promise<RevenueChartData[]> {
        const rows = await prismaDb.booking.findMany({
            where: {
                is_deleted: false,
                booking_date: { gte: localMidnightDaysAgo(days) },
                ...(agencyId ? { generated_trip: { trip: { agency_id: agencyId } } } : {}),
            },
            select: { booking_date: true, total_price: true },
        });

        // `DATE(b.booking_date)` + `GROUP BY` — bucketed by calendar day
        // in JS instead (same day-bucketing pattern used for admin-
        // analytics's sales trends).
        const buckets = new Map<string, { revenue: number; bookings: number }>();
        for (const row of rows) {
            const d = row.booking_date ?? new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const bucket = buckets.get(key) ?? { revenue: 0, bookings: 0 };
            bucket.revenue += row.total_price;
            bucket.bookings += 1;
            buckets.set(key, bucket);
        }

        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, v]) => ({ date, ...v }));
    }

    /**
     * Get occupation data
     */
    private static async getOccupationData(agencyId?: number): Promise<OccupationData> {
        // `gts.status` here is the RAW stored column (not the live-
        // derived available/reserved/booked status
        // generated_trip_seat_repository.ts's other read methods compute
        // from active bookings) — reproduced as-is, matching the
        // original's own `gts.status = 'booked'`/`= 'available'` filters
        // exactly, stale-column caveat included (see
        // generated_trip_seat_repository.ts's header comment).
        const where: Prisma.generated_trip_seatWhereInput = {
            generated_trip: {
                status: { in: ['scheduled', 'boarding', 'departed'] },
                actual_departure_time: { gte: new Date() },
                ...(agencyId ? { trip: { agency_id: agencyId } } : {}),
            },
        };

        const [occupied, available, total] = await Promise.all([
            prismaDb.generated_trip_seat.count({ where: { ...where, status: 'booked' } }),
            prismaDb.generated_trip_seat.count({ where: { ...where, status: 'available' } }),
            prismaDb.generated_trip_seat.count({ where }),
        ]);

        const safeTotal = total || 1; // Avoid division by zero, matches original

        return {
            occupied,
            available,
            total: safeTotal,
            percentage: (occupied / safeTotal) * 100
        };
    }

    /**
     * Get upcoming trips
     */
    private static async getUpcomingTrips(agencyId: number | undefined, limit: number): Promise<UpcomingTrip[]> {
        const rows = await prismaDb.generated_trip.findMany({
            where: {
                status: { in: ['scheduled', 'boarding'] },
                actual_departure_time: { gte: new Date() },
                ...(agencyId ? { trip: { agency_id: agencyId } } : {}),
            },
            include: {
                trip: { select: { departure_city: true, arrival_city: true } },
                bus: { select: { registration_number: true, capacity: true } },
                staff_generated_trip_driver_idTostaff: { select: { first_name: true, last_name: true } },
            },
            orderBy: { actual_departure_time: 'asc' },
            take: limit,
        });

        return rows.map((gt) => ({
            id: gt.id,
            trip_id: gt.trip_id,
            departure_city: gt.trip.departure_city,
            arrival_city: gt.trip.arrival_city,
            departure_time: gt.actual_departure_time,
            bus_name: gt.bus?.registration_number ?? null,
            bus_plate_number: gt.bus?.registration_number ?? null,
            available_seats: gt.available_seats,
            total_seats: gt.bus?.capacity ?? null,
            status: gt.status,
            // `CONCAT(s.first_name, ' ', s.last_name)` — Postgres CONCAT
            // treats NULL arguments as empty strings rather than
            // propagating NULL, so a trip with no driver assigned yields
            // a single space, not null/undefined. Reproduced exactly.
            driver_name: `${gt.staff_generated_trip_driver_idTostaff?.first_name ?? ''} ${gt.staff_generated_trip_driver_idTostaff?.last_name ?? ''}`,
        })) as unknown as UpcomingTrip[];
    }

    /**
     * Get recent bookings
     */
    private static async getRecentBookings(agencyId: number | undefined, limit: number): Promise<RecentBooking[]> {
        const rows = await prismaDb.booking.findMany({
            where: {
                is_deleted: false,
                ...(agencyId ? { generated_trip: { trip: { agency_id: agencyId } } } : {}),
            },
            select: {
                id: true, booking_reference: true, total_price: true, payment_method: true,
                payment_status: true, status: true, booking_date: true,
                customer_booking_customer_idTocustomer: { select: { first_name: true, last_name: true, phone: true } },
                generated_trip: { select: { actual_departure_time: true, trip: { select: { departure_city: true, arrival_city: true } } } },
            },
            orderBy: { booking_date: 'desc' },
            take: limit,
        });

        return rows.map((b) => {
            const customer = b.customer_booking_customer_idTocustomer;
            const trip = b.generated_trip?.trip;
            return {
                id: b.id,
                booking_reference: b.booking_reference,
                // Same NULL-tolerant CONCAT reproduction as driver_name above.
                customer_name: `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`,
                customer_phone: customer?.phone ?? null,
                trip_route: trip ? `${trip.departure_city} → ${trip.arrival_city}` : ' → ',
                departure_time: b.generated_trip?.actual_departure_time ?? null,
                total_price: b.total_price,
                payment_method: b.payment_method,
                payment_status: b.payment_status,
                status: b.status,
                booking_date: b.booking_date,
            } as unknown as RecentBooking;
        });
    }
}
