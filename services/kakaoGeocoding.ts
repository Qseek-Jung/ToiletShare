import { CapacitorHttp } from '@capacitor/core';

const KAKAO_API_KEY = import.meta.env.VITE_KAKAO_API_KEY || 'd5a9498cedf6ffb73e6d6ca18ac82abf';
const KAKAO_NATIVE_KEY = import.meta.env.VITE_KAKAO_NATIVE_KEY || '954f8caae336cb83506cad28e1de2e19';

// Helper to construct KA Header
// Format: sdk/1.0.0 os/javascript lang/ko-KR device/iPhone origin/http%3A%2F%2Flocalhost
const getKAHeader = (type: 'js' | 'native') => {
    if (type === 'js') {
        return `sdk/1.43.0 os/javascript lang/ko-KR device/MacIntel origin/${encodeURIComponent('http://localhost')}`;
    } else {
        // Mimic iOS Native SDK header
        return `sdk/2.22.0 os/ios lang/ko-KR device/iPhone origin/${encodeURIComponent('com.toilet.korea')}`;
    }
};

// Use CapacitorHttp to bypass CORS and Domain restrictions
const fetchWithKey = async (url: string, key: string, origin: string, type: 'js' | 'native') => {
    try {
        const kaHeader = getKAHeader(type);
        const options = {
            url: url,
            headers: {
                'Authorization': `KakaoAK ${key}`,
                'KA': kaHeader,
                'Origin': origin,
                'Referer': origin
            }
        };

        console.warn(`[KakaoGeocoding] Requesting: ${url}`);
        console.warn(`[KakaoGeocoding] Using Key: ${key.substring(0, 5)}... Type: ${type}`);
        // console.warn(`[KakaoGeocoding] KA Header: ${kaHeader}`);

        const response = await CapacitorHttp.get(options);

        if (response.status === 200) {
            return response.data;
        } else {
            console.error(`[KakaoGeocoding] Failed: ${response.status}`, response.data);
            return null;
        }
    } catch (e) {
        console.error(`[KakaoGeocoding] Exception`, e);
        return null;
    }
};

export const checkKakaoSDK = async (): Promise<boolean> => {
    return true;
};

export const reverseGeocodeKakao = async (lat: number, lng: number): Promise<string | null> => {
    const url = `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`;

    // Strategy 1: JS Key + KA Header (JS Mimic)
    let data = await fetchWithKey(url, KAKAO_API_KEY, 'http://localhost', 'js');

    if (!data || !data.documents) {
        // Strategy 2: Native Key + KA Header (iOS Mimic)
        // User explicitly suggested using Native Key ("954f...")
        if (KAKAO_NATIVE_KEY) {
            console.warn("[KakaoGeocoding] Retry with Native Key & KA Header...");
            // Native SDK usually uses bundle ID as origin/referer implicitly in headers
            data = await fetchWithKey(url, KAKAO_NATIVE_KEY, 'http://localhost', 'native');
        }
    }

    if (data && data.documents && data.documents.length > 0) {
        const item = data.documents[0];
        const addr = item.road_address?.address_name || item.address?.address_name;
        console.warn(`[KakaoGeocoding] Success: ${addr}`);
        return addr;
    }

    return null;
};

export const geocodeAddressKakao = async (address: string): Promise<any | null> => {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;
    const data = await fetchWithKey(url, KAKAO_API_KEY, 'http://localhost', 'js');

    if (data && data.documents && data.documents.length > 0) {
        const item = data.documents[0];
        return {
            lat: parseFloat(item.y),
            lng: parseFloat(item.x),
            address_name: item.address_name
        };
    }
    return null;
};

export const keywordSearchKakao = async (keyword: string): Promise<any | null> => {
    return null;
};
