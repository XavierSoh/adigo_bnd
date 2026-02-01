/**
 * Saved Address Model
 * Represents a customer's saved address
 */

export interface SavedAddress {
  id: string;              // UUID
  customerId: number;      // References customer table (still integer)
  label?: 'home' | 'work' | 'other';
  fullName: string;        // Updated field name (migration 004)
  phoneNumber: string;     // Updated field name (migration 004)
  address: string;
  street?: string;
  city?: string;
  building?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAddressDto {
  customerId: number;
  label?: 'home' | 'work' | 'other';
  fullName: string;
  phoneNumber: string;
  address: string;
  street?: string;
  city?: string;
  building?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export interface UpdateAddressDto {
  label?: 'home' | 'work' | 'other';
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  street?: string;
  city?: string;
  building?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}
