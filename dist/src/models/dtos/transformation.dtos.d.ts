/**
 * Transformation DTOs
 * Handle conversion between nested (frontend) and flat (backend) structures
 * Author: Claude
 * Date: 2025-01-19
 */
export interface AddressDto {
    fullName: string;
    phoneNumber: string;
    street: string;
    city?: string;
    building?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
}
export interface FlatAddressFields {
    name: string;
    phone: string;
    address: string;
    street?: string;
    city?: string;
    building?: string;
    landmark?: string;
    latitude?: number;
    longitude?: number;
}
/**
 * Flatten Address object to individual fields
 */
export declare function flattenAddress(address: AddressDto, prefix: 'sender' | 'receiver'): Record<string, any>;
/**
 * Unflatten fields to Address object
 */
export declare function unflattenAddress(name: string, phone: string, address: string, latitude?: number, longitude?: number): AddressDto;
export interface ParcelDto {
    packageType: 'document' | 'package' | 'fragile';
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    isFragile: boolean;
    description?: string;
    declaredValue?: number;
}
export interface FlatParcelFields {
    parcelType?: 'document' | 'package' | 'fragile';
    weight?: number;
    dimensions?: string;
    description?: string;
    declaredValue?: number;
}
/**
 * Flatten Parcel object to individual fields
 */
export declare function flattenParcel(parcel: ParcelDto): FlatParcelFields;
/**
 * Unflatten fields to Parcel object
 */
export declare function unflattenParcel(flatFields: FlatParcelFields): ParcelDto;
export interface CreateShipmentRequestDto {
    customerId: number;
    senderAddress: AddressDto;
    receiverAddress: AddressDto;
    parcel: ParcelDto;
    deliveryType: 'standard' | 'express' | 'same_day';
    paymentMethod: string;
}
export interface FlatShipmentDto {
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
/**
 * Transform nested CreateShipmentRequest to flat DTO
 */
export declare function transformCreateShipmentRequest(request: CreateShipmentRequestDto): FlatShipmentDto;
export interface MenuItemOptionDto {
    id?: string;
    name: string;
    price: number;
}
export interface MenuItemAddonDto {
    id?: string;
    name: string;
    price: number;
    isRequired: boolean;
}
export interface MenuItemWithOptionsDto {
    id: string;
    restaurantId: string;
    name: string;
    description?: string;
    category?: 'appetizer' | 'main' | 'dessert' | 'drink';
    price: number;
    image?: string;
    isAvailable: boolean;
    isVegetarian: boolean;
    isSpicy: boolean;
    preparationTime: number;
    options: MenuItemOptionDto[];
    addons: MenuItemAddonDto[];
}
/**
 * Transform menu item with options from separate queries
 */
export declare function assembleMenuItemWithOptions(menuItem: any, options: any[], addons: any[]): Promise<MenuItemWithOptionsDto>;
export interface OrderItemSelectionDto {
    menuItemId: string;
    quantity: number;
    selectedOptionId?: string;
    selectedAddonIds: string[];
    specialInstructions?: string;
}
export interface FlatOrderItemDto {
    orderId: string;
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    specialInstructions?: string;
}
/**
 * Transform order item with selections to flat storage
 */
export declare function transformOrderItemWithSelections(orderId: string, item: OrderItemSelectionDto, unitPrice: number): {
    orderItem: FlatOrderItemDto;
    selections: {
        optionId?: string;
        addonId?: string;
    }[];
};
