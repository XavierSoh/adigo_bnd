"use strict";
/**
 * Address Controller
 * HTTP handlers for saved addresses endpoints
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressController = void 0;
const address_service_1 = __importDefault(require("../../services/parcel/address.service"));
class AddressController {
    /**
     * GET /v1/api/parcel/addresses
     * Get customer saved addresses
     */
    async getAddresses(req, res) {
        try {
            const customerId = parseInt(req.query.customerId);
            if (!customerId) {
                return res.status(400).json({
                    success: false,
                    message: 'Customer ID is required'
                });
            }
            const addresses = await address_service_1.default.getCustomerAddresses(customerId);
            return res.json({
                success: true,
                data: addresses
            });
        }
        catch (error) {
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
    async createAddress(req, res) {
        try {
            const data = req.body;
            const address = await address_service_1.default.createAddress(data);
            return res.status(201).json({
                success: true,
                data: address
            });
        }
        catch (error) {
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
    async updateAddress(req, res) {
        try {
            const addressId = parseInt(req.params.id);
            const data = req.body;
            const address = await address_service_1.default.updateAddress(addressId, data);
            return res.json({
                success: true,
                data: address
            });
        }
        catch (error) {
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
    async deleteAddress(req, res) {
        try {
            const addressId = parseInt(req.params.id);
            await address_service_1.default.deleteAddress(addressId);
            return res.json({
                success: true,
                message: 'Address deleted successfully'
            });
        }
        catch (error) {
            console.error('Error deleting address:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
}
exports.AddressController = AddressController;
exports.default = new AddressController();
