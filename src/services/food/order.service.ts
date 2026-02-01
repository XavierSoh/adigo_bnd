/**
 * Food Order Service
 * Business logic for food order management
 */

import pool from '../../config/database';
import { FoodOrder, CreateOrderDto, RateOrderDto } from '../../models/food/order.model';

export class OrderService {
  /**
   * Create a new food order
   */
  async createOrder(data: CreateOrderDto): Promise<FoodOrder> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get restaurant info
      const restaurantQuery = 'SELECT delivery_fee FROM restaurants WHERE id = $1';
      const restaurantResult = await client.query(restaurantQuery, [data.restaurantId]);
      const deliveryFee = restaurantResult.rows[0]?.delivery_fee || 0;

      // Calculate subtotal
      let subtotal = 0;
      for (const item of data.items) {
        const itemQuery = 'SELECT price FROM menu_items WHERE id = $1';
        const itemResult = await client.query(itemQuery, [item.menuItemId]);
        const price = itemResult.rows[0]?.price || 0;
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

      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      // Create order items
      for (const item of data.items) {
        const itemQuery = 'SELECT price FROM menu_items WHERE id = $1';
        const itemResult = await client.query(itemQuery, [item.menuItemId]);
        const unitPrice = itemResult.rows[0]?.price || 0;

        const itemInsertQuery = `
          INSERT INTO food_order_items (
            order_id, menu_item_id, quantity, unit_price, subtotal, special_instructions
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `;

        await client.query(itemInsertQuery, [
          order.id, item.menuItemId, item.quantity,
          unitPrice, unitPrice * item.quantity, item.specialInstructions
        ]);
      }

      await client.query('COMMIT');
      return order;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Connection is managed by pg-promise
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: number): Promise<FoodOrder | null> {
    const query = 'SELECT * FROM food_orders WHERE id = $1';
    const result = await pool.query(query, [orderId]);
    return result.rows[0] || null;
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
    const result = await pool.query(query, [customerId]);
    return result.rows;
  }

  /**
   * Cancel order
   */
  async cancelOrder(orderId: number): Promise<FoodOrder> {
    const query = `
      UPDATE food_orders
      SET status = 'cancelled'
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [orderId]);
    return result.rows[0];
  }

  /**
   * Rate order
   */
  async rateOrder(orderId: number, data: RateOrderDto): Promise<FoodOrder> {
    const query = `
      UPDATE food_orders
      SET rating = $1, review = $2
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [data.rating, data.review, orderId]);
    return result.rows[0];
  }
}

export default new OrderService();
