/**
 * Parcel Shipment Model
 * Represents a parcel shipment in the delivery system
 */
export interface ParcelShipment {
    id: string;
    trackingNumber: string;
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
    shippingRate: number;
    insuranceFee: number;
    totalCost: number;
    deliveryType: 'standard' | 'express' | 'same_day';
    estimatedDeliveryDate?: Date;
    actualDeliveryDate?: Date;
    status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'cancelled';
    paymentMethod: string;
    paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
    currentLocation?: string;
    currentLatitude?: number;
    currentLongitude?: number;
    recipientSignature?: string;
    proofOfDeliveryUrl?: string;
    deliveredTo?: string;
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
export declare function mapParcelFrontendStatus(frontendStatus: string): string;
export declare function mapParcelBackendStatus(backendStatus: string): string;
