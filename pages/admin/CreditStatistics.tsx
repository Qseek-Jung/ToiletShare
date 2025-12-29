import React, { useEffect, useState } from 'react';
import { dbSupabase as db } from '../../services/db_supabase';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Line, Area } from 'recharts';
import { Loader2, Calendar } from 'lucide-react';

export const CreditStatistics: React.FC = () => {
    const [stats, setStats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<number>(30); // Default 30 days

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await db.getCreditStats(period);
                setStats(data);
            } catch (error) {
                console.error("Failed to fetch credit stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [period]);

    // 기간 변경 핸들러
    const periods = [
        { label: '7일', value: 7 },
        { label: '30일', value: 30 },
        { label: '3개월', value: 90 },
        { label: '6개월', value: 180 },
        { label: '1년', value: 365 },
    ];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header / Filter */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="font-bold">분석 기간 설정</span>
                </div>
                <div className="flex gap-2">
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${period === p.value
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 1. 종합 순수지 (Net Balance) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">종합 수급 현황 (Net Balance)</h3>
                    <p className="text-sm text-gray-500">전체 적립량과 차감량을 비교하여 일별 크레딧 잉여/부족분을 파악합니다.</p>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(val: string) => val.slice(5).replace('-', '/')}
                            />
                            <YAxis />
                            <Tooltip
                                labelFormatter={(label) => `날짜: ${label}`}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="earned" stackId="1" fill="#4ade80" stroke="#22c55e" fillOpacity={0.2} name="적립 (Earned)" />
                            <Area type="monotone" dataKey="spent" stackId="2" fill="#f87171" stroke="#ef4444" fillOpacity={0.2} name="차감 (Spent)" />
                            <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={3} dot={false} name="순증감 (Net)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. 적립 상세 (Stacked Bar) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">유형별 적립 상세 (Earnings Breakdown)</h3>
                    <p className="text-sm text-gray-500">어떤 활동을 통해 크레딧이 발행되었는지 분석합니다.</p>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(val: string) => val.slice(5).replace('-', '/')}
                            />
                            <YAxis />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-xs">
                                                <p className="font-bold mb-2">{label}</p>
                                                {payload.map((entry: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                        <span className="text-gray-600 w-24">{translateType(entry.name)}</span>
                                                        <span className="font-bold">{entry.value} C</span>
                                                    </div>
                                                ))}
                                                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between font-bold">
                                                    <span>합계</span>
                                                    <span>{payload.reduce((acc, curr) => acc + (curr.value as number), 0)} C</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend formatter={(value) => translateType(value)} />
                            <Bar dataKey="earnedDetail.signup" stackId="a" fill="#3b82f6" name="signup" />
                            <Bar dataKey="earnedDetail.referral" stackId="a" fill="#6366f1" name="referral" />
                            <Bar dataKey="earnedDetail.review" stackId="a" fill="#8b5cf6" name="review" />
                            <Bar dataKey="earnedDetail.ad_reward" stackId="a" fill="#ec4899" name="ad_reward" />
                            <Bar dataKey="earnedDetail.video_reward" stackId="a" fill="#d946ef" name="video_reward" />
                            <Bar dataKey="earnedDetail.toilet_register" stackId="a" fill="#10b981" name="toilet_register" />
                            <Bar dataKey="earnedDetail.other" stackId="a" fill="#9ca3af" name="other" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 3. 차감 상세 (Stacked Bar) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900">유형별 차감 상세 (Spending Breakdown)</h3>
                    <p className="text-sm text-gray-500">사용자들이 크레딧을 주로 어디에 소비하는지 분석합니다.</p>
                </div>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(val: string) => val.slice(5).replace('-', '/')}
                            />
                            <YAxis />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl text-xs">
                                                <p className="font-bold mb-2">{label}</p>
                                                {payload.map((entry: any, index: number) => (
                                                    <div key={index} className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                                                        <span className="text-gray-600 w-24">{translateType(entry.name)}</span>
                                                        <span className="font-bold">{entry.value} C</span>
                                                    </div>
                                                ))}
                                                <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between font-bold">
                                                    <span>합계</span>
                                                    <span>{payload.reduce((acc, curr) => acc + (curr.value as number), 0)} C</span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend formatter={(value) => translateType(value)} />
                            <Bar dataKey="spentDetail.toilet_unlock" stackId="a" fill="#f59e0b" name="toilet_unlock" />
                            <Bar dataKey="spentDetail.report_penalty" stackId="a" fill="#ef4444" name="report_penalty" />
                            <Bar dataKey="spentDetail.other" stackId="a" fill="#9ca3af" name="other" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

// Helper to translate types to Korean
function translateType(type: string): string {
    const map: Record<string, string> = {
        'signup': '회원가입',
        'referral': '추천인 보상',
        'review': '리뷰 작성',
        'ad_reward': '광고 시청',
        'video_reward': '영상 시청',
        'toilet_register': '화장실 등록',
        'toilet_unlock': '비번 열람',
        'report_penalty': '신고 패널티',
        'other': '기타',
        'earned': '총 적립',
        'spent': '총 차감',
        'net': '순증감'
    };
    return map[type] || type;
}
