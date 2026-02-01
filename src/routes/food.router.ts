/**
 * Food Delivery Routes
 * API routes for food delivery module
 */

import { Router } from 'express';
import restaurantController from '../controllers/food/restaurant.controller';
import orderController from '../controllers/food/order.controller';

const router = Router();

// ============================================
// Restaurant Routes
// ============================================

/**
 * GET /v1/api/food/restaurants
 * Get list of restaurants with filters
 */
router.get('/restaurants', restaurantController.getRestaurants.bind(restaurantController));

/**
 * GET /v1/api/food/restaurants/:id
 * Get restaurant details
 */
router.get('/restaurants/:id', restaurantController.getRestaurant.bind(restaurantController));

/**
 * GET /v1/api/food/restaurants/:id/menu
 * Get restaurant menu
 */
router.get('/restaurants/:id/menu', restaurantController.getRestaurantMenu.bind(restaurantController));

// ============================================
// Order Routes
// ============================================

/**
 * POST /v1/api/food/orders
 * Create a new food order
 */
router.post('/orders', orderController.createOrder.bind(orderController));

/**
 * GET /v1/api/food/orders/:id
 * Get order details
 */
router.get('/orders/:id', orderController.getOrder.bind(orderController));

/**
 * GET /v1/api/food/orders
 * Get customer orders history
 */
router.get('/orders', orderController.getCustomerOrders.bind(orderController));

/**
 * PUT /v1/api/food/orders/:id/cancel
 * Cancel an order
 */
router.put('/orders/:id/cancel', orderController.cancelOrder.bind(orderController));

/**
 * PUT /v1/api/food/orders/:id/rate
 * Rate a completed order
 */
router.put('/orders/:id/rate', orderController.rateOrder.bind(orderController));

export default router;
