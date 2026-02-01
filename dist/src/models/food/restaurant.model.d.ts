/**
 * Restaurant Model
 * Represents a restaurant in the food delivery system
 */
export interface Restaurant {
    id: string;
    name: string;
    description?: string;
    category?: 'fast_food' | 'restaurant' | 'cafe' | 'bakery';
    logo?: string;
    coverImage?: string;
    phone?: string;
    email?: string;
    address: string;
    latitude: number;
    longitude: number;
    openingHours?: Record<string, {
        open: string;
        close: string;
    }>;
    rating: number;
    totalReviews: number;
    deliveryFee: number;
    minOrderAmount: number;
    deliveryTime: number;
    isActive: boolean;
    isAcceptingOrders: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface RestaurantFilters {
    category?: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    isAcceptingOrders?: boolean;
    search?: string;
}
export interface RestaurantWithDistance extends Restaurant {
    distance?: number;
}
