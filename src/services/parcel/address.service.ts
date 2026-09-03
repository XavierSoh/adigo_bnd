/**
 * Address Service
 * Business logic for saved addresses management
 *
 * Migrated from pg-promise to Prisma (raw queries via the pg-promise-shaped
 * shim in ../../utils/prisma-compat.ts) — see BOOKING_MODULE_NOTES.md.
 * NOTE: no `saved_addresses` table exists in the live schema — every call
 * here 500s with "relation does not exist" regardless of driver, confirmed
 * pre-existing. Not fixed here — out of scope for a driver swap, see
 * BOOKING_MODULE_NOTES.md.
 */

import { pgOne, pgOneOrNone, pgAny, pgNone, pgTransaction } from '../../utils/prisma-compat';
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
    return await pgAny(query, [customerId]);
  }

  /**
   * Create a new address
   */
  async createAddress(data: CreateAddressDto): Promise<SavedAddress> {
    return await pgTransaction(async (tx) => {
      // If this is default, unset other defaults
      if (data.isDefault) {
        await pgNone(
          'UPDATE saved_addresses SET is_default = false WHERE customer_id = $1',
          [data.customerId],
          tx
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

      return await pgOne(query, values, tx);
    });
  }

  /**
   * Update an address
   */
  async updateAddress(addressId: number, data: UpdateAddressDto): Promise<SavedAddress | null> {
    return await pgTransaction(async (tx) => {
      // If setting as default, unset other defaults
      if (data.isDefault) {
        const owner = await pgOneOrNone('SELECT customer_id FROM saved_addresses WHERE id = $1', [addressId], tx);

        if (owner) {
          await pgNone(
            'UPDATE saved_addresses SET is_default = false WHERE customer_id = $1',
            [owner.customer_id],
            tx
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

      return await pgOneOrNone(query, values, tx);
    });
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: number): Promise<void> {
    const query = 'DELETE FROM saved_addresses WHERE id = $1';
    await pgNone(query, [addressId]);
  }
}

export default new AddressService();
