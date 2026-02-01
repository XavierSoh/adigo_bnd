/**
 * Restaurant Service
 * Business logic for restaurant management
 */
import { Restaurant, RestaurantFilters, RestaurantWithDistance } from '../../models/food/restaurant.model';
export declare class RestaurantService {
    /**
     * Get restaurants with filters
     */
    getRestaurants(filters: RestaurantFilters): Promise<RestaurantWithDistance[]>;
    /**
     * Get restaurant by ID
     */
    getRestaurantById(id: number): Promise<Restaurant | null>;
}
declare const _default: RestaurantService;
export default _default;
