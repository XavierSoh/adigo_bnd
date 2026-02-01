/**
 * VTC Driver Model
 * Represents a VTC/Taxi driver in the system
 */

export interface VtcDriver {
  id: string;              // UUID
  userId?: number;         // References user table (still integer)
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photo?: string;

  // License
  licenseNumber: string;
  licenseExpiry: Date;

  // Vehicle
  vehicleType: 'economy' | 'comfort' | 'premium';
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate: string;

  // Stats
  rating: number;
  totalRides: number;

  // Status
  status: 'online' | 'offline' | 'busy' | 'suspended';
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverDto {
  userId?: number;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  photo?: string;
  licenseNumber: string;
  licenseExpiry: Date;
  vehicleType: 'economy' | 'comfort' | 'premium';
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate: string;
}

export interface UpdateDriverLocationDto {
  latitude: number;
  longitude: number;
}

export interface DriverStatus {
  driverId: string;        // UUID
  status: 'online' | 'offline' | 'busy' | 'suspended';
  currentLatitude?: number;
  currentLongitude?: number;
  lastLocationUpdate?: Date;
}
