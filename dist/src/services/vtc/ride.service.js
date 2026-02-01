"use strict";
/**
 * VTC Ride Service
 * Business logic for ride management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RideService = void 0;
const database_1 = __importDefault(require("../../config/database"));
class RideService {
    constructor() {
        this.BASE_FARE_ECONOMY = 500; // FCFA
        this.BASE_FARE_COMFORT = 800;
        this.BASE_FARE_PREMIUM = 1500;
        this.FARE_PER_KM = 150;
        this.FARE_PER_MINUTE = 50;
    }
    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth radius in km
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 100) / 100;
    }
    toRad(degrees) {
        return degrees * (Math.PI / 180);
    }
    /**
     * Estimate ride cost and duration
     */
    async estimateRide(pickupLat, pickupLon, dropoffLat, dropoffLon, vehicleType) {
        const distance = this.calculateDistance(pickupLat, pickupLon, dropoffLat, dropoffLon);
        const duration = Math.ceil(distance / 0.5); // ~30 km/h average
        let baseFare = this.BASE_FARE_ECONOMY;
        if (vehicleType === 'comfort')
            baseFare = this.BASE_FARE_COMFORT;
        if (vehicleType === 'premium')
            baseFare = this.BASE_FARE_PREMIUM;
        const distanceFare = distance * this.FARE_PER_KM;
        const timeFare = duration * this.FARE_PER_MINUTE;
        // Check surge pricing (simplified)
        const surgeMultiplier = 1.0;
        const totalFare = Math.round((baseFare + distanceFare + timeFare) * surgeMultiplier);
        return {
            vehicleType,
            estimatedDistance: distance,
            estimatedDuration: duration,
            baseFare,
            distanceFare: Math.round(distanceFare),
            timeFare: Math.round(timeFare),
            surgeMultiplier,
            totalFare
        };
    }
    /**
     * Create a new ride request
     */
    async createRide(data) {
        const estimate = await this.estimateRide(data.pickupLatitude, data.pickupLongitude, data.dropoffLatitude, data.dropoffLongitude, data.vehicleType);
        const query = `
      INSERT INTO vtc_rides (
        customer_id, vehicle_type,
        pickup_address, pickup_latitude, pickup_longitude,
        dropoff_address, dropoff_latitude, dropoff_longitude,
        base_fare, distance_fare, time_fare, surge_multiplier, total_fare,
        estimated_distance, estimated_duration,
        payment_method, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
        const values = [
            data.customerId, data.vehicleType,
            data.pickupAddress, data.pickupLatitude, data.pickupLongitude,
            data.dropoffAddress, data.dropoffLatitude, data.dropoffLongitude,
            estimate.baseFare, estimate.distanceFare, estimate.timeFare,
            estimate.surgeMultiplier, estimate.totalFare,
            estimate.estimatedDistance, estimate.estimatedDuration,
            data.paymentMethod, 'requested'
        ];
        const result = await database_1.default.query(query, values);
        return result.rows[0];
    }
    /**
     * Get ride by ID
     */
    async getRideById(rideId) {
        const query = 'SELECT * FROM vtc_rides WHERE id = $1';
        const result = await database_1.default.query(query, [rideId]);
        return result.rows[0] || null;
    }
    /**
     * Get customer rides
     */
    async getCustomerRides(customerId) {
        const query = `
      SELECT * FROM vtc_rides
      WHERE customer_id = $1
      ORDER BY created_at DESC
    `;
        const result = await database_1.default.query(query, [customerId]);
        return result.rows;
    }
    /**
     * Cancel a ride
     */
    async cancelRide(rideId, data) {
        const query = `
      UPDATE vtc_rides
      SET status = 'cancelled',
          cancellation_reason = $1,
          cancelled_by = $2
      WHERE id = $3
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            data.reason, data.cancelledBy, rideId
        ]);
        return result.rows[0];
    }
    /**
     * Rate a ride
     */
    async rateRide(rideId, ratedBy, data) {
        const field = ratedBy === 'customer' ? 'driver_rating' : 'customer_rating';
        const feedbackField = ratedBy === 'customer'
            ? 'driver_feedback'
            : 'customer_feedback';
        const query = `
      UPDATE vtc_rides
      SET ${field} = $1, ${feedbackField} = $2
      WHERE id = $3
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            data.rating, data.feedback, rideId
        ]);
        return result.rows[0];
    }
}
exports.RideService = RideService;
exports.default = new RideService();
