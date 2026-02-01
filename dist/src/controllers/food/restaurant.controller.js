"use strict";
/**
 * Restaurant Controller
 * HTTP handlers for restaurant endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestaurantController = void 0;
const restaurant_service_1 = __importDefault(require("../../services/food/restaurant.service"));
const database_1 = __importDefault(require("../../config/database"));
class RestaurantController {
    /**
     * GET /v1/api/food/restaurants
     * Get list of restaurants with filters
     */
    async getRestaurants(req, res) {
        try {
            const filters = {
                category: req.query.category,
                latitude: req.query.latitude ? parseFloat(req.query.latitude) : undefined,
                longitude: req.query.longitude ? parseFloat(req.query.longitude) : undefined,
                radiusKm: req.query.radius ? parseFloat(req.query.radius) : 10,
                isAcceptingOrders: req.query.isAcceptingOrders === 'true',
                search: req.query.search
            };
            const restaurants = await restaurant_service_1.default.getRestaurants(filters);
            return res.json({
                success: true,
                data: restaurants
            });
        }
        catch (error) {
            console.error('Error getting restaurants:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/food/restaurants/:id
     * Get restaurant details
     */
    async getRestaurant(req, res) {
        try {
            const restaurantId = parseInt(req.params.id);
            const restaurant = await restaurant_service_1.default.getRestaurantById(restaurantId);
            if (!restaurant) {
                return res.status(404).json({
                    success: false,
                    message: 'Restaurant not found'
                });
            }
            return res.json({
                success: true,
                data: restaurant
            });
        }
        catch (error) {
            console.error('Error getting restaurant:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/food/restaurants/:id/menu
     * Get restaurant menu
     */
    async getRestaurantMenu(req, res) {
        try {
            const restaurantId = parseInt(req.params.id);
            const category = req.query.category;
            let query = 'SELECT * FROM menu_items WHERE restaurant_id = $1 AND is_available = true';
            const params = [restaurantId];
            if (category) {
                query += ' AND category = $2';
                params.push(category);
            }
            query += ' ORDER BY category, name';
            const result = await database_1.default.query(query, params);
            return res.json({
                success: true,
                data: result.rows
            });
        }
        catch (error) {
            console.error('Error getting menu:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.RestaurantController = RestaurantController;
exports.default = new RestaurantController();
