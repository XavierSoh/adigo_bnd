"use strict";
/**
 * VTC Driver Service
 * Business logic for driver management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverService = void 0;
const database_1 = __importDefault(require("../../config/database"));
class DriverService {
    /**
     * Get nearby drivers
     */
    async getNearbyDrivers(latitude, longitude, vehicleType, radiusKm = 5) {
        let query = `
      SELECT *,
        (6371 * acos(
          cos(radians($1)) * cos(radians(current_latitude)) *
          cos(radians(current_longitude) - radians($2)) +
          sin(radians($1)) * sin(radians(current_latitude))
        )) AS distance
      FROM vtc_drivers
      WHERE status = 'online'
        AND current_latitude IS NOT NULL
        AND current_longitude IS NOT NULL
    `;
        const params = [latitude, longitude];
        if (vehicleType) {
            query += ` AND vehicle_type = $3`;
            params.push(vehicleType);
            query += ` HAVING distance < $4`;
            params.push(radiusKm);
        }
        else {
            query += ` HAVING distance < $3`;
            params.push(radiusKm);
        }
        query += ` ORDER BY distance ASC LIMIT 10`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Update driver location
     */
    async updateDriverLocation(driverId, data) {
        const query = `
      UPDATE vtc_drivers
      SET current_latitude = $1,
          current_longitude = $2,
          last_location_update = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            data.latitude, data.longitude, driverId
        ]);
        return result.rows[0];
    }
    /**
     * Update driver status
     */
    async updateDriverStatus(driverId, status) {
        const query = `
      UPDATE vtc_drivers
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
        const result = await database_1.default.query(query, [status, driverId]);
        return result.rows[0];
    }
    /**
     * Get driver by ID
     */
    async getDriverById(driverId) {
        const query = 'SELECT * FROM vtc_drivers WHERE id = $1';
        const result = await database_1.default.query(query, [driverId]);
        return result.rows[0] || null;
    }
}
exports.DriverService = DriverService;
exports.default = new DriverService();
