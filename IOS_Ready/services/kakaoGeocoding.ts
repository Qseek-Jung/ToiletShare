/**
 * Kakao Geocoding Service (via JS SDK)
 * Uses window.kakao.maps.services.Geocoder
 * Free Quota: 100,000 requests / day
 */

declare global {
    interface Window {
        kakao: any;
    }
}

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
    address_type?: string;
}

interface KakaoKeywordResult {
    place_name: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
    [key: string]: any;
}

// Helper to wait for SDK to be available
export const checkKakaoSDK = (): Promise<boolean> => {
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

export const geocodeAddressKakao = async (address: string): Promise<{ lat: number, lng: number, address_name: string, address_type?: string } | null> => {
    const isLoaded = await checkKakaoSDK();
    if (!isLoaded) return null;

    return new Promise((resolve) => {
        const runSearch = () => {
            // @ts-ignore
            if (!window.kakao.maps.services) {
                console.error("Kakao Maps SDK 'services' library not found.");
                resolve(null);
                return;
            }

            // Clean Address - remove parentheses, brackets, and invisible characters
            const cleanAddress = address
                .replace(/\([^)]*\)/g, '')
                .replace(/\[[^\]]*\]/g, '')
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            // @ts-ignore
            const geocoder = new window.kakao.maps.services.Geocoder();
            // @ts-ignore
            const ps = new window.kakao.maps.services.Places();

            // 1. First Attempt: Standard Address Search
            // @ts-ignore
            geocoder.addressSearch(cleanAddress, (result: KakaoGeoResult[], status: any) => {
                // @ts-ignore
                if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                    const item = result[0];
                    resolve({
                        lat: parseFloat(item.y),
                        lng: parseFloat(item.x),
                        address_name: item.road_address?.address_name || item.address.address_name,
                        address_type: item.address_type || 'REGION'
                    });
                } else {
                    console.warn(`[KakaoGeocoding] Address Search Failed for "${cleanAddress}": Status=${status}. Retrying with cleaning...`);

                    // 2. Second Attempt: Strip text after the building number (e.g. "Road 123 BuildingName" -> "Road 123")
                    // This handles cases where valid addresses are suffixed with facility names or specific floor info.
                    // We look for a space, then digits (possibly hyphenated), then another space and any text.
                    const simplifiedAddress = cleanAddress.replace(/(\s\d+(?:-\d+)?)\s+.+$/, '$1').trim();
                    console.log(`[KakaoGeocoding] Pre-simplification: "${cleanAddress}" -> Post-simplification: "${simplifiedAddress}"`);

                    if (simplifiedAddress !== cleanAddress) {
                        // @ts-ignore
                        geocoder.addressSearch(simplifiedAddress, (retryResult: KakaoGeoResult[], retryStatus: any) => {
                            // @ts-ignore
                            if (retryStatus === window.kakao.maps.services.Status.OK && retryResult.length > 0) {
                                console.log(`[KakaoGeocoding] Retry Success with simplified address: "${simplifiedAddress}"`);
                                const item = retryResult[0];
                                resolve({
                                    lat: parseFloat(item.y),
                                    lng: parseFloat(item.x),
                                    address_name: item.road_address?.address_name || item.address.address_name,
                                    address_type: item.address_type || 'REGION'
                                });
                            } else {
                                // 3. Third Attempt: Try KEYWORD SEARCH with the address string
                                // Sometimes the address parser is too strict, but keyword search finds the location.
                                console.warn(`[KakaoGeocoding] Simplified Search Failed. Trying Keyword Search for: "${cleanAddress}"`);
                                // @ts-ignore
                                ps.keywordSearch(cleanAddress, (kwResult: KakaoKeywordResult[], kwStatus: any) => {
                                    if (kwStatus === window.kakao.maps.services.Status.OK && kwResult.length > 0) {
                                        console.log(`[KakaoGeocoding] Keyword Search Success for address string`);
                                        const item = kwResult[0];
                                        resolve({
                                            lat: parseFloat(item.y),
                                            lng: parseFloat(item.x),
                                            address_name: item.road_address_name || item.address_name, // Keyword result fields differ slightly
                                            address_type: 'ROAD_ADDR' // Assume success implies valid location
                                        });
                                    } else {
                                        console.error(`[KakaoGeocoding] All attempts failed for "${cleanAddress}"`);
                                        resolve(null);
                                    }
                                });
                            }
                        });
                    } else {
                        // No simplification possible, try keyword search immediately
                        console.warn(`[KakaoGeocoding] No simplification possible. Trying Keyword Search for: "${cleanAddress}"`);
                        // @ts-ignore
                        ps.keywordSearch(cleanAddress, (kwResult: KakaoKeywordResult[], kwStatus: any) => {
                            if (kwStatus === window.kakao.maps.services.Status.OK && kwResult.length > 0) {
                                console.log(`[KakaoGeocoding] Keyword Search Success for address string`);
                                const item = kwResult[0];
                                resolve({
                                    lat: parseFloat(item.y),
                                    lng: parseFloat(item.x),
                                    address_name: item.road_address_name || item.address_name,
                                    address_type: 'ROAD_ADDR'
                                });
                            } else {
                                console.error(`[KakaoGeocoding] All attempts failed for "${cleanAddress}"`);
                                resolve(null);
                            }
                        });
                    }
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
    const isLoaded = await checkKakaoSDK();
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

export const keywordSearchKakao = async (keyword: string): Promise<{ lat: number, lng: number, address_name: string, place_name?: string } | null> => {
    const isLoaded = await checkKakaoSDK();
    if (!isLoaded) return null;

    return new Promise((resolve) => {
        const runKeywordSearch = () => {
            // @ts-ignore
            if (!window.kakao.maps.services) {
                console.error("Kakao Maps SDK 'services' library not found.");
                resolve(null);
                return;
            }

            // @ts-ignore
            const ps = new window.kakao.maps.services.Places();
            // @ts-ignore
            ps.keywordSearch(keyword, (result: KakaoKeywordResult[], status: any) => {
                // @ts-ignore
                if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                    const item = result[0];
                    resolve({
                        lat: parseFloat(item.y),
                        lng: parseFloat(item.x),
                        address_name: item.road_address_name || item.address_name,
                        place_name: item.place_name
                    });
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
                runKeywordSearch();
            });
        } else {
            runKeywordSearch();
        }
    });
};
