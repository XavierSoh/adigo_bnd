/**
 * Transformation DTOs
 * Handle conversion between nested (frontend) and flat (backend) structures
 * Author: Claude
 * Date: 2025-01-19
 */

// ============================================
// ADDRESS DTOs (for Parcel module)
// ============================================

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
  address: string;  // Concatenated full address
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
export function flattenAddress(
  address: AddressDto,
  prefix: 'sender' | 'receiver'
): Record<string, any> {
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
export function unflattenAddress(
  name: string,
  phone: string,
  address: string,
  latitude?: number,
  longitude?: number
): AddressDto {
  return {
    fullName: name,
    phoneNumber: phone,
    street: address,
    latitude,
    longitude
  };
}

// ============================================
// PARCEL DTOs
// ============================================

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
  dimensions?: string;  // "30x20x10"
  description?: string;
  declaredValue?: number;
}

/**
 * Flatten Parcel object to individual fields
 */
export function flattenParcel(parcel: ParcelDto): FlatParcelFields {
  let dimensions: string | undefined;

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
export function unflattenParcel(flatFields: FlatParcelFields): ParcelDto {
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

// ============================================
// SHIPMENT DTOs
// ============================================

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

  // Sender (flattened)
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderLatitude?: number;
  senderLongitude?: number;

  // Receiver (flattened)
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverLatitude?: number;
  receiverLongitude?: number;

  // Parcel (flattened)
  parcelType?: 'document' | 'package' | 'fragile';
  weight?: number;
  dimensions?: string;
  description?: string;
  declaredValue?: number;

  // Delivery
  deliveryType: 'standard' | 'express' | 'same_day';
  paymentMethod: string;
}

/**
 * Transform nested CreateShipmentRequest to flat DTO
 */
export function transformCreateShipmentRequest(
  request: CreateShipmentRequestDto
): FlatShipmentDto {
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

// ============================================
// MENU ITEM DTOs (for Food module)
// ============================================

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
  options: MenuItemOptionDto[];  // Nested
  addons: MenuItemAddonDto[];    // Nested
}

/**
 * Transform menu item with options from separate queries
 */
export async function assembleMenuItemWithOptions(
  menuItem: any,
  options: any[],
  addons: any[]
): Promise<MenuItemWithOptionsDto> {
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

// ============================================
// ORDER ITEM SELECTION DTOs
// ============================================

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
export function transformOrderItemWithSelections(
  orderId: string,
  item: OrderItemSelectionDto,
  unitPrice: number
): {
  orderItem: FlatOrderItemDto;
  selections: { optionId?: string; addonId?: string }[];
} {
  const orderItem: FlatOrderItemDto = {
    orderId,
    menuItemId: item.menuItemId,
    quantity: item.quantity,
    unitPrice,
    subtotal: unitPrice * item.quantity,
    specialInstructions: item.specialInstructions
  };

  const selections: { optionId?: string; addonId?: string }[] = [];

  if (item.selectedOptionId) {
    selections.push({ optionId: item.selectedOptionId });
  }

  for (const addonId of item.selectedAddonIds) {
    selections.push({ addonId });
  }

  return { orderItem, selections };
}
