"use strict";
/**
 * Food Delivery Routes
 * API routes for food delivery module
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const restaurant_controller_1 = __importDefault(require("../controllers/food/restaurant.controller"));
const order_controller_1 = __importDefault(require("../controllers/food/order.controller"));
const router = (0, express_1.Router)();
// ============================================
// Restaurant Routes
// ============================================
/**
 * GET /v1/api/food/restaurants
 * Get list of restaurants with filters
 */
router.get('/restaurants', restaurant_controller_1.default.getRestaurants.bind(restaurant_controller_1.default));
/**
 * GET /v1/api/food/restaurants/:id
 * Get restaurant details
 */
router.get('/restaurants/:id', restaurant_controller_1.default.getRestaurant.bind(restaurant_controller_1.default));
/**
 * GET /v1/api/food/restaurants/:id/menu
 * Get restaurant menu
 */
router.get('/restaurants/:id/menu', restaurant_controller_1.default.getRestaurantMenu.bind(restaurant_controller_1.default));
// ============================================
// Order Routes
// ============================================
/**
 * POST /v1/api/food/orders
 * Create a new food order
 */
router.post('/orders', order_controller_1.default.createOrder.bind(order_controller_1.default));
/**
 * GET /v1/api/food/orders/:id
 * Get order details
 */
router.get('/orders/:id', order_controller_1.default.getOrder.bind(order_controller_1.default));
/**
 * GET /v1/api/food/orders
 * Get customer orders history
 */
router.get('/orders', order_controller_1.default.getCustomerOrders.bind(order_controller_1.default));
/**
 * PUT /v1/api/food/orders/:id/cancel
 * Cancel an order
 */
router.put('/orders/:id/cancel', order_controller_1.default.cancelOrder.bind(order_controller_1.default));
/**
 * PUT /v1/api/food/orders/:id/rate
 * Rate a completed order
 */
router.put('/orders/:id/rate', order_controller_1.default.rateOrder.bind(order_controller_1.default));
exports.default = router;
