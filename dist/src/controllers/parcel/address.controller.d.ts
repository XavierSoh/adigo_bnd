/**
 * Address Controller
 * HTTP handlers for saved addresses endpoints
 */
import { Request, Response } from 'express';
export declare class AddressController {
    /**
     * GET /v1/api/parcel/addresses
     * Get customer saved addresses
     */
    getAddresses(req: Request, res: Response): Promise<Response>;
    /**
     * POST /v1/api/parcel/addresses
     * Create a new saved address
     */
    createAddress(req: Request, res: Response): Promise<Response>;
    /**
     * PUT /v1/api/parcel/addresses/:id
     * Update a saved address
     */
    updateAddress(req: Request, res: Response): Promise<Response>;
    /**
     * DELETE /v1/api/parcel/addresses/:id
     * Delete a saved address
     */
    deleteAddress(req: Request, res: Response): Promise<Response>;
}
declare const _default: AddressController;
export default _default;
