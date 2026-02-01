/**
 * Food Order Service
 * Business logic for food order management
 */
import { FoodOrder, CreateOrderDto, RateOrderDto } from '../../models/food/order.model';
export declare class OrderService {
    /**
     * Create a new food order
     */
    createOrder(data: CreateOrderDto): Promise<FoodOrder>;
    /**
     * Get order by ID
     */
    getOrderById(orderId: number): Promise<FoodOrder | null>;
    /**
     * Get customer orders
     */
    getCustomerOrders(customerId: number): Promise<FoodOrder[]>;
    /**
     * Cancel order
     */
    cancelOrder(orderId: number): Promise<FoodOrder>;
    /**
     * Rate order
     */
    rateOrder(orderId: number, data: RateOrderDto): Promise<FoodOrder>;
}
declare const _default: OrderService;
export default _default;
