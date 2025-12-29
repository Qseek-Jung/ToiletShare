import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Lock, Building2, Star, ChevronLeft, Map, LayoutGrid } from 'lucide-react'; // Changed icons
import { Toilet, UserRole, Gender } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';

// --- Types ---

interface RegionData {
    name: string; // e.g., "송파구"
    total: number;
    adminPublic: number;
    userMale: number;
    userMaleLocked: number;
    userFemale: number;
    userFemaleLocked: number;
    userUni: number;
    userUniLocked: number;
    avgRating: number;
}

interface ProvinceData {
    id: string; // e.g., "seoul"
    name: string; // e.g., "서울특별시"
    shortName: string; // e.g., "서울" - Added for cleaner UI
    aliases: string[]; // e.g., ["서울", "서울시"]
    districts: { [key: string]: RegionData }; // Aggregated by district
    total: number; // Province Total
}

const NORMALIZED_PROVINCES: { [key: string]: string } = {
    '서울': '서울특별시', '서울시': '서울특별시', '서울특별시': '서울특별시',
    '경기': '경기도', '경기도': '경기도',
    '인천': '인천광역시', '인천시': '인천광역시', '인천광역시': '인천광역시',
    '강원': '강원특별자치도', '강원도': '강원특별자치도', '강원특별자치도': '강원특별자치도',
    '충북': '충청북도', '충청북도': '충청북도',
    '충남': '충청남도', '충청남도': '충청남도',
    '대전': '대전광역시', '대전시': '대전광역시', '대전광역시': '대전광역시',
    '세종': '세종특별자치시', '세종시': '세종특별자치시', '세종특별자치시': '세종특별자치시',
    '전북': '전북특별자치도', '전라북도': '전북특별자치도', '전북특별자치도': '전북특별자치도',
    '전남': '전라남도', '전라남도': '전라남도',
    '광주': '광주광역시', '광주시': '광주광역시', '광주광역시': '광주광역시',
    '경북': '경상북도', '경상북도': '경상북도',
    '대구': '대구광역시', '대구시': '대구광역시', '대구광역시': '대구광역시',
    '경남': '경상남도', '경상남도': '경상남도',
    '부산': '부산광역시', '부산시': '부산광역시', '부산광역시': '부산광역시',
    '울산': '울산광역시', '울산시': '울산광역시', '울산광역시': '울산광역시',
    '제주': '제주특별자치도', '제주도': '제주특별자치도', '제주특별자치도': '제주특별자치도'
};

const PROVINCE_CONFIG = [
    { id: 'seoul', name: '서울특별시', shortName: '서울' },
    { id: 'gyeonggi', name: '경기도', shortName: '경기' },
    { id: 'incheon', name: '인천광역시', shortName: '인천' },
    { id: 'gangwon', name: '강원특별자치도', shortName: '강원' },
    { id: 'chungbuk', name: '충청북도', shortName: '충북' },
    { id: 'chungnam', name: '충청남도', shortName: '충남' },
    { id: 'daejeon', name: '대전광역시', shortName: '대전' },
    { id: 'sejong', name: '세종특별자치시', shortName: '세종' },
    { id: 'jeonbuk', name: '전북특별자치도', shortName: '전북' },
    { id: 'jeonnam', name: '전라남도', shortName: '전남' },
    { id: 'gwangju', name: '광주광역시', shortName: '광주' },
    { id: 'gyeongbuk', name: '경상북도', shortName: '경북' },
    { id: 'daegu', name: '대구광역시', shortName: '대구' },
    { id: 'gyeongnam', name: '경상남도', shortName: '경남' },
    { id: 'busan', name: '부산광역시', shortName: '부산' },
    { id: 'ulsan', name: '울산광역시', shortName: '울산' },
    { id: 'jeju', name: '제주특별자치도', shortName: '제주' },
    { id: 'overseas', name: '해외/기타', shortName: '해외' }
];

// Map lookup for normalization
const PROVINCE_ID_MAP: { [key: string]: string } = {};
PROVINCE_CONFIG.forEach(p => PROVINCE_ID_MAP[p.name] = p.id);

// --- Helper Functions ---

const normalizeAddress = (address: string) => {
    if (!address) return { province: '', district: '' };

    // Clean input
    const cleanAddr = address.trim();
    const parts = cleanAddr.split(/\s+/);
    const district = parts[1] || '기타';

    // User Request: Use first 2 chars to determine province
    const prefix = cleanAddr.substring(0, 2);
    let provinceId = 'overseas';

    switch (prefix) {
        case '서울': provinceId = 'seoul'; break;
        case '경기': provinceId = 'gyeonggi'; break;
        case '인천': provinceId = 'incheon'; break;
        case '강원': provinceId = 'gangwon'; break;
        case '제주': provinceId = 'jeju'; break;
        case '세종': provinceId = 'sejong'; break;
        case '대전': provinceId = 'daejeon'; break;
        case '대구': provinceId = 'daegu'; break;
        case '광주': provinceId = 'gwangju'; break;
        case '부산': provinceId = 'busan'; break;
        case '울산': provinceId = 'ulsan'; break;

        // Explicit Short Forms (e.g. 충남, 전북)
        case '충북': provinceId = 'chungbuk'; break;
        case '충남': provinceId = 'chungnam'; break;
        case '전북': provinceId = 'jeonbuk'; break;
        case '전남': provinceId = 'jeonnam'; break;
        case '경북': provinceId = 'gyeongbuk'; break;
        case '경남': provinceId = 'gyeongnam'; break;

        // Ambiguous Prefixes (Traditional Names: 충청, 전라, 경상)
        case '충청':
            // Check 3rd char or full string
            if (cleanAddr.includes('북')) provinceId = 'chungbuk';
            else if (cleanAddr.includes('남')) provinceId = 'chungnam';
            break;
        case '전라':
            if (cleanAddr.includes('북')) provinceId = 'jeonbuk';
            else if (cleanAddr.includes('남')) provinceId = 'jeonnam';
            break;
        case '경상':
            if (cleanAddr.includes('북')) provinceId = 'gyeongbuk';
            else if (cleanAddr.includes('남')) provinceId = 'gyeongnam';
            break;

        default:
            // Fallback: Check if valid ID directly (rare)
            // or just 'overseas'
            break;
    }

    return { province: provinceId, district };
};


export const RegionalStats: React.FC = () => {
    // Stores aggregated stats directly
    const [stats, setStats] = useState<{ [key: string]: ProvinceData }>({});
    const [loading, setLoading] = useState(true);
    const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
    const [dataSource, setDataSource] = useState<'server' | 'client' | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        // 1. Try RPC First (Optimized)
        try {
            const rawData = await db.getRegionalStats();

            if (rawData && rawData.length > 0) {
                processRpcData(rawData);
                setDataSource('server');
                setLoading(false);
                return;
            } else {
                // RPC returned empty, fallback
            }
        } catch (error) {
            // Silently fallback
        }

        // 2. Fallback: Client-Side Pagination Loop
        try {
            let allToilets: Toilet[] = [];
            let page = 1;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data } = await db.getAdminToilets(page, pageSize, { filterSource: 'all' } as any);
                if (!data || data.length === 0) {
                    hasMore = false;
                } else {
                    allToilets = [...allToilets, ...data];
                    if (data.length < pageSize) hasMore = false;
                    else page++;
                }
                if (page > 50) break; // Limit 50k
            }

            processClientData(allToilets);
            setDataSource('client');

        } catch (error) {
            console.error("Critical: Failed to fetch statistics data via fallback", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Processors ---

    // Process RPC Data
    const processRpcData = (rawData: any[]) => {
        const newStats = initStats();
        // 'misc' catch-all for anything truly not matching config, though config now has 'overseas'
        // We can keep 'misc' hidden or merged.
        // newStats['misc'] = { id: 'misc', name: '알수없음', shortName: '미분류', aliases: [], districts: {}, total: 0 };

        // Populate from RPC
        rawData.forEach((r: any) => {
            const pid = r.province_id || 'overseas';
            const pData = newStats[pid] || newStats['overseas']; // fallback to overseas if pid not found in config
            if (!pData) return;

            const count = parseInt(r.total_count || '0');
            pData.total += count;

            pData.districts[r.district_name] = {
                name: r.district_name,
                total: count,
                adminPublic: parseInt(r.admin_public_count || '0'),
                userMale: parseInt(r.user_male_count || '0'),
                userMaleLocked: parseInt(r.user_male_locked_count || '0'),
                userFemale: parseInt(r.user_female_count || '0'),
                userFemaleLocked: parseInt(r.user_female_locked_count || '0'),
                userUni: parseInt(r.user_uni_count || '0'),
                userUniLocked: parseInt(r.user_uni_locked_count || '0'),
                avgRating: 0
            };
        });
        setStats(newStats);
    };

    // Process Client Data (Fallback)
    const processClientData = (toilets: Toilet[]) => {
        const newStats = initStats();

        toilets.forEach(t => {
            const { province, district } = normalizeAddress(t.address || '');
            const pData = newStats[province];
            if (!pData) return;

            if (!pData.districts[district]) {
                pData.districts[district] = {
                    name: district, total: 0, adminPublic: 0,
                    userMale: 0, userMaleLocked: 0, userFemale: 0, userFemaleLocked: 0,
                    userUni: 0, userUniLocked: 0, avgRating: 0
                };
            }

            const dData = pData.districts[district];
            dData.total++;
            pData.total++;

            // Simple Aggregation
            // Note: We don't have perfect role check here without complex joins in client fallback without excessive fetches
            // defaulting to simple check
            const isAdmin = t.source === 'admin' || t.createdBy === 'admin';

            if (isAdmin && !t.isPrivate) {
                dData.adminPublic++;
            } else {
                const isLocked = t.hasPassword;
                if (t.genderType === Gender.MALE) {
                    dData.userMale++;
                    if (isLocked) dData.userMaleLocked++;
                } else if (t.genderType === Gender.FEMALE) {
                    dData.userFemale++;
                    if (isLocked) dData.userFemaleLocked++;
                } else {
                    dData.userUni++;
                    if (isLocked) dData.userUniLocked++;
                }
            }
        });

        setStats(newStats);
    };

    const initStats = () => {
        const s: { [key: string]: ProvinceData } = {};
        PROVINCE_CONFIG.forEach(p => {
            s[p.id] = { id: p.id, name: p.name, shortName: p.shortName, aliases: [], districts: {}, total: 0 };
        });
        // s['misc'] removed, unified into 'overseas' which is in config now
        return s;
    };

    const aggregatedData = stats; // Alias for compatibility with render logic

    const activeProvince = selectedProvinceId ? aggregatedData[selectedProvinceId] : null;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px]">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    // --- Render: Main Layout ---
    return (
        <div className="h-full flex flex-col bg-gray-50/50 p-1">

            {/* Header / Navigation */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    {!activeProvince ? (
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Map className="w-6 h-6 text-gray-400" />
                            지역별 등록 현황
                            {dataSource === 'server' && (
                                <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100 flex items-center gap-1">
                                    ⚡ 실시간 최적화됨
                                </span>
                            )}
                            {dataSource === 'client' && (
                                <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                                    🐢 호환성 모드 (SQL 업데이트 필요)
                                </span>
                            )}
                        </h2>
                    ) : (
                        <button
                            onClick={() => setSelectedProvinceId(null)}
                            className="group flex items-center gap-2 text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                            <ChevronLeft className="w-6 h-6 bg-gray-100 rounded-full p-1 group-hover:bg-blue-100 transition-colors" />
                            {activeProvince.name}
                            <span className="text-lg font-medium text-gray-400 ml-2">
                                전체 {activeProvince.total.toLocaleString()}건
                            </span>
                        </button>
                    )}
                </div>
                {/* Optional Status Indicator */}
                {!activeProvince && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-full border shadow-sm">
                        <LayoutGrid className="w-4 h-4" />
                        <span>전체 {Object.values(aggregatedData).reduce((acc: number, curr: ProvinceData) => acc + curr.total, 0).toLocaleString()}개소 등록됨</span>
                    </div>
                )}
            </div>

            {/* Content Switcher */}
            {!activeProvince ? (
                // --- STEP 1: PROVINCE GRID ---
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in zoom-in-95 duration-300">
                    {PROVINCE_CONFIG.map((config) => {
                        const data = aggregatedData[config.id];
                        const count = data ? data.total : 0;

                        return (
                            <button
                                key={config.id}
                                onClick={() => setSelectedProvinceId(config.id)}
                                className="relative flex flex-col items-start p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-400 hover:-translate-y-1 transition-all group"
                            >
                                <div className="absolute top-6 right-6 w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                    <Map className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-700">
                                    {config.shortName}
                                </h3>
                                <div className="text-sm text-gray-400 mb-4 group-hover:text-blue-400">
                                    {config.name}
                                </div>
                                <div className="mt-auto">
                                    <span className="text-3xl font-extrabold text-gray-900 group-hover:text-blue-600">
                                        {count.toLocaleString()}
                                    </span>
                                    <span className="text-sm text-gray-500 ml-1">건</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : (
                // --- STEP 2: DISTRICT GRID ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in slide-in-from-right-8 duration-300">
                    {/* Summary Card for Province (Optional, first tile) */}
                    {(() => {
                        const districtsArray = Object.values(activeProvince.districts) as RegionData[];
                        // Aggregate logic repeated or just use calculated totals
                        // Let's create a summary data object
                        const dData: RegionData = districtsArray.reduce((acc, curr) => ({
                            name: '전체 합계',
                            total: acc.total + curr.total,
                            adminPublic: acc.adminPublic + curr.adminPublic,
                            userMale: acc.userMale + curr.userMale,
                            userMaleLocked: acc.userMaleLocked + curr.userMaleLocked,
                            userFemale: acc.userFemale + curr.userFemale,
                            userFemaleLocked: acc.userFemaleLocked + curr.userFemaleLocked,
                            userUni: acc.userUni + curr.userUni,
                            userUniLocked: acc.userUniLocked + curr.userUniLocked,
                            avgRating: 0 // calc below
                        }), {
                            name: 'Total', total: 0, adminPublic: 0,
                            userMale: 0, userMaleLocked: 0,
                            userFemale: 0, userFemaleLocked: 0,
                            userUni: 0, userUniLocked: 0,
                            avgRating: 0
                        } as RegionData);

                        const totalRated = districtsArray.reduce((acc, d) => acc + ((d as any)._ratingCount || 0), 0);
                        const totalScore = districtsArray.reduce((acc, d) => acc + ((d as any)._ratingSum || 0), 0);
                        dData.avgRating = totalRated > 0 ? totalScore / totalRated : 0;

                        return (
                            <div className="col-span-full mb-4">
                                <DistrictCard data={dData} isMain={true} regionName={activeProvince.name} />
                            </div>
                        );
                    })()}

                    {/* Individual District Cards */}
                    {(Object.values(activeProvince.districts) as RegionData[])
                        .sort((a, b) => b.total - a.total)
                        .map((district) => (
                            <DistrictCard
                                key={district.name}
                                data={district}
                                onClick={() => {
                                    // Navigate to toilet list with search
                                    window.location.hash = `#/admin?section=toilets&sub=toilet-list&search=${encodeURIComponent(district.name)}`;
                                }}
                            />
                        ))}
                </div>
            )}
        </div>
    );
};

// --- Sub Component: District Card ---

// --- Sub Component: District Card ---

interface DistrictCardProps {
    data: RegionData;
    isMain?: boolean;
    regionName?: string;
    onClick?: () => void;
}

const DistrictCard: React.FC<DistrictCardProps> = ({ data, isMain = false, regionName = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`
            rounded-2xl border p-5 transition-all text-left
            ${isMain
                    ? 'bg-gradient-to-br from-blue-50 to-white border-blue-200 shadow-sm flex flex-col md:flex-row gap-6 items-center'
                    : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md group cursor-pointer'
                }
        `}>
            {/* Header Section */}
            <div className={`${isMain ? 'flex-1 border-r border-blue-100 pr-6 min-w-[200px]' : 'mb-4 border-b border-gray-50 pb-3'}`}>
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className={`font-bold flex items-center gap-2 text-gray-900 ${isMain ? 'text-xl' : 'text-lg'}`}>
                            {isMain ? `${regionName} 전체 현황` : data.name}
                            {isMain && <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">Total</span>}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-2xl font-extrabold text-gray-900">
                                {data.total.toLocaleString()}
                                <span className="text-sm font-normal text-gray-500 ml-1">개소</span>
                            </span>
                            <div className="flex items-center text-amber-500 font-bold text-sm bg-amber-50 px-2 py-0.5 rounded-lg">
                                <Star className="w-3.5 h-3.5 fill-current mr-1" />
                                {data.avgRating.toFixed(1)}
                            </div>
                        </div>
                    </div>
                    {!isMain && <div className="p-2 bg-gray-50 rounded-full group-hover:bg-blue-50 transition-colors">
                        <Building2 className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                    </div>}
                </div>
            </div>

            {/* Detailed Stats Grid */}
            <div className={`grid gap-3 ${isMain ? 'flex-[2] grid-cols-2 md:grid-cols-4 w-full' : 'grid-cols-1'}`}>

                {/* Admin/Public */}
                <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-center">
                    <span className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> 공공/개방
                    </span>
                    <span className="font-bold text-gray-800 text-lg">
                        {data.adminPublic}
                    </span>
                </div>

                {/* User Male */}
                <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">사용자(남)</span>
                        {data.userMaleLocked > 0 && <LockBadge count={data.userMaleLocked} />}
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{data.userMale}</span>
                </div>

                {/* User Female */}
                <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">사용자(여)</span>
                        {data.userFemaleLocked > 0 && <LockBadge count={data.userFemaleLocked} />}
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{data.userFemale}</span>
                </div>

                {/* User Uni */}
                <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">사용자(공용)</span>
                        {data.userUniLocked > 0 && <LockBadge count={data.userUniLocked} />}
                    </div>
                    <span className="font-bold text-gray-800 text-lg">{data.userUni}</span>
                </div>
            </div>
        </div>
    );
};

const LockBadge = ({ count }: { count: number }) => (
    <div className="flex items-center text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
        <Lock className="w-2.5 h-2.5 mr-0.5 opacity-60" />
        {count}
    </div>
);
