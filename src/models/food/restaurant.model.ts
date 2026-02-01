/**
 * Restaurant Model
 * Represents a restaurant in the food delivery system
 */

export interface Restaurant {
  id: string;              // UUID
  name: string;
  description?: string;
  category?: 'fast_food' | 'restaurant' | 'cafe' | 'bakery';
  logo?: string;
  coverImage?: string;
  phone?: string;
  email?: string;

  // Address
  address: string;
  latitude: number;
  longitude: number;

  // Business hours
  openingHours?: Record<string, { open: string; close: string }>;

  // Ratings
  rating: number;
  totalReviews: number;

  // Delivery
  deliveryFee: number;
  minOrderAmount: number;
  deliveryTime: number;

  // Status
  isActive: boolean;
  isAcceptingOrders: boolean;

  // Timestamps
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
