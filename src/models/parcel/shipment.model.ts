/**
 * Parcel Shipment Model
 * Represents a parcel shipment in the delivery system
 */

export interface ParcelShipment {
  id: string;              // UUID
  trackingNumber: string;
  customerId: number;      // References customer table (still integer)

  // Sender
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderLatitude?: number;
  senderLongitude?: number;

  // Receiver
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverLatitude?: number;
  receiverLongitude?: number;

  // Parcel details
  parcelType?: 'document' | 'package' | 'fragile';
  weight?: number;
  dimensions?: string;
  description?: string;
  declaredValue?: number;

  // Pricing
  shippingRate: number;
  insuranceFee: number;
  totalCost: number;

  // Delivery
  deliveryType: 'standard' | 'express' | 'same_day';
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;

  // Status
  status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';

  // Payment
  paymentMethod: string;
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

  // Current location
  currentLocation?: string;
  currentLatitude?: number;
  currentLongitude?: number;

  // Proof of delivery (field names updated in migration 004)
  recipientSignature?: string;
  proofOfDeliveryUrl?: string;
  deliveredTo?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateShipmentDto {
  customerId: number;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderLatitude?: number;
  senderLongitude?: number;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverLatitude?: number;
  receiverLongitude?: number;
  parcelType?: 'document' | 'package' | 'fragile';
  weight?: number;
  dimensions?: string;
  description?: string;
  declaredValue?: number;
  deliveryType: 'standard' | 'express' | 'same_day';
  paymentMethod: string;
}

export interface EstimateShipmentDto {
  senderLatitude: number;
  senderLongitude: number;
  receiverLatitude: number;
  receiverLongitude: number;
  deliveryType: 'standard' | 'express' | 'same_day';
  weight?: number;
  declaredValue?: number;
}

export interface ShipmentEstimate {
  shippingRate: number;
  insuranceFee: number;
  totalCost: number;
  estimatedDeliveryDate: Date;
  distance: number;
}

/**
 * Status Mapping Helpers
 * Convert between frontend Flutter and backend statuses
 */
export function mapParcelFrontendStatus(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    'pending': 'pending',
    'confirmed': 'picked_up',
    'pickedUp': 'picked_up',
    'inTransit': 'in_transit',
    'outForDelivery': 'out_for_delivery',
    'delivered': 'delivered',
    'failed': 'failed',
    'cancelled': 'cancelled'
  };
  return mapping[frontendStatus] || 'pending';
}

export function mapParcelBackendStatus(backendStatus: string): string {
  const mapping: Record<string, string> = {
    'pending': 'pending',
    'picked_up': 'pickedUp',
    'in_transit': 'inTransit',
    'out_for_delivery': 'outForDelivery',
    'delivered': 'delivered',
    'failed': 'failed',
    'cancelled': 'cancelled'
  };
  return mapping[backendStatus] || 'pending';
}
