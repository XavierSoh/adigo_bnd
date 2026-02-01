"use strict";
/**
 * Restaurant Service
 * Business logic for restaurant management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantService = void 0;
const database_1 = __importDefault(require("../../config/database"));
class RestaurantService {
    /**
     * Get restaurants with filters
     */
    async getRestaurants(filters) {
        let query = `SELECT *`;
        const params = [];
        let paramIndex = 1;
        // Add distance calculation if location provided
        if (filters.latitude && filters.longitude) {
            query += `,
        (6371 * acos(
          cos(radians($${paramIndex})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians($${paramIndex + 1})) +
          sin(radians($${paramIndex})) * sin(radians(latitude))
        )) AS distance`;
            params.push(filters.latitude, filters.longitude);
            paramIndex += 2;
        }
        query += ` FROM restaurants WHERE is_active = true`;
        if (filters.isAcceptingOrders !== undefined) {
            query += ` AND is_accepting_orders = $${paramIndex}`;
            params.push(filters.isAcceptingOrders);
            paramIndex++;
        }
        if (filters.category) {
            query += ` AND category = $${paramIndex}`;
            params.push(filters.category);
            paramIndex++;
        }
        if (filters.search) {
            query += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${filters.search}%`);
            paramIndex++;
        }
        if (filters.latitude && filters.longitude && filters.radiusKm) {
            query += ` HAVING distance < $${paramIndex}`;
            params.push(filters.radiusKm);
        }
        query += ` ORDER BY ${filters.latitude ? 'distance ASC' : 'rating DESC'}`;
        const result = await database_1.default.query(query, params);
        return result.rows;
    }
    /**
     * Get restaurant by ID
     */
    async getRestaurantById(id) {
        const query = 'SELECT * FROM restaurants WHERE id = $1';
        const result = await database_1.default.query(query, [id]);
        return result.rows[0] || null;
    }
}
exports.RestaurantService = RestaurantService;
exports.default = new RestaurantService();
