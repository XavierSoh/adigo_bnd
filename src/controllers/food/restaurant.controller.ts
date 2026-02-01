/**
 * Restaurant Controller
 * HTTP handlers for restaurant endpoints
 */

import { Request, Response } from 'express';
import restaurantService from '../../services/food/restaurant.service';
import pool from '../../config/database';

export class RestaurantController {
  /**
   * GET /v1/api/food/restaurants
   * Get list of restaurants with filters
   */
  async getRestaurants(req: Request, res: Response): Promise<Response> {
    try {
      const filters = {
        category: req.query.category as string,
        latitude: req.query.latitude ? parseFloat(req.query.latitude as string) : undefined,
        longitude: req.query.longitude ? parseFloat(req.query.longitude as string) : undefined,
        radiusKm: req.query.radius ? parseFloat(req.query.radius as string) : 10,
        isAcceptingOrders: req.query.isAcceptingOrders === 'true',
        search: req.query.search as string
      };

      const restaurants = await restaurantService.getRestaurants(filters);

      return res.json({
        success: true,
        data: restaurants
      });
    } catch (error: any) {
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
  async getRestaurant(req: Request, res: Response): Promise<Response> {
    try {
      const restaurantId = parseInt((req.params as { id: string }).id);
      const restaurant = await restaurantService.getRestaurantById(restaurantId);

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
    } catch (error: any) {
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
  async getRestaurantMenu(req: Request, res: Response): Promise<Response> {
    try {
      const restaurantId = parseInt((req.params as { id: string }).id);
      const category = req.query.category as string;

      let query = 'SELECT * FROM menu_items WHERE restaurant_id = $1 AND is_available = true';
      const params: any[] = [restaurantId];

      if (category) {
        query += ' AND category = $2';
        params.push(category);
      }

      query += ' ORDER BY category, name';

      const result = await pool.query(query, params);

      return res.json({
        success: true,
        data: result.rows
      });
    } catch (error: any) {
      console.error('Error getting menu:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new RestaurantController();
