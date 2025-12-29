
interface IPLocation {
    lat: number;
    lng: number;
    city?: string;
    region?: string;
    country?: string;
}

// Cache expiration time: 10 minutes
const CACHE_EXPIRATION_MS = 10 * 60 * 1000;

export const getIPLocation = async (): Promise<IPLocation | null> => {
    try {
        // 1. Try ipwho.is (CORS friendly, free)
        console.log('🌐 Attempting IP Location (ipwho.is)...');
        const response = await fetch('https://ipwho.is/');
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.latitude && data.longitude) {
                console.log('📍 IP Location found (ipwho):', data.city);
                return { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), city: data.city, region: data.region };
            }
        }
    } catch (error) {
        console.warn('IP Location fetch failed:', error);
    }

    return null;
};

export const saveLastLocation = (lat: number, lng: number) => {
    try {
        localStorage.setItem('last_known_location', JSON.stringify({
            lat,
            lng,
            timestamp: Date.now()
        }));
        console.log('💾 Location cached:', { lat, lng });
    } catch (e) {
        console.error('Failed to save location', e);
    }
};

export const getLastLocation = (): { lat: number, lng: number, timestamp: number } | null => {
    try {
        const item = localStorage.getItem('last_known_location');
        if (!item) return null;

        const cached = JSON.parse(item);
        return cached;
    } catch {
        return null;
    }
};

/**
 * Get cached location only if it's recent (within expiration time)
 * @returns Valid cached location or null if expired/missing
 */
export const getValidCachedLocation = (): { lat: number, lng: number } | null => {
    try {
        const cached = getLastLocation();
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        const isValid = age < CACHE_EXPIRATION_MS;

        if (isValid) {
            console.log(`📦 Valid cache found (${Math.round(age / 1000)}s old)`);
            return { lat: cached.lat, lng: cached.lng };
        } else {
            console.log(`🗑️ Cache expired (${Math.round(age / 60000)}min old), ignoring`);
            return null;
        }
    } catch {
        return null;
    }
};
