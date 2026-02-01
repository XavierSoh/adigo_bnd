"use strict";
/**
 * Food Order Controller
 * HTTP handlers for food order endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_service_1 = __importDefault(require("../../services/food/order.service"));
class OrderController {
    /**
     * POST /v1/api/food/orders
     * Create a new food order
     */
    async createOrder(req, res) {
        try {
            const data = req.body;
            const order = await order_service_1.default.createOrder(data);
            return res.status(201).json({
                success: true,
                data: order
            });
        }
        catch (error) {
            console.error('Error creating order:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/food/orders/:id
     * Get order details
     */
    async getOrder(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const order = await order_service_1.default.getOrderById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }
            return res.json({
                success: true,
                data: order
            });
        }
        catch (error) {
            console.error('Error getting order:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * GET /v1/api/food/orders
     * Get customer orders
     */
    async getCustomerOrders(req, res) {
        try {
            const customerId = parseInt(req.query.customerId);
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }
            const orders = await order_service_1.default.getCustomerOrders(customerId);
            return res.json({
                success: true,
                data: orders
            });
        }
        catch (error) {
            console.error('Error getting customer orders:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * PUT /v1/api/food/orders/:id/cancel
     * Cancel an order
     */
    async cancelOrder(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const order = await order_service_1.default.cancelOrder(orderId);
            return res.json({
                success: true,
                data: order
            });
        }
        catch (error) {
            console.error('Error cancelling order:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * PUT /v1/api/food/orders/:id/rate
     * Rate an order
     */
    async rateOrder(req, res) {
        try {
            const orderId = parseInt(req.params.id);
            const data = req.body;
            const order = await order_service_1.default.rateOrder(orderId, data);
            return res.json({
                success: true,
                data: order
            });
        }
        catch (error) {
            console.error('Error rating order:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.OrderController = OrderController;
exports.default = new OrderController();
