/**
 * Address Controller
 * HTTP handlers for saved addresses endpoints
 */

import { Request, Response } from 'express';
import addressService from '../../services/parcel/address.service';
import { CreateAddressDto, UpdateAddressDto } from '../../models/parcel/address.model';

export class AddressController {
  /**
   * GET /v1/api/parcel/addresses
   * Get customer saved addresses
   */
  async getAddresses(req: Request, res: Response): Promise<Response> {
    try {
      const customerId = parseInt(req.query.customerId as string);

      if (!customerId) {
        return res.status(400).json({
          success: false,
          message: 'Customer ID is required'
        });
      }

      const addresses = await addressService.getCustomerAddresses(customerId);

      return res.json({
        success: true,
        data: addresses
      });
    } catch (error: any) {
      console.error('Error getting addresses:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /v1/api/parcel/addresses
   * Create a new saved address
   */
  async createAddress(req: Request, res: Response): Promise<Response> {
    try {
      const data: CreateAddressDto = req.body;
      const address = await addressService.createAddress(data);

      return res.status(201).json({
        success: true,
        data: address
      });
    } catch (error: any) {
      console.error('Error creating address:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /v1/api/parcel/addresses/:id
   * Update a saved address
   */
  async updateAddress(req: Request, res: Response): Promise<Response> {
    try {
      const addressId = parseInt(req.params.id);
      const data: UpdateAddressDto = req.body;

      const address = await addressService.updateAddress(addressId, data);

      return res.json({
        success: true,
        data: address
      });
    } catch (error: any) {
      console.error('Error updating address:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /v1/api/parcel/addresses/:id
   * Delete a saved address
   */
  async deleteAddress(req: Request, res: Response): Promise<Response> {
    try {
      const addressId = parseInt(req.params.id);
      await addressService.deleteAddress(addressId);

      return res.json({
        success: true,
        message: 'Address deleted successfully'
      });
    } catch (error: any) {
      console.error('Error deleting address:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

export default new AddressController();
