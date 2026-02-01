/**
 * Parcel Tracking Event Model
 * Represents a tracking event for a parcel shipment
 */
export interface TrackingEvent {
    id: string;
    shipmentId: string;
    eventType: 'created' | 'picked_up' | 'at_facility' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
    description: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    createdAt: Date;
}
export interface CreateTrackingEventDto {
    shipmentId: string;
    eventType: 'created' | 'picked_up' | 'at_facility' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed';
    description: string;
    location?: string;
    latitude?: number;
    longitude?: number;
}
export interface TrackingHistory {
    shipmentId: string;
    trackingNumber: string;
    currentStatus: string;
    events: TrackingEvent[];
}
