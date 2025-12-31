
import { KakaoGeoResult } from '../services/kakaoGeocoding';

export type BulkAction = 'immediate' | 'review' | 'reject';

export interface SmartValidationResult {
    name: string;
    address: string;
    floor: number;
    lat: number;
    lng: number;
    action: BulkAction; // immediate -> toilets, review -> toilets_bulk
    reason: string;
    logs: { message: string, type: 'info' | 'warning' | 'error' | 'success' }[];
}

export interface ParsedBulkRow {
    name: string;
    address: string;
    floor: number;
    nameRaw: string;
    addressRaw: string;
}

/**
 * Pre-parse row to extract floor and enrich address
 */
export const parseBulkRow = (nameRaw: string, addressRaw: string): ParsedBulkRow => {
    const floorRegex = /(B?\d+)층|(B?\d+)F|지하(\d+)층/i;
    let floor = 1;
    let name = nameRaw.trim();
    let address = addressRaw.trim();

    // 1. Extract Floor from Name
    const nameMatch = name.match(floorRegex);
    if (nameMatch) {
        if (nameMatch[1]) floor = parseInt(nameMatch[1]); // "2층", "2F" (Group 1)
        if (nameMatch[2]) floor = parseInt(nameMatch[2]); // "2F" (Group 2 sometimes depending on regex engine, but strict regex: (B?\d+)층 | (B?\d+)F)
        // Group 1: 층 match, Group 2: F match.
        if (nameMatch[3]) floor = -parseInt(nameMatch[3]); // "지하1층" (Group 3)

        name = name.replace(floorRegex, '').trim();
    }

    // 2. Extract Floor from Address if not found in Name
    if (floor === 1) {
        const addrMatch = address.match(floorRegex);
        if (addrMatch) {
            if (addrMatch[1]) floor = parseInt(addrMatch[1]);
            if (addrMatch[2]) floor = parseInt(addrMatch[2]);
            if (addrMatch[3]) floor = -parseInt(addrMatch[3]);
        }
    }

    // 3. Append Name to Address (User Requirement)
    // "빌딩명이나 관공서명 등은 주소 뒤에 붙여서 정리"
    // Only append if address doesn't already contain it to avoid duplication like "City Hall City Hall"
    if (name && !address.includes(name)) {
        address = `${address} ${name}`;
    }

    return { name, address, floor, nameRaw, addressRaw };
};

export const validateBulkItem = (
    parsed: ParsedBulkRow,
    latRaw: number,
    lngRaw: number,
    kakaoResult: KakaoGeoResult | null,
    isOnLand: boolean
): SmartValidationResult => {
    const logs: { message: string, type: 'info' | 'warning' | 'error' | 'success' }[] = [];
    const { name, address, floor, nameRaw, addressRaw } = parsed;

    // Log Parsing Results
    if (floor !== 1) logs.push({ message: `층수 추출됨: ${floor}층`, type: 'info' });
    if (address !== addressRaw) logs.push({ message: `주소 보정됨: ${address}`, type: 'info' });

    // 2. Keyword Classification
    const broadKeywords = ['공원', '운동장', '학교', '캠퍼스', '대학교', '초등학교', '중학교', '고등학교', '체육관', '경기장', '수변', '광장', '유원지'];
    const buildingKeywords = ['빌딩', '타워', '센터', '병원', '장례식장', '청사', '주민센터', '도서관', '박물관', '미술관'];

    const isBroadArea = broadKeywords.some(k => name.includes(k));

    logs.push({ message: `타입 분류: ${isBroadArea ? '넓은 구역' : '건물/기관'}`, type: 'info' });

    // 3. Validation Rules
    let finalLat = latRaw;
    let finalLng = lngRaw;
    let action: BulkAction = 'review';
    let reason = '';

    const hasOriginalCoord = latRaw !== 0 && lngRaw !== 0;

    // --- Case 1: Kakao Geocoding Failed ---
    if (!kakaoResult) {
        if (hasOriginalCoord) {
            if (isOnLand) {
                // Trust original
                action = 'immediate';
                reason = '지오코딩 실패했으나 원본 좌표가 유효(육지)하여 즉시 등록';
                logs.push({ message: reason, type: 'warning' });
            } else {
                action = 'reject';
                reason = '지오코딩 실패 및 원본 좌표 오류(바다/해외)';
                logs.push({ message: reason, type: 'error' });
            }
        } else {
            action = 'reject';
            reason = '주소 불명 및 좌표 없음';
            logs.push({ message: reason, type: 'error' });
        }
        return { name, address, floor, lat: finalLat, lng: finalLng, action, reason, logs };
    }

    // --- Kakao Success ---
    const kLat = parseFloat(kakaoResult.y);
    const kLng = parseFloat(kakaoResult.x);
    // Address Enrichment (Refill)
    const kAddress = kakaoResult.road_address?.address_name || kakaoResult.address.address_name;
    const kBuilding = kakaoResult.road_address?.building_name || "";

    // If Kakao gives a clean building name, we might want to note it, but we use our parsed address/name as primary
    // unless we want to overwrite.

    // --- Case 2: No Original Coords ---
    if (!hasOriginalCoord) {
        action = 'immediate';
        finalLat = kLat;
        finalLng = kLng;
        reason = '원본 좌표 없어 주소 기반 좌표로 즉시 등록';
        logs.push({ message: reason, type: 'success' });
        return { name, address, floor, lat: finalLat, lng: finalLng, action, reason, logs };
    }

    // --- Case 3: Distance Check ---
    const dist = getDistanceFromLatLonInKm(latRaw, lngRaw, kLat, kLng) * 1000; // Meters
    logs.push({ message: `좌표 거리 차이: ${dist.toFixed(1)}m`, type: 'info' });

    // Check Building Name Match
    const nameMatchFound = kBuilding && name.includes(kBuilding);

    if (isBroadArea) {
        // Wide Area
        if (dist <= 200) {
            action = 'immediate';
            finalLat = latRaw; // Trust original for wide area specific points
            finalLng = lngRaw;
            reason = `넓은 구역, 거리(${dist.toFixed(0)}m) 양호 -> 즉시 등록`;
        } else {
            action = 'review';
            finalLat = latRaw;
            finalLng = lngRaw;
            reason = `넓은 구역, 거리 차이(${dist.toFixed(0)}m) 과다 -> 검수 필요`;
        }
    } else {
        // Building / Generic
        // OR Condition: Distance 50m OR Name Match
        if (dist <= 50 || nameMatchFound) {
            action = 'immediate';
            finalLat = latRaw;
            finalLng = lngRaw;
            if (nameMatchFound && dist > 50) {
                reason = `거리(${dist.toFixed(0)}m)는 멀지만 건물명 일치(${kBuilding}) -> 즉시 등록`;
                logs.push({ message: "건물명 일치 확인", type: 'success' });
            } else {
                reason = `거리(${dist.toFixed(0)}m) 양호 -> 즉시 등록`;
            }
        } else if (dist <= 150) {
            action = 'review';
            finalLat = latRaw; // Keep original vs Kakao? Let's keep original.
            finalLng = lngRaw;
            reason = `거리 차이(${dist.toFixed(0)}m) 발생 (50~150m) -> 검수 필요`;
        } else {
            action = 'review';
            finalLat = kLat; // Suggest Kakao?
            finalLng = kLng;
            reason = `거리 차이(${dist.toFixed(0)}m) 과다 -> 검수 필요`;
        }
    }

    return { name, address, floor, lat: finalLat, lng: finalLng, action, reason, logs };
};

// ... helpers
function isBuildingNameLike(s: string) {
    return s.endsWith('빌딩') || s.endsWith('타워') || s.endsWith('센터') || s.endsWith('병원');
}

function extractBuildingName(s: string) {
    return s;
}


// Helper: Haversine Distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}
