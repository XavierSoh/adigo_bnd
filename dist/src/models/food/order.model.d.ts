/**
 * Food Order Model
 * Represents a food delivery order
 */
export interface FoodOrder {
    id: string;
    customerId: number;
    restaurantId: string;
    deliveryAddress: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    deliveryInstructions?: string;
    subtotal: number;
    deliveryFee: number;
    tax: number;
    total: number;
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'in_delivery' | 'delivered' | 'cancelled';
    paymentMethod: string;
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    estimatedDeliveryTime?: Date;
    actualDeliveryTime?: Date;
    rating?: number;
    review?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateOrderDto {
    customerId: number;
    restaurantId: string;
    deliveryAddress: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    deliveryInstructions?: string;
    paymentMethod: string;
    items: OrderItemDto[];
}
export interface OrderItemDto {
    menuItemId: string;
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
export declare function mapFoodFrontendStatus(frontendStatus: string): string;
export declare function mapFoodBackendStatus(backendStatus: string): string;
