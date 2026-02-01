/**
 * Food Order Model
 * Represents a food delivery order
 */

export interface FoodOrder {
  id: string;              // UUID
  customerId: number;      // References customer table (still integer)
  restaurantId: string;    // UUID reference to restaurants

  // Delivery
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryInstructions?: string;

  // Pricing
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;

  // Status
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_delivery' | 'delivered' | 'cancelled';

  // Payment
  paymentMethod: string;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  // Tracking
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;

  // Ratings
  rating?: number;
  review?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderDto {
  customerId: number;      // References customer table (still integer)
  restaurantId: string;    // UUID
  deliveryAddress: string;
  deliveryLatitude: number;
  deliveryLongitude: number;
  deliveryInstructions?: string;
  paymentMethod: string;
  items: OrderItemDto[];
}

export interface OrderItemDto {
  menuItemId: string;      // UUID
  quantity: number;
  specialInstructions?: string;
}

export interface RateOrderDto {
  rating: number;
  review?: string;
}

/**
 * Status Mapping Helpers
 * Convert between frontend Flutter and backend statuses
 */
export function mapFoodFrontendStatus(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    'placed': 'pending',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready': 'ready',
    'pickedUp': 'in_delivery',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  };
  return mapping[frontendStatus] || 'pending';
}

export function mapFoodBackendStatus(backendStatus: string): string {
  const mapping: Record<string, string> = {
    'pending': 'placed',
    'confirmed': 'confirmed',
    'preparing': 'preparing',
    'ready': 'ready',
    'in_delivery': 'pickedUp',
    'delivered': 'delivered',
    'cancelled': 'cancelled'
  };
  return mapping[backendStatus] || 'placed';
}
