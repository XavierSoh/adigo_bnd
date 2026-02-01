/**
 * Restaurant Controller
 * HTTP handlers for restaurant endpoints
 */
import { Request, Response } from 'express';
export declare class RestaurantController {
    /**
     * GET /v1/api/food/restaurants
     * Get list of restaurants with filters
     */
    getRestaurants(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/food/restaurants/:id
     * Get restaurant details
     */
    getRestaurant(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/food/restaurants/:id/menu
     * Get restaurant menu
     */
    getRestaurantMenu(req: Request, res: Response): Promise<Response>;
}
declare const _default: RestaurantController;
export default _default;
