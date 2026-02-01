/**
 * Shipment Controller
 * HTTP handlers for parcel shipment endpoints
 */
import { Request, Response } from 'express';
export declare class ShipmentController {
    /**
     * POST /v1/api/parcel/estimate
     * Estimate shipment cost
     */
    estimateShipment(req: Request, res: Response): Promise<Response>;
    /**
     * POST /v1/api/parcel/shipments
     * Create a new shipment
     */
    createShipment(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/parcel/shipments/:id
     * Get shipment details
     */
    getShipment(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/parcel/track/:trackingNumber
     * Track shipment by tracking number
     */
    trackShipment(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/parcel/shipments
     * Get customer shipments
     */
    getCustomerShipments(req: Request, res: Response): Promise<Response>;
}
declare const _default: ShipmentController;
export default _default;
