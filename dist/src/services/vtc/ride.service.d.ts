/**
 * VTC Ride Service
 * Business logic for ride management
 */
import { VtcRide, CreateRideDto, RideEstimate, RateRideDto, CancelRideDto } from '../../models/vtc/ride.model';
export declare class RideService {
    private readonly BASE_FARE_ECONOMY;
    private readonly BASE_FARE_COMFORT;
    private readonly BASE_FARE_PREMIUM;
    private readonly FARE_PER_KM;
    private readonly FARE_PER_MINUTE;
    /**
     * Calculate distance between two points using Haversine formula
     */
    private calculateDistance;
    private toRad;
    /**
     * Estimate ride cost and duration
     */
    estimateRide(pickupLat: number, pickupLon: number, dropoffLat: number, dropoffLon: number, vehicleType: 'economy' | 'comfort' | 'premium'): Promise<RideEstimate>;
    /**
     * Create a new ride request
     */
    createRide(data: CreateRideDto): Promise<VtcRide>;
    /**
     * Get ride by ID
     */
    getRideById(rideId: number): Promise<VtcRide | null>;
    /**
     * Get customer rides
     */
    getCustomerRides(customerId: number): Promise<VtcRide[]>;
    /**
     * Cancel a ride
     */
    cancelRide(rideId: number, data: CancelRideDto): Promise<VtcRide>;
    /**
     * Rate a ride
     */
    rateRide(rideId: number, ratedBy: 'customer' | 'driver', data: RateRideDto): Promise<VtcRide>;
}
declare const _default: RideService;
export default _default;
