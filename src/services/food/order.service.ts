/**
 * Food Order Service
 * Business logic for food order management
 *
 * Migrated from pg-promise to Prisma (raw queries via the pg-promise-shaped
 * shim in ../../utils/prisma-compat.ts) — see BOOKING_MODULE_NOTES.md.
 * NOTE: no `restaurants`/`menu_items`/`food_orders`/`food_order_items`
 * tables exist in the live schema — every call here 500s with "relation
 * does not exist" regardless of driver, confirmed pre-existing. Not fixed
 * here — out of scope for a driver swap, see BOOKING_MODULE_NOTES.md.
 */

import { pgOne, pgOneOrNone, pgAny, pgNone, pgTransaction } from '../../utils/prisma-compat';
import { FoodOrder, CreateOrderDto, RateOrderDto } from '../../models/food/order.model';

export class OrderService {
  /**
   * Create a new food order
   */
  async createOrder(data: CreateOrderDto): Promise<FoodOrder> {
    return await pgTransaction(async (tx) => {
      // Get restaurant info
      const restaurant = await pgOneOrNone(
        'SELECT delivery_fee FROM restaurants WHERE id = $1',
        [data.restaurantId],
        tx
      );
      const deliveryFee = restaurant?.delivery_fee || 0;

      // Calculate subtotal
      let subtotal = 0;
      for (const item of data.items) {
        const menuItem = await pgOneOrNone('SELECT price FROM menu_items WHERE id = $1', [item.menuItemId], tx);
        const price = menuItem?.price || 0;
        subtotal += price * item.quantity;
      }

      const tax = Math.round(subtotal * 0.05); // 5% tax
      const total = subtotal + deliveryFee + tax;

      // Create order
      const orderQuery = `
        INSERT INTO food_orders (
          customer_id, restaurant_id,
          delivery_address, delivery_latitude, delivery_longitude,
          delivery_instructions,
          subtotal, delivery_fee, tax, total,
          payment_method, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const orderValues = [
        data.customerId, data.restaurantId,
        data.deliveryAddress, data.deliveryLatitude, data.deliveryLongitude,
        data.deliveryInstructions,
        subtotal, deliveryFee, tax, total,
        data.paymentMethod, 'pending'
      ];

      const order = await pgOne(orderQuery, orderValues, tx);

      // Create order items
      for (const item of data.items) {
        const menuItem = await pgOneOrNone('SELECT price FROM menu_items WHERE id = $1', [item.menuItemId], tx);
        const unitPrice = menuItem?.price || 0;

        const itemInsertQuery = `
          INSERT INTO food_order_items (
            order_id, menu_item_id, quantity, unit_price, subtotal, special_instructions
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await pgNone(itemInsertQuery, [
          order.id, item.menuItemId, item.quantity,
          unitPrice, unitPrice * item.quantity, item.specialInstructions
        ], tx);
      }

      return order;
    });
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: number): Promise<FoodOrder | null> {
    const query = 'SELECT * FROM food_orders WHERE id = $1';
    return await pgOneOrNone(query, [orderId]);
  }

  /**
   * Get customer orders
   */
  async getCustomerOrders(customerId: number): Promise<FoodOrder[]> {
    const query = `
      SELECT * FROM food_orders
      WHERE customer_id = $1
      ORDER BY created_at DESC
    `;
    return await pgAny(query, [customerId]);
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number): Promise<FoodOrder | null> {
    const query = `
      UPDATE food_orders
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *
    `;
    return await pgOneOrNone(query, [orderId]);
  }

  /**
   * Rate order
   */
  async rateOrder(orderId: number, data: RateOrderDto): Promise<FoodOrder | null> {
    const query = `
      UPDATE food_orders
      SET rating = $1, review = $2
      WHERE id = $3
      RETURNING *
    `;
    return await pgOneOrNone(query, [data.rating, data.review, orderId]);
  }
}

export default new OrderService();
