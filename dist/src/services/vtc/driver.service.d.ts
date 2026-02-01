/**
 * VTC Driver Service
 * Business logic for driver management
 */
import { VtcDriver, UpdateDriverLocationDto } from '../../models/vtc/driver.model';
export declare class DriverService {
    /**
     * Get nearby drivers
     */
    getNearbyDrivers(latitude: number, longitude: number, vehicleType?: string, radiusKm?: number): Promise<VtcDriver[]>;
    /**
     * Update driver location
     */
    updateDriverLocation(driverId: number, data: UpdateDriverLocationDto): Promise<VtcDriver>;
    /**
     * Update driver status
     */
    updateDriverStatus(driverId: number, status: 'online' | 'offline' | 'busy' | 'suspended'): Promise<VtcDriver>;
    /**
     * Get driver by ID
     */
    getDriverById(driverId: number): Promise<VtcDriver | null>;
}
declare const _default: DriverService;
export default _default;
