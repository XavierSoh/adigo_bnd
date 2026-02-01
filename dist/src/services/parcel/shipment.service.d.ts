/**
 * Shipment Service
 * Business logic for parcel shipment management
 */
import { ParcelShipment, CreateShipmentDto, EstimateShipmentDto, ShipmentEstimate } from '../../models/parcel/shipment.model';
export declare class ShipmentService {
    private readonly RATE_PER_KM_STANDARD;
    private readonly RATE_PER_KM_EXPRESS;
    private readonly RATE_PER_KM_SAME_DAY;
    private readonly BASE_RATE;
    private readonly INSURANCE_RATE;
    /**
     * Calculate distance using Haversine formula
     */
    private calculateDistance;
    private toRad;
    /**
     * Estimate shipment cost
     */
    estimateShipment(data: EstimateShipmentDto): Promise<ShipmentEstimate>;
    /**
     * Create a new shipment
     */
    createShipment(data: CreateShipmentDto): Promise<ParcelShipment>;
    /**
     * Get shipment by ID
     */
    getShipmentById(shipmentId: number): Promise<ParcelShipment | null>;
    /**
     * Track shipment by tracking number
     */
    trackByNumber(trackingNumber: string): Promise<ParcelShipment | null>;
    /**
     * Get customer shipments
     */
    getCustomerShipments(customerId: number): Promise<ParcelShipment[]>;
}
declare const _default: ShipmentService;
export default _default;
