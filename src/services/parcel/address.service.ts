/**
 * Address Service
 * Business logic for saved addresses management
 */

import pool from '../../config/database';
import { SavedAddress, CreateAddressDto, UpdateAddressDto } from '../../models/parcel/address.model';

export class AddressService {
  /**
   * Get customer addresses
   */
  async getCustomerAddresses(customerId: number): Promise<SavedAddress[]> {
    const query = `
      SELECT * FROM saved_addresses
      WHERE customer_id = $1
      ORDER BY is_default DESC, created_at DESC
    `;
    const result = await pool.query(query, [customerId]);
    return result.rows;
  }

  /**
   * Create a new address
   */
  async createAddress(data: CreateAddressDto): Promise<SavedAddress> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If this is default, unset other defaults
      if (data.isDefault) {
        await client.query(
          'UPDATE saved_addresses SET is_default = false WHERE customer_id = $1',
          [data.customerId]
        );
      }

      const query = `
        INSERT INTO saved_addresses (
          customer_id, label, name, phone, address,
          street, city, building, landmark,
          latitude, longitude, is_default
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;

      const values = [
        data.customerId, data.label, data.fullName, data.phoneNumber, data.address,
        data.street, data.city, data.building, data.landmark,
        data.latitude, data.longitude, data.isDefault || false
      ];

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Connection is managed by pg-promise
    }
  }

  /**
   * Update an address
   */
  async updateAddress(addressId: number, data: UpdateAddressDto): Promise<SavedAddress> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // If setting as default, unset other defaults
      if (data.isDefault) {
        const getCustomerQuery = 'SELECT customer_id FROM saved_addresses WHERE id = $1';
        const customerResult = await client.query(getCustomerQuery, [addressId]);

        if (customerResult.rows.length > 0) {
          await client.query(
            'UPDATE saved_addresses SET is_default = false WHERE customer_id = $1',
            [customerResult.rows[0].customer_id]
          );
        }
      }

      const fields = [];
      const values = [];
      let index = 1;

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          fields.push(`${key.replace(/[A-Z]/g, '_$&').toLowerCase()} = $${index}`);
          values.push(value);
          index++;
        }
      }

      if (fields.length === 0) {
        throw new Error('No fields to update');
      }

      values.push(addressId);
      const query = `
        UPDATE saved_addresses
        SET ${fields.join(', ')}
        WHERE id = $${index}
        RETURNING *
      `;

      const result = await client.query(query, values);
      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // Connection is managed by pg-promise
    }
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: number): Promise<void> {
    const query = 'DELETE FROM saved_addresses WHERE id = $1';
    await pool.query(query, [addressId]);
  }
}

export default new AddressService();
