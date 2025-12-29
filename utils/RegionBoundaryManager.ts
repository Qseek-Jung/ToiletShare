import { Toilet, Gender } from '../types';

// Declare Google Maps types
declare global {
    interface Window {
        google: any;
    }
}

export type RegionLevel = 'large' | 'medium';

export interface LatLng {
    lat: number;
    lng: number;
}

export interface RegionGroup {
    regionName: string;
    level: RegionLevel;
    toilets: Toilet[];
    centerLat: number;
    centerLng: number;
    boundary: LatLng[];
    maleCount: number;
    femaleCount: number;
    unisexCount: number;
}

/**
 * 주소에서 대 레벨 추출 (광역시/특별시/도)
 * 예: 서울특별시 → 서울, 경기도 → 경기도
 */
export function extractLargeRegion(address: string): string {
    const parts = address.split(' ');

    // 광역시/특별시 찾기 (서울특별시, 부산광역시 등)
    const metroCity = parts.find(p =>
        p.includes('특별시') ||
        p.includes('광역시') ||
        p.includes('특별자치시')
    );

    if (metroCity) {
        return metroCity
            .replace('특별시', '')
            .replace('광역시', '')
            .replace('특별자치시', '');
    }

    // 도 찾기 (경기도, 강원도 등)
    const province = parts.find(p =>
        p.endsWith('도') && !p.includes('특별자치')
    );

    if (province) {
        return province.replace('특별자치', '');
    }

    // 세종특별자치시는 그대로
    if (parts.some(p => p.includes('세종'))) {
        return '세종';
    }

    return parts[0] || '기타';
}

/**
 * 주소에서 중 레벨 추출 (구/군/시)
 * 광역시 하위의 구, 도 하위의 시/군
 */
export function extractMediumRegion(address: string): string {
    const parts = address.split(' ');
    const largeRegion = extractLargeRegion(address);

    // 광역시/특별시인 경우: 하위 구 찾기
    const metroCity = parts.find(p =>
        p.includes('특별시') ||
        p.includes('광역시') ||
        p.includes('특별자치시')
    );

    if (metroCity) {
        // 서울특별시 도봉구 → 서울 도봉구
        const district = parts.find(p => {
            if (p === metroCity) return false;
            if (/^\d/.test(p)) return false;
            return p.endsWith('구') || p.endsWith('군');
        });
        if (district) return `${largeRegion} ${district}`;
    }

    // 도인 경우: 하위 시/군 찾기  
    if (parts.some(p => p.endsWith('도'))) {
        const city = parts.find(p => {
            if (p.endsWith('도')) return false;
            if (/^\d/.test(p)) return false;
            return p.endsWith('시') || p.endsWith('군');
        });
        if (city) return `${largeRegion} ${city}`;
    }

    // 찾지 못한 경우 대 레벨 반환
    return largeRegion;
}

/**
 * 줌 레벨에 따라 적절한 지역 레벨 결정 (2단계 시스템)
 * 1-9: Large (광역시/도)
 * 10+: Medium (구/시/군)
 */
export function getRegionLevelByZoom(zoomLevel: number): RegionLevel {
    if (zoomLevel <= 9) return 'large';   // 대: 광역시/도
    return 'medium';                      // 중: 구/군/시 (10 이상)
}

/**
 * 지역 레벨에 따라 주소에서 지역명 추출
 */
export function extractRegionByLevel(address: string, level: RegionLevel): string {
    switch (level) {
        case 'large': return extractLargeRegion(address);
        case 'medium': return extractMediumRegion(address);
        default: return extractLargeRegion(address);
    }
}

/**
 * Convex Hull 알고리즘을 사용하여 점들의 경계 계산
 * Graham Scan 알고리즘 사용
 */
export function calculateConvexHull(points: LatLng[]): LatLng[] {
    if (points.length < 3) {
        // 점이 3개 미만이면 원형 경계 생성
        return createCircularBoundary(points);
    }

    // 1. 가장 아래쪽(y가 가장 작은) 점 찾기
    let anchor = points[0];
    for (const p of points) {
        if (p.lat < anchor.lat || (p.lat === anchor.lat && p.lng < anchor.lng)) {
            anchor = p;
        }
    }

    // 2. 앵커 기준으로 각도 정렬
    const sorted = [...points].sort((a, b) => {
        if (a === anchor) return -1;
        if (b === anchor) return 1;

        const angleA = Math.atan2(a.lat - anchor.lat, a.lng - anchor.lng);
        const angleB = Math.atan2(b.lat - anchor.lat, b.lng - anchor.lng);

        if (angleA === angleB) {
            // 같은 각도면 거리 순
            const distA = Math.hypot(a.lat - anchor.lat, a.lng - anchor.lng);
            const distB = Math.hypot(b.lat - anchor.lat, b.lng - anchor.lng);
            return distA - distB;
        }

        return angleA - angleB;
    });

    // 3. Graham Scan
    const hull: LatLng[] = [sorted[0], sorted[1]];

    for (let i = 2; i < sorted.length; i++) {
        let top = hull[hull.length - 1];
        let nextTop = hull[hull.length - 2];

        // CCW (Counter-clockwise) 테스트
        while (hull.length > 1 && ccw(nextTop, top, sorted[i]) <= 0) {
            hull.pop();
            top = hull[hull.length - 1];
            nextTop = hull[hull.length - 2];
        }

        hull.push(sorted[i]);
    }

    return hull;
}

/**
 * Counter-clockwise 테스트
 * 양수: CCW, 0: 일직선, 음수: CW
 */
function ccw(a: LatLng, b: LatLng, c: LatLng): number {
    return (b.lng - a.lng) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lng - a.lng);
}

/**
 * 점이 3개 미만일 때 원형 경계 생성
 */
function createCircularBoundary(points: LatLng[]): LatLng[] {
    if (points.length === 0) return [];

    if (points.length === 1) {
        const center = points[0];
        const radius = 0.01; // 약 1km
        return createCircle(center, radius);
    }

    // 2개 점의 중심과 반경으로 원 생성
    const center = {
        lat: (points[0].lat + points[1].lat) / 2,
        lng: (points[0].lng + points[1].lng) / 2
    };
    const radius = Math.hypot(
        points[1].lat - points[0].lat,
        points[1].lng - points[0].lng
    ) / 2 + 0.005;

    return createCircle(center, radius);
}

/**
 * 중심점과 반경으로 원형 폴리곤 생성
 */
function createCircle(center: LatLng, radius: number): LatLng[] {
    const points: LatLng[] = [];
    const numPoints = 32;

    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        points.push({
            lat: center.lat + radius * Math.cos(angle),
            lng: center.lng + radius * Math.sin(angle)
        });
    }

    return points;
}

/**
 * 화장실 목록을 지역별로 그룹화
 */
export function groupToiletsByRegion(
    toilets: Toilet[],
    level: RegionLevel
): Map<string, Toilet[]> {
    const regionMap = new Map<string, Toilet[]>();

    toilets.forEach(toilet => {
        const regionName = extractRegionByLevel(toilet.address, level);
        if (!regionMap.has(regionName)) {
            regionMap.set(regionName, []);
        }
        regionMap.get(regionName)!.push(toilet);
    });

    return regionMap;
}

/**
 * 지역별 그룹 데이터 생성 (경계선 포함)
 */
export function createRegionGroups(
    toilets: Toilet[],
    level: RegionLevel
): RegionGroup[] {
    const regionMap = groupToiletsByRegion(toilets, level);
    const groups: RegionGroup[] = [];

    regionMap.forEach((regionToilets, regionName) => {
        if (regionToilets.length === 0) return;

        // 중심점 계산
        const centerLat = regionToilets.reduce((sum, t) => sum + t.lat, 0) / regionToilets.length;
        const centerLng = regionToilets.reduce((sum, t) => sum + t.lng, 0) / regionToilets.length;

        // 경계 계산
        const points = regionToilets.map(t => ({ lat: t.lat, lng: t.lng }));
        const boundary = calculateConvexHull(points);

        // 성별 카운트
        const maleCount = regionToilets.filter(t => t.genderType === Gender.MALE).length;
        const femaleCount = regionToilets.filter(t => t.genderType === Gender.FEMALE).length;
        const unisexCount = regionToilets.filter(t => t.genderType === Gender.UNISEX).length;

        groups.push({
            regionName,
            level,
            toilets: regionToilets,
            centerLat,
            centerLng,
            boundary,
            maleCount,
            femaleCount,
            unisexCount
        });
    });

    // 화장실 개수 순으로 정렬
    groups.sort((a, b) => b.toilets.length - a.toilets.length);

    // 성능을 위해 최대 100개 지역만 표시
    return groups.slice(0, 100);
}

/**
 * 색상 계산 (화장실 개수에 따라 그라데이션)
 */
export function getColorByDensity(count: number, maxCount: number): string {
    const ratio = Math.min(count / maxCount, 1);

    // HSL 색상 (파랑): 낮은 밀도(연한 파랑) -> 높은 밀도(진한 파랑)
    const lightness = 70 - (ratio * 30); // 70% -> 40%
    const saturation = 50 + (ratio * 40); // 50% -> 90%

    return `hsl(210, ${saturation}%, ${lightness}%)`;
}
