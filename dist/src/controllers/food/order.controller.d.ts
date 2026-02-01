/**
 * Food Order Controller
 * HTTP handlers for food order endpoints
 */
import { Request, Response } from 'express';
export declare class OrderController {
    /**
     * POST /v1/api/food/orders
     * Create a new food order
     */
    createOrder(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/food/orders/:id
     * Get order details
     */
    getOrder(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/food/orders
     * Get customer orders
     */
    getCustomerOrders(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/food/orders/:id/cancel
     * Cancel an order
     */
    cancelOrder(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/food/orders/:id/rate
     * Rate an order
     */
    rateOrder(req: Request, res: Response): Promise<Response>;
}
declare const _default: OrderController;
export default _default;
