// Dashboard Statistics Models

export interface DashboardStats {
    totalRevenue: number;
    totalBookings: number;
    totalTrips: number;
    totalCustomers: number;
    revenueChange: number; // Pourcentage de changement par rapport à la période précédente
    bookingsChange: number;
    tripsChange: number;
    customersChange: number;
}

export interface RevenueChartData {
    date: string;
    revenue: number;
    bookings: number;
}

export interface OccupationData {
    occupied: number;
    available: number;
    total: number;
    percentage: number;
}

export interface UpcomingTrip {
    id: number;
    trip_id: number;
    departure_city: string;
    arrival_city: string;
    departure_time: Date;
    bus_name: string;
    bus_plate_number: string;
    available_seats: number;
    total_seats: number;
    status: string;
    driver_name?: string;
}

export interface RecentBooking {
    id: number;
    booking_reference: string;
    customer_name: string;
    customer_phone: string;
    trip_route: string;
    departure_time: Date;
    total_price: number;
    payment_method: string;
    payment_status: string;
    status: string;
    booking_date: Date;
}

export interface DashboardData {
    stats: DashboardStats;
    revenueChart: RevenueChartData[];
    occupation: OccupationData;
    upcomingTrips: UpcomingTrip[];
    recentBookings: RecentBooking[];
}
