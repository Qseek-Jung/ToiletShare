// Enhanced Distance Calculation Service
// Provides walking distance and time calculations with realistic route factor

interface WalkingRouteResult {
    distance: number; // meters
    duration: number; // seconds (estimated walking time)
    isRouteBasedCalculation: boolean; // false for enhanced estimation
}

// Standard walking speed: ~80 meters/minute (4.8 km/h)
const WALKING_SPEED_METERS_PER_MINUTE = 80;

/**
 * Calculate straight-line distance between two points (Haversine formula)
 */
function calculateStraightLineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

/**
 * Calculate estimated walking time based on distance
 * @param distanceInMeters Distance in meters
 * @returns Estimated walking time in seconds
 */
function calculateWalkingDuration(distanceInMeters: number): number {
    const minutes = distanceInMeters / WALKING_SPEED_METERS_PER_MINUTE;
    return Math.round(minutes * 60); // Convert to seconds
}

/**
 * Get walking route information with enhanced distance estimation
 * 
 * NOTE: Google Maps Directions API cannot be called directly from browser due to CORS.
 * This function uses an enhanced calculation method with a realistic route factor.
 * 
 * @param originLat Origin latitude
 * @param originLng Origin longitude
 * @param destLat Destination latitude
 * @param destLng Destination longitude
 * @returns Walking route result with distance and duration
 */
export async function getWalkingRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
): Promise<WalkingRouteResult> {
    try {
        const straightLineDistance = calculateStraightLineDistance(
            originLat,
            originLng,
            destLat,
            destLng
        );

        // Apply realistic route factor for urban walking routes
        // Studies show actual walking routes are typically 1.2-1.4x longer than straight-line
        // Using 1.3x as a balanced estimate
        const ROUTE_FACTOR = 1.3;
        const estimatedRouteDistance = straightLineDistance * ROUTE_FACTOR;
        const estimatedDuration = calculateWalkingDuration(estimatedRouteDistance);

        return {
            distance: Math.round(estimatedRouteDistance),
            duration: estimatedDuration,
            isRouteBasedCalculation: false // Enhanced estimation
        };

    } catch (error) {
        console.error('Distance calculation error:', error);

        // Final fallback
        const straightLineDistance = calculateStraightLineDistance(
            originLat,
            originLng,
            destLat,
            destLng
        );

        const estimatedRouteDistance = straightLineDistance * 1.3;
        const estimatedDuration = calculateWalkingDuration(estimatedRouteDistance);

        return {
            distance: Math.round(estimatedRouteDistance),
            duration: estimatedDuration,
            isRouteBasedCalculation: false
        };
    }
}

/**
 * Convert duration in seconds to minutes (rounded)
 * @param durationInSeconds Duration in seconds
 * @returns Duration in minutes
 */
export function durationToMinutes(durationInSeconds: number): number {
    return Math.max(1, Math.round(durationInSeconds / 60));
}
