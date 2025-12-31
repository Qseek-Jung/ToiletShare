/**
 * Kakao Geocoding Service (via JS SDK)
 * Uses window.kakao.maps.services.Geocoder
 * Free Quota: 100,000 requests / day
 */

// Define response types based on Kakao Maps SDK documentation
interface KakaoGeoResult {
    address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        mountain_yn: string;
        main_address_no: string;
        sub_address_no: string;
    };
    road_address: {
        address_name: string;
        region_1depth_name: string;
        region_2depth_name: string;
        region_3depth_name: string;
        road_name: string;
        underground_yn: string;
        main_building_no: string;
        sub_building_no: string;
        building_name: string;
        zone_no: string;
    } | null;
    x: string; // Longitude
    y: string; // Latitude
}

// Helper to wait for SDK to be available
const ensureKakaoLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
        if (window.kakao && window.kakao.maps) {
            resolve(true);
            return;
        }

        let retries = 0;
        const maxRetries = 20; // 2 seconds total (100ms * 20)
        const interval = setInterval(() => {
            retries++;
            if (window.kakao && window.kakao.maps) {
                clearInterval(interval);
                resolve(true);
            } else if (retries >= maxRetries) {
                clearInterval(interval);
                console.error("Kakao Maps SDK failed to load within timeout.");
                resolve(false);
            }
        }, 100);
    });
};

export const geocodeAddressKakao = async (address: string): Promise<{ lat: number, lng: number, address_name: string } | null> => {
    const isLoaded = await ensureKakaoLoaded();
    if (!isLoaded) return null;

    return new Promise((resolve) => {
        const runSearch = () => {
            // @ts-ignore
            if (!window.kakao.maps.services) {
                console.error("Kakao Maps SDK 'services' library not found.");
                resolve(null);
                return;
            }

            // Clean Address
            const cleanAddress = address
                .replace(/\([^)]*\)/g, '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // @ts-ignore
            const geocoder = new window.kakao.maps.services.Geocoder();

            // @ts-ignore
            geocoder.addressSearch(cleanAddress, (result: KakaoGeoResult[], status: any) => {
                // @ts-ignore
                if (status === window.kakao.maps.services.Status.OK) {
                    if (result.length > 0) {
                        const item = result[0];
                        resolve({
                            lat: parseFloat(item.y),
                            lng: parseFloat(item.x),
                            address_name: item.road_address?.address_name || item.address.address_name
                        });
                    } else {
                        resolve(null);
                    }
                } else {
                    if (status !== 'ZERO_RESULT') {
                        console.warn(`Kakao Geocoding failed for "${cleanAddress}":`, status);
                    }
                    resolve(null);
                }
            });
        };

        // Execute logic
        // @ts-ignore
        if (!window.kakao.maps.services) {
            // @ts-ignore
            window.kakao.maps.load(() => {
                runSearch();
            });
        } else {
            runSearch();
        }
    });
};

export const reverseGeocodeKakao = async (lat: number, lng: number): Promise<string | null> => {
    const isLoaded = await ensureKakaoLoaded();
    if (!isLoaded) return null;

    return new Promise((resolve) => {
        const runReverseGeo = () => {
            // @ts-ignore
            if (!window.kakao.maps.services) {
                console.error("Kakao Maps SDK 'services' library not found.");
                resolve(null);
                return;
            }

            // @ts-ignore
            const geocoder = new window.kakao.maps.services.Geocoder();

            // @ts-ignore
            geocoder.coord2Address(lng, lat, (result: any, status: any) => {
                // @ts-ignore
                if (status === window.kakao.maps.services.Status.OK) {
                    const addr = result[0].road_address?.address_name || result[0].address.address_name;
                    resolve(addr);
                } else {
                    resolve(null);
                }
            });
        };

        // Execute logic
        // @ts-ignore
        if (!window.kakao.maps.services) {
            // @ts-ignore
            window.kakao.maps.load(() => {
                runReverseGeo();
            });
        } else {
            runReverseGeo();
        }
    });
};
