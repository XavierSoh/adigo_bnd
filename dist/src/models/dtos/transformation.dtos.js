"use strict";
/**
 * Transformation DTOs
 * Handle conversion between nested (frontend) and flat (backend) structures
 * Author: Claude
 * Date: 2025-01-19
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.flattenAddress = flattenAddress;
exports.unflattenAddress = unflattenAddress;
exports.flattenParcel = flattenParcel;
exports.unflattenParcel = unflattenParcel;
exports.transformCreateShipmentRequest = transformCreateShipmentRequest;
exports.assembleMenuItemWithOptions = assembleMenuItemWithOptions;
exports.transformOrderItemWithSelections = transformOrderItemWithSelections;
/**
 * Flatten Address object to individual fields
 */
function flattenAddress(address, prefix) {
    const fullAddress = [
        address.street,
        address.building,
        address.city,
        address.landmark
    ].filter(Boolean).join(', ');
    return {
        [`${prefix}Name`]: address.fullName,
        [`${prefix}Phone`]: address.phoneNumber,
        [`${prefix}Address`]: fullAddress || address.street,
        [`${prefix}Latitude`]: address.latitude,
        [`${prefix}Longitude`]: address.longitude
    };
}
/**
 * Unflatten fields to Address object
 */
function unflattenAddress(name, phone, address, latitude, longitude) {
    return {
        fullName: name,
        phoneNumber: phone,
        street: address,
        latitude,
        longitude
    };
}
/**
 * Flatten Parcel object to individual fields
 */
function flattenParcel(parcel) {
    let dimensions;
    if (parcel.length && parcel.width && parcel.height) {
        dimensions = `${parcel.length}x${parcel.width}x${parcel.height}`;
    }
    return {
        parcelType: parcel.packageType,
        weight: parcel.weight,
        dimensions,
        description: parcel.description,
        declaredValue: parcel.declaredValue
    };
}
/**
 * Unflatten fields to Parcel object
 */
function unflattenParcel(flatFields) {
    let length, width, height;
    if (flatFields.dimensions) {
        const dims = flatFields.dimensions.split('x').map(Number);
        [length, width, height] = dims;
    }
    return {
        packageType: flatFields.parcelType || 'package',
        weight: flatFields.weight,
        length,
        width,
        height,
        isFragile: flatFields.parcelType === 'fragile',
        description: flatFields.description,
        declaredValue: flatFields.declaredValue
    };
}
/**
 * Transform nested CreateShipmentRequest to flat DTO
 */
function transformCreateShipmentRequest(request) {
    const senderFields = flattenAddress(request.senderAddress, 'sender');
    const receiverFields = flattenAddress(request.receiverAddress, 'receiver');
    const parcelFields = flattenParcel(request.parcel);
    return {
        customerId: request.customerId,
        senderName: senderFields.senderName,
        senderPhone: senderFields.senderPhone,
        senderAddress: senderFields.senderAddress,
        senderLatitude: senderFields.senderLatitude,
        senderLongitude: senderFields.senderLongitude,
        receiverName: receiverFields.receiverName,
        receiverPhone: receiverFields.receiverPhone,
        receiverAddress: receiverFields.receiverAddress,
        receiverLatitude: receiverFields.receiverLatitude,
        receiverLongitude: receiverFields.receiverLongitude,
        ...parcelFields,
        deliveryType: request.deliveryType,
        paymentMethod: request.paymentMethod
    };
}
/**
 * Transform menu item with options from separate queries
 */
async function assembleMenuItemWithOptions(menuItem, options, addons) {
    return {
        id: menuItem.id,
        restaurantId: menuItem.restaurant_id,
        name: menuItem.name,
        description: menuItem.description,
        category: menuItem.category,
        price: menuItem.price,
        image: menuItem.image,
        isAvailable: menuItem.is_available,
        isVegetarian: menuItem.is_vegetarian,
        isSpicy: menuItem.is_spicy,
        preparationTime: menuItem.preparation_time,
        options: options.map(opt => ({
            id: opt.id,
            name: opt.name,
            price: opt.price
        })),
        addons: addons.map(addon => ({
            id: addon.id,
            name: addon.name,
            price: addon.price,
            isRequired: addon.is_required
        }))
    };
}
/**
 * Transform order item with selections to flat storage
 */
function transformOrderItemWithSelections(orderId, item, unitPrice) {
    const orderItem = {
        orderId,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        specialInstructions: item.specialInstructions
    };
    const selections = [];
    if (item.selectedOptionId) {
        selections.push({ optionId: item.selectedOptionId });
    }
    for (const addonId of item.selectedAddonIds) {
        selections.push({ addonId });
    }
    return { orderItem, selections };
}
