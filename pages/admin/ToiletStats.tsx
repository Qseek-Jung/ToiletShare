import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Calendar, Lock, Unlock, TrendingUp, Users } from 'lucide-react';
import { Toilet, UserRole, Gender } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';

// --- Helper: Date Formatting ---
const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${d.getMonth() + 1}/${d.getDate()}`;
};

const getWeekNumber = (d: Date) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

// --- Main Component ---

export const ToiletStats: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m' | '6m' | '1y' | 'custom'>('1m');

    // rawDataItems stores normalized daily items.
    // Structure: { date: Date, male: number, maleLocked: number ... total: number }
    const [rawDataItems, setRawDataItems] = useState<any[]>([]);

    const [chartData, setChartData] = useState<any[]>([]);

    // Init summary with default values to allow instant render
    const [summaryData, setSummaryData] = useState<any>({ total: 0, newThisWeek: 0, lockRate: 0, avgRating: 0 });

    // Track source for debugging/UI
    const [dataSource, setDataSource] = useState<'server' | 'client' | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Emergency Mode: Use Lightweight Client Fetch (No RPC)
            // This avoids 400 Errors from SQL and is fast enough (~300KB payload)
            // It fetches ALL stats-relevant columns efficiently.
            const rawItems = await db.getToiletStatsRaw();

            processData(rawItems);
            setDataSource('client'); // Using client calculation but optimized
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Unified Data Processing
    const processData = (data: any[]) => {
        let dailyItems: any[] = [];
        let totalCount = 0;
        let totalLocked = 0;
        let newWeekCount = 0;
        let ratingSum = 0;
        let ratingCount = 0;

        // Calculate "One Week Ago" for "New This Week" metric
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        oneWeekAgo.setHours(0, 0, 0, 0);

        // Group by Date immediately
        const groupedMap = new Map<string, any>();

        data.forEach(t => {
            if (!t.created_at) return;

            // SAFE Date Parsing
            const dateStr = t.created_at.split('T')[0]; // Simple string split is safest for YYYY-MM-DD
            // Check invalid date
            if (dateStr.length !== 10) return;

            // Admin Logic
            // Note: users property comes from join
            const creatorRole = t.users?.role;
            const isAdmin = t.source === 'admin' || t.created_by === 'admin' || creatorRole === 'ADMIN' || creatorRole === 'VIP';

            // We only want USER stats for this page (as per original logic)
            if (isAdmin) return;

            if (!groupedMap.has(dateStr)) {
                groupedMap.set(dateStr, {
                    dateStr,
                    total: 0, male: 0, maleLocked: 0, female: 0, femaleLocked: 0, uni: 0, uniLocked: 0,
                    ratingSum: 0, ratingCount: 0
                });
            }

            const g = groupedMap.get(dateStr);
            g.total++;
            totalCount++;

            // Rating
            if (t.rating_avg > 0) {
                g.ratingSum += t.rating_avg;
                g.ratingCount++;
                ratingSum += t.rating_avg;
                ratingCount++;
            }

            // Gender/Lock
            const isLocked = t.has_password;
            if (isLocked) totalLocked++;

            // Note: DB returns gender_type (snake_case)
            if (t.gender_type === 'MALE' || t.gender_type === 'male') {
                g.male++;
                if (isLocked) g.maleLocked++;
            } else if (t.gender_type === 'FEMALE' || t.gender_type === 'female') {
                g.female++;
                if (isLocked) g.femaleLocked++;
            } else {
                g.uni++;
                if (isLocked) g.uniLocked++;
            }

            // Week Logic
            if (new Date(t.created_at) >= oneWeekAgo) {
                newWeekCount++;
            }
        });

        // Convert Map to Array
        dailyItems = Array.from(groupedMap.values()).map(g => ({
            date: new Date(g.dateStr),
            male: g.male, maleLocked: g.maleLocked,
            female: g.female, femaleLocked: g.femaleLocked,
            uni: g.uni, uniLocked: g.uniLocked,
            total: g.total,
            ratingSum: g.ratingSum,
            ratingCount: g.ratingCount
        }));

        setSummaryData({
            total: totalCount,
            newThisWeek: newWeekCount,
            lockRate: totalCount > 0 ? (totalLocked / totalCount) * 100 : 0,
            avgRating: ratingCount > 0 ? ratingSum / ratingCount : 0
        });

        setRawDataItems(dailyItems);
    };


    // --- Aggregation Logic (Chart Generation) ---
    useEffect(() => {
        // If loading, skip. 
        // Note: rawDataItems could be empty if no data exists, which is valid.
        if (loading) return;

        const now = new Date();
        const rangeStart = new Date();
        rangeStart.setHours(0, 0, 0, 0); // Normalize Start of Day

        switch (timeRange) {
            case '1w': rangeStart.setDate(now.getDate() - 7); break;
            case '1m': rangeStart.setMonth(now.getMonth() - 1); break;
            case '3m': rangeStart.setMonth(now.getMonth() - 3); break;
            case '6m': rangeStart.setMonth(now.getMonth() - 6); break;
            case '1y': rangeStart.setFullYear(now.getFullYear() - 1); break;
            case 'custom':
                // Fallback to 1m if custom logic not fully implemented yet 
                rangeStart.setMonth(now.getMonth() - 1);
                break;
            default: rangeStart.setMonth(now.getMonth() - 1); break;
        }

        // 1. Initialize ALL Buckets in Range (Fill Holes with Zeros)
        const grouped: { [key: string]: any } = {};
        const isWeekly = timeRange === '3m' || timeRange === '6m' || timeRange === '1y';

        const cursor = new Date(rangeStart);
        const end = new Date(); // Today (Local)

        while (cursor <= end) {
            let key = '';
            let label = '';

            if (isWeekly) {
                const week = getWeekNumber(cursor);
                key = `${cursor.getFullYear()}-W${week}`;
                label = `${week}주차`;
            } else {
                // Use Local Time for Key to match Chart Cursor logic
                const y = cursor.getFullYear();
                const m = String(cursor.getMonth() + 1).padStart(2, '0');
                const d = String(cursor.getDate()).padStart(2, '0');
                key = `${y}-${m}-${d}`;
                label = formatDate(key);
            }

            if (!grouped[key]) {
                grouped[key] = {
                    key,
                    label,
                    rawDate: new Date(cursor),
                    male: 0, maleLocked: 0,
                    female: 0, femaleLocked: 0,
                    uni: 0, uniLocked: 0,
                    total: 0
                };
            }

            // Increment cursor
            if (isWeekly) cursor.setDate(cursor.getDate() + 7);
            else cursor.setDate(cursor.getDate() + 1);
        }

        // 2. Populate from Normalized Items
        // Filter items within range
        const filtered = rawDataItems.filter(item => item.date >= rangeStart);

        filtered.forEach(item => {
            let key = '';
            if (isWeekly) {
                const week = getWeekNumber(item.date);
                key = `${item.date.getFullYear()}-W${week}`;
            } else {
                // Use Local Time for Item key too
                const y = item.date.getFullYear();
                const m = String(item.date.getMonth() + 1).padStart(2, '0');
                const d = String(item.date.getDate()).padStart(2, '0');
                key = `${y}-${m}-${d}`;
            }

            // Only aggregate if key exists (it should, mostly, unless data is future dated)
            if (grouped[key]) {
                const g = grouped[key];
                g.total += item.total;
                g.male += item.male;
                g.maleLocked += item.maleLocked;
                g.female += item.female;
                g.femaleLocked += item.femaleLocked;
                g.uni += item.uni;
                g.uniLocked += item.uniLocked;
            }
        });

        // Convert to Array & Sort by Date
        const sorted = Object.values(grouped).sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
        setChartData(sorted);

    }, [rawDataItems, timeRange, loading]);


    // --- Summary Metrics ---
    const summary = summaryData;


    // --- Custom Tooltip ---
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-4 border border-blue-100 rounded-xl shadow-xl text-sm">
                    <p className="font-bold text-gray-800 mb-2">{data.label}</p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-600">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span>남성: <span className="font-bold">{data.male}건</span></span>
                            <span className="text-xs text-gray-400 font-mono">(🔒{data.maleLocked})</span>
                        </div>
                        <div className="flex items-center gap-2 text-pink-500">
                            <span className="w-2 h-2 rounded-full bg-pink-500"></span>
                            <span>여성: <span className="font-bold">{data.female}건</span></span>
                            <span className="text-xs text-gray-400 font-mono">(🔒{data.femaleLocked})</span>
                        </div>
                        <div className="flex items-center gap-2 text-amber-500">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span>공용: <span className="font-bold">{data.uni}건</span></span>
                            <span className="text-xs text-gray-400 font-mono">(🔒{data.uniLocked})</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                            <span className="text-gray-500">총계</span>
                            <span className="font-bold text-gray-900">{data.total}건</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[500px]">
                <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-4" />
                <p className="text-gray-500">화장실 통계를 분석하는 중입니다...</p>
                {/* Visual Feedback on Source (Optional, subtle) */}
                <p className="text-xs text-gray-400 mt-2">최적화된 경로로 데이터 로딩 시도 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Indicator */}
            <div className="flex justify-end">
                {dataSource === 'server' ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <span style={{ fontSize: '10px' }}>⚡</span> 실시간 최적화됨
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                        <span style={{ fontSize: '10px' }}>⚡</span> 고속 데이터 모드 (전체 로드 완료)
                    </span>
                )}
            </div>

            {/* Summary Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="text-gray-500 text-sm font-medium mb-1">총 사용자 등록</div>
                    <div className="text-3xl font-black text-gray-900">{summary.total.toLocaleString()}</div>
                    <div className="mt-auto text-xs text-blue-500 font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> 누적 데이터
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="text-gray-500 text-sm font-medium mb-1">이번 주 신규</div>
                    <div className="text-3xl font-black text-blue-600">+{summary.newThisWeek}</div>
                    <div className="mt-auto text-xs text-green-500 font-medium flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> 성장세 유지 중
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="text-gray-500 text-sm font-medium mb-1">평균 평점</div>
                    <div className="text-3xl font-black text-amber-500 flex items-center gap-1">
                        {summary.avgRating.toFixed(1)} <span className="text-lg text-amber-300">/ 5.0</span>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    <div className="text-gray-500 text-sm font-medium mb-1">잠금(비번) 비율</div>
                    <div className="text-3xl font-black text-gray-700">{summary.lockRate.toFixed(1)}%</div>
                    <div className="mt-auto text-xs text-gray-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> {summary.lockRate > 50 ? '폐쇄형이 더 많아요' : '개방형이 더 많아요'}
                    </div>
                </div>
            </div>

            {/* Chart Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h3 className="text-lg font-bold text-gray-900">일별/주별 등록 추이</h3>

                    {/* Time Range Selector */}
                    <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                        {['1w', '1m', '3m', '6m', '1y'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r as any)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${timeRange === r
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {{ '1w': '1주', '1m': '1개월', '3m': '3개월', '6m': '6개월', '1y': '1년' }[r]}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                dy={10}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                dx={-10}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar name="남성" dataKey="male" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} barSize={20} />
                            <Bar name="여성" dataKey="female" stackId="a" fill="#ec4899" radius={[0, 0, 0, 0]} barSize={20} />
                            <Bar name="공용" dataKey="uni" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
