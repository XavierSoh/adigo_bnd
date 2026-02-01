/**
 * VTC Driver Model
 * Represents a VTC/Taxi driver in the system
 */
export interface VtcDriver {
    id: string;
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
    rating: number;
    totalRides: number;
    status: 'online' | 'offline' | 'busy' | 'suspended';
    currentLatitude?: number;
    currentLongitude?: number;
    lastLocationUpdate?: Date;
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
    driverId: string;
    status: 'online' | 'offline' | 'busy' | 'suspended';
    currentLatitude?: number;
    currentLongitude?: number;
    lastLocationUpdate?: Date;
}
