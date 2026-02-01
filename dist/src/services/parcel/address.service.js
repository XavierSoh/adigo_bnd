"use strict";
/**
 * Address Service
 * Business logic for saved addresses management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const database_1 = __importDefault(require("../../config/database"));
class AddressService {
    /**
     * Get customer addresses
     */
    async getCustomerAddresses(customerId) {
        const query = `
      SELECT * FROM saved_addresses
      WHERE customer_id = $1
      ORDER BY is_default DESC, created_at DESC
    `;
        const result = await database_1.default.query(query, [customerId]);
        return result.rows;
    }
    /**
     * Create a new address
     */
    async createAddress(data) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // If this is default, unset other defaults
            if (data.isDefault) {
                await client.query('UPDATE saved_addresses SET is_default = false WHERE customer_id = $1', [data.customerId]);
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
                data.customerId, data.label, data.name, data.phone, data.address,
                data.street, data.city, data.building, data.landmark,
                data.latitude, data.longitude, data.isDefault || false
            ];
            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Update an address
     */
    async updateAddress(addressId, data) {
        const client = await database_1.default.connect();
        try {
            await client.query('BEGIN');
            // If setting as default, unset other defaults
            if (data.isDefault) {
                const getCustomerQuery = 'SELECT customer_id FROM saved_addresses WHERE id = $1';
                const customerResult = await client.query(getCustomerQuery, [addressId]);
                if (customerResult.rows.length > 0) {
                    await client.query('UPDATE saved_addresses SET is_default = false WHERE customer_id = $1', [customerResult.rows[0].customer_id]);
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Delete an address
     */
    async deleteAddress(addressId) {
        const query = 'DELETE FROM saved_addresses WHERE id = $1';
        await database_1.default.query(query, [addressId]);
    }
}
exports.AddressService = AddressService;
exports.default = new AddressService();
