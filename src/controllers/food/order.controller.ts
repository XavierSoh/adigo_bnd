/**
 * Food Order Controller
 * HTTP handlers for food order endpoints
 */

import { Request, Response } from 'express';
import orderService from '../../services/food/order.service';
import { CreateOrderDto, RateOrderDto } from '../../models/food/order.model';

export class OrderController {
  /**
   * POST /v1/api/food/orders
   * Create a new food order
   */
  async createOrder(req: Request, res: Response): Promise<Response> {
    try {
      const data: CreateOrderDto = req.body;
      const order = await orderService.createOrder(data);

      return res.status(201).json({
        success: true,
        data: order
      });
    } catch (error: any) {
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
  async getOrder(req: Request, res: Response): Promise<Response> {
    try {
      const orderId = parseInt(req.params.id);
      const order = await orderService.getOrderById(orderId);

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
    } catch (error: any) {
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
  async getCustomerOrders(req: Request, res: Response): Promise<Response> {
    try {
      const customerId = parseInt(req.query.customerId as string);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      const orders = await orderService.getCustomerOrders(customerId);

      return res.json({
        success: true,
        data: orders
      });
    } catch (error: any) {
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
  async cancelOrder(req: Request, res: Response): Promise<Response> {
    try {
      const orderId = parseInt(req.params.id);
      const order = await orderService.cancelOrder(orderId);

      return res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
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
  async rateOrder(req: Request, res: Response): Promise<Response> {
    try {
      const orderId = parseInt(req.params.id);
      const data: RateOrderDto = req.body;

      const order = await orderService.rateOrder(orderId, data);

      return res.json({
        success: true,
        data: order
      });
    } catch (error: any) {
      console.error('Error rating order:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new OrderController();
