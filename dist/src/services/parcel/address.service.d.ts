/**
 * Address Service
 * Business logic for saved addresses management
 */
import { SavedAddress, CreateAddressDto, UpdateAddressDto } from '../../models/parcel/address.model';
export declare class AddressService {
    /**
     * Get customer addresses
     */
    getCustomerAddresses(customerId: number): Promise<SavedAddress[]>;
    /**
     * Create a new address
     */
    createAddress(data: CreateAddressDto): Promise<SavedAddress>;
    /**
     * Update an address
     */
    updateAddress(addressId: number, data: UpdateAddressDto): Promise<SavedAddress>;
    /**
     * Delete an address
     */
    deleteAddress(addressId: number): Promise<void>;
}
declare const _default: AddressService;
export default _default;
