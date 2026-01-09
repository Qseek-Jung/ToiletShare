
export interface RegionBound {
    name: string;
    keywords: string[]; // Aliases like "서울", "서울특별시"
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

export const REGION_BOUNDS: Record<string, RegionBound> = {
    'National': {
        name: '대한민국 (전체)',
        keywords: ['전체', '대한민국', '한국', 'National'],
        minLat: 32.0, maxLat: 43.0,
        minLng: 124.0, maxLng: 132.0
    },
    'Seoul': {
        name: '서울특별시',
        keywords: ['서울', '서울특별시', 'Seoul'],
        minLat: 37.41, maxLat: 37.72,
        minLng: 126.76, maxLng: 127.19
    },
    'Busan': {
        name: '부산광역시',
        keywords: ['부산', '부산광역시', 'Busan'],
        minLat: 34.87, maxLat: 35.39,
        minLng: 128.73, maxLng: 129.31
    },
    'Daegu': {
        name: '대구광역시',
        keywords: ['대구', '대구광역시', 'Daegu'],
        minLat: 35.60, maxLat: 36.02,
        minLng: 128.34, maxLng: 128.77
    },
    'Incheon': {
        name: '인천광역시',
        keywords: ['인천', '인천광역시', 'Incheon'],
        minLat: 36.95, maxLat: 37.90, // Including islands
        minLng: 124.59, maxLng: 126.80
    },
    'Gwangju': {
        name: '광주광역시',
        keywords: ['광주', '광주광역시', 'Gwangju'],
        minLat: 35.06, maxLat: 35.26,
        minLng: 126.66, maxLng: 127.01
    },
    'Daejeon': {
        name: '대전광역시',
        keywords: ['대전', '대전광역시', 'Daejeon'],
        minLat: 36.17, maxLat: 36.50,
        minLng: 127.24, maxLng: 127.54
    },
    'Ulsan': {
        name: '울산광역시',
        keywords: ['울산', '울산광역시', 'Ulsan'],
        minLat: 35.30, maxLat: 35.72,
        minLng: 128.95, maxLng: 129.46
    },
    'Sejong': {
        name: '세종특별자치시',
        keywords: ['세종', '세종시', '세종특별자치시', 'Sejong'],
        minLat: 36.40, maxLat: 36.70,
        minLng: 127.10, maxLng: 127.40
    },
    'Gyeonggi': {
        name: '경기도',
        keywords: ['경기', '경기도', 'Gyeonggi'],
        minLat: 36.88, maxLat: 38.30,
        minLng: 126.37, maxLng: 127.86
    },
    'Gangwon': {
        name: '강원특별자치도',
        keywords: ['강원', '강원도', '강원특별자치도', 'Gangwon'],
        minLat: 37.02, maxLat: 38.64,
        minLng: 127.08, maxLng: 129.36
    },
    'Chungbuk': {
        name: '충청북도',
        keywords: ['충북', '충청북도', 'Chungbuk'],
        minLat: 36.00, maxLat: 37.26,
        minLng: 127.27, maxLng: 128.64
    },
    'Chungnam': {
        name: '충청남도',
        keywords: ['충남', '충청남도', 'Chungnam'],
        minLat: 35.97, maxLat: 37.07,
        minLng: 125.52, maxLng: 127.65
    },
    'Jeonbuk': {
        name: '전북특별자치도',
        keywords: ['전북', '전라북도', '전북특별자치도', 'Jeonbuk'],
        minLat: 35.30, maxLat: 36.15,
        minLng: 125.96, maxLng: 127.95
    },
    'Jeonnam': {
        name: '전라남도',
        keywords: ['전남', '전라남도', 'Jeonnam'],
        minLat: 33.89, maxLat: 35.50,
        minLng: 125.07, maxLng: 127.80
    },
    'Gyeongbuk': {
        name: '경상북도',
        keywords: ['경북', '경상북도', 'Gyeongbuk'],
        minLat: 35.55, maxLat: 37.55,
        minLng: 127.80, maxLng: 130.94 // Ulleungdo/Dokdo check needed separately maybe, but handled loosely
    },
    'Gyeongnam': {
        name: '경상남도',
        keywords: ['경남', '경상남도', 'Gyeongnam'],
        minLat: 34.47, maxLat: 35.90,
        minLng: 127.56, maxLng: 129.25
    },
    'Jeju': {
        name: '제주특별자치도',
        keywords: ['제주', '제주도', '제주특별자치도', 'Jeju'],
        minLat: 33.10, maxLat: 34.01,
        minLng: 126.08, maxLng: 127.00
    }
};

export const findRegionByKeyword = (input: string): string | null => {
    if (!input) return null;
    const normalized = input.replace(/\s+/g, '');
    for (const [key, bound] of Object.entries(REGION_BOUNDS)) {
        if (bound.keywords.some(k => normalized.includes(k))) {
            return key;
        }
    }
    return null;
};
