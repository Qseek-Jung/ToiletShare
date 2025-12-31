// Google Maps Geocoding API Service
import { MAPS_API_KEY } from '../config';

interface GoogleGeocodingResponse {
    results: Array<{
        formatted_address: string;
        geometry: {
            location: {
                lat: number;
                lng: number;
            };
        };
    }>;
    status: string;
}

/**
 * Google Geocoding API를 사용하여 주소를 좌표로 변환
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; location_type: string } | null> {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&region=kr&key=${MAPS_API_KEY}`
        );

        if (!response.ok) {
            console.error(`Google Geocoding API error: ${response.status}`);
            return null;
        }

        const data: GoogleGeocodingResponse = await response.json();

        if (data.status === 'OK' && data.results && data.results.length > 0) {
            const result = data.results[0];
            // @ts-ignore - The interface above wasn't comprehensive but raw JSON has it
            const location_type = result.geometry.location_type || 'APPROXIMATE';
            return {
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                location_type
            };
        }

        if (data.status === 'ZERO_RESULTS') {
            return null;
        }

        console.error(`Google Geocoding API status: ${data.status}`);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

/**
 * 여러 항목을 배치로 지오코딩
 * @param items 지오코딩할 항목 배열
 * @param getAddress 각 항목에서 주소를 추출하는 함수
 * @param onResult 각 결과를 처리하는 콜백
 * @param onProgress 진행 상황 콜백
 */
export async function batchGeocode<T>(
    items: T[],
    getAddress: (item: T) => string,
    onResult: (item: T, lat: number | null, lng: number | null, location_type?: string) => void,
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const address = getAddress(item);

        // Google Geocoding API 호출
        const result = await geocodeAddress(address);

        if (result) {
            onResult(item, result.lat, result.lng, result.location_type);
        } else {
            onResult(item, null, null);
        }

        // 진행 상황 업데이트
        if (onProgress) {
            onProgress(i + 1, items.length);
        }

        // API 호출 제한 방지 (초당 50건 제한, 여유있게 200ms)
        if (i < items.length - 1) {
            await delay(200);
        }
    }
}
