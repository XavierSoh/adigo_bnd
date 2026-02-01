/**
 * VTC Driver Controller
 * HTTP handlers for driver endpoints
 */
import { Request, Response } from 'express';
export declare class DriverController {
    /**
     * GET /v1/api/vtc/drivers/nearby
     * Get nearby available drivers
     */
    getNearbyDrivers(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/vtc/drivers/:id/location
     * Update driver location
     */
    updateLocation(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/vtc/drivers/:id/status
     * Update driver status
     */
    updateStatus(req: Request, res: Response): Promise<Response>;
    /**
     * GET /v1/api/vtc/drivers/:id
     * Get driver details
     */
    getDriver(req: Request, res: Response): Promise<Response>;
}
declare const _default: DriverController;
export default _default;
