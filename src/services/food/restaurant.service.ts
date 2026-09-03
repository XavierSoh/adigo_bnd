/**
 * Restaurant Service
 * Business logic for restaurant management
 *
 * Migrated from pg-promise to Prisma (raw queries via the pg-promise-shaped
 * shim in ../../utils/prisma-compat.ts) — see BOOKING_MODULE_NOTES.md.
 * NOTE: no `restaurants`/`menu_items` tables exist in the live schema —
 * every call here 500s with "relation does not exist" regardless of driver,
 * confirmed pre-existing (this whole food module was never actually built
 * against a real schema). Not fixed here — out of scope for a driver swap,
 * see BOOKING_MODULE_NOTES.md.
 */

import { pgAny, pgOneOrNone } from '../../utils/prisma-compat';
import { Restaurant, RestaurantFilters, RestaurantWithDistance } from '../../models/food/restaurant.model';

export class RestaurantService {
  /**
   * Get restaurants with filters
   */
  async getRestaurants(filters: RestaurantFilters): Promise<RestaurantWithDistance[]> {
    let query = `SELECT *`;
    const params: any[] = [];
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

    return await pgAny(query, params);
  }

  /**
   * Get restaurant by ID
   */
  async getRestaurantById(id: number): Promise<Restaurant | null> {
    const query = 'SELECT * FROM restaurants WHERE id = $1';
    return await pgOneOrNone(query, [id]);
  }
}

export default new RestaurantService();
