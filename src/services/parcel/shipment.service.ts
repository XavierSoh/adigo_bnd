/**
 * Shipment Service
 * Business logic for parcel shipment management
 */

import pool from '../../config/database';
import {
  ParcelShipment,
  CreateShipmentDto,
  EstimateShipmentDto,
  ShipmentEstimate
} from '../../models/parcel/shipment.model';

export class ShipmentService {
  private readonly RATE_PER_KM_STANDARD = 100; // FCFA
  private readonly RATE_PER_KM_EXPRESS = 200;
  private readonly RATE_PER_KM_SAME_DAY = 350;
  private readonly BASE_RATE = 500;
  private readonly INSURANCE_RATE = 0.02; // 2% of declared value

  /**
   * Calculate distance using Haversine formula
   */
  private calculateDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 100) / 100;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Estimate shipment cost
   */
  async estimateShipment(data: EstimateShipmentDto): Promise<ShipmentEstimate> {
    const distance = this.calculateDistance(
      data.senderLatitude, data.senderLongitude,
      data.receiverLatitude, data.receiverLongitude
    );

    let ratePerKm = this.RATE_PER_KM_STANDARD;
    let deliveryDays = 3;

    if (data.deliveryType === 'express') {
      ratePerKm = this.RATE_PER_KM_EXPRESS;
      deliveryDays = 1;
    } else if (data.deliveryType === 'same_day') {
      ratePerKm = this.RATE_PER_KM_SAME_DAY;
      deliveryDays = 0;
    }

    const shippingRate = this.BASE_RATE + (distance * ratePerKm);
    const insuranceFee = data.declaredValue ? Math.round(data.declaredValue * this.INSURANCE_RATE) : 0;
    const totalCost = Math.round(shippingRate + insuranceFee);

    const estimatedDeliveryDate = new Date();
    estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + deliveryDays);

    return {
      shippingRate: Math.round(shippingRate),
      insuranceFee,
      totalCost,
      estimatedDeliveryDate,
      distance
    };
  }

  /**
   * Create a new shipment
   */
  async createShipment(data: CreateShipmentDto): Promise<ParcelShipment> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate tracking number
      const trackingQuery = 'SELECT generate_tracking_number() as tracking_number';
      const trackingResult = await client.query(trackingQuery);
      const trackingNumber = trackingResult.rows[0].tracking_number;

      // Estimate cost if coordinates provided
      let estimate;
      if (data.senderLatitude && data.senderLongitude &&
          data.receiverLatitude && data.receiverLongitude) {
        estimate = await this.estimateShipment({
          senderLatitude: data.senderLatitude,
          senderLongitude: data.senderLongitude,
          receiverLatitude: data.receiverLatitude,
          receiverLongitude: data.receiverLongitude,
          deliveryType: data.deliveryType,
          weight: data.weight,
          declaredValue: data.declaredValue
        });
      } else {
        estimate = {
          shippingRate: this.BASE_RATE,
          insuranceFee: 0,
          totalCost: this.BASE_RATE,
          estimatedDeliveryDate: new Date()
        };
      }

      // Create shipment
      const query = `
        INSERT INTO parcel_shipments (
          tracking_number, customer_id,
          sender_name, sender_phone, sender_address, sender_latitude, sender_longitude,
          receiver_name, receiver_phone, receiver_address, receiver_latitude, receiver_longitude,
          parcel_type, weight, dimensions, description, declared_value,
          shipping_rate, insurance_fee, total_cost,
          delivery_type, estimated_delivery_date,
          payment_method, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
      `;

      const values = [
        trackingNumber, data.customerId,
        data.senderName, data.senderPhone, data.senderAddress,
        data.senderLatitude, data.senderLongitude,
        data.receiverName, data.receiverPhone, data.receiverAddress,
        data.receiverLatitude, data.receiverLongitude,
        data.parcelType, data.weight, data.dimensions, data.description, data.declaredValue,
        estimate.shippingRate, estimate.insuranceFee, estimate.totalCost,
        data.deliveryType, estimate.estimatedDeliveryDate,
        data.paymentMethod, 'pending'
      ];

      const result = await client.query(query, values);

      // Create initial tracking event
      const eventQuery = `
        INSERT INTO parcel_tracking_events (shipment_id, event_type, description, location)
        VALUES ($1, $2, $3, $4)
      `;

      await client.query(eventQuery, [
        result.rows[0].id,
        'created',
        'Shipment created and awaiting pickup',
        data.senderAddress
      ]);

      await client.query('COMMIT');
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get shipment by ID
   */
  async getShipmentById(shipmentId: number): Promise<ParcelShipment | null> {
    const query = 'SELECT * FROM parcel_shipments WHERE id = $1';
    const result = await pool.query(query, [shipmentId]);
    return result.rows[0] || null;
  }

  /**
   * Track shipment by tracking number
   */
  async trackByNumber(trackingNumber: string): Promise<ParcelShipment | null> {
    const query = 'SELECT * FROM parcel_shipments WHERE tracking_number = $1';
    const result = await pool.query(query, [trackingNumber]);
    return result.rows[0] || null;
  }

  /**
   * Get customer shipments
   */
  async getCustomerShipments(customerId: number): Promise<ParcelShipment[]> {
    const query = `
      SELECT * FROM parcel_shipments
      WHERE customer_id = $1
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [customerId]);
    return result.rows;
  }
}

export default new ShipmentService();
