/**
 * VTC Ride Controller
 * HTTP handlers for ride endpoints
 */
import { Request, Response } from 'express';
export declare class RideController {
    /**
     * GET /v1/api/vtc/estimate
     * Estimate ride cost
     */
    estimateRide(req: Request, res: Response): Promise<Response>;
    /**
     * POST /v1/api/vtc/rides
     * Create a new ride
     */
    createRide(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/vtc/rides/:id
     * Get ride details
     */
    getRide(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/vtc/rides
     * Get customer rides
     */
    getCustomerRides(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/vtc/rides/:id/cancel
     * Cancel a ride
     */
    cancelRide(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/vtc/rides/:id/rate
     * Rate a ride
     */
    rateRide(req: Request, res: Response): Promise<Response>;
}
declare const _default: RideController;
export default _default;
