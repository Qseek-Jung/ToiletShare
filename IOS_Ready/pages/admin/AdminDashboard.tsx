import React, { useEffect, useState } from 'react';
import { Users, FileText, AlertTriangle, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { DashboardStats } from '../../types';
import { GrowthChart } from '../../components/admin/charts/GrowthChart';
import { DistributionChart } from '../../components/admin/charts/DistributionChart';
import { BarChart } from '../../components/admin/charts/BarChart';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AdminDashboardProps {
    setActiveSection: (section: 'dashboard' | 'users' | 'toilets' | 'reports' | 'reviews' | 'ads' | 'data' | 'credit-policy' | 'push-notifications') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ setActiveSection }) => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [dailyTrends, setDailyTrends] = useState<any[]>([]);
    const [detailedStats, setDetailedStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            setLoading(true);
            try {
                // Integrated fetching
                const [basicStats, trends, detailedUserStats, adsStats, creditStats] = await Promise.all([
                    db.getDashboardStats(),
                    db.getDailyTrends(30),
                    db.getDetailedUserStats(),
                    db.getDetailedAdStats(),
                    db.getCreditStats(30)
                ]);

                setStats(basicStats);
                setDailyTrends(trends);
                setDetailedStats({
                    user: detailedUserStats,
                    ads: adsStats,
                    credit: creditStats
                });
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        loadStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Helper: Calculate Weekly Growth (WoW)
    const calculateGrowth = (field: string) => {
        if (dailyTrends.length < 14) return 0;
        const last7 = dailyTrends.slice(-7);
        const prev7 = dailyTrends.slice(-14, -7);
        const sumLast7 = last7.reduce((acc, cur) => acc + (cur[field] || 0), 0);
        const sumPrev7 = prev7.reduce((acc, cur) => acc + (cur[field] || 0), 0);
        if (sumPrev7 === 0) return sumLast7 > 0 ? 100 : 0;
        return Math.round(((sumLast7 - sumPrev7) / sumPrev7) * 100);
    };

    const userGrowth = calculateGrowth('new_users');
    const reviewGrowth = calculateGrowth('new_reviews');
    const visitorGrowth = calculateGrowth('visitors');

    // Process Data for Charts
    // Use dailyTrends for unified timeline data
    const userTrendData = dailyTrends.map(d => ({ date: d.date, new_users: d.new_users }));
    const visitorTrendData = dailyTrends.map(d => ({ date: d.date, visitors: d.visitors }));
    const adTrendData = dailyTrends.map(d => ({ date: d.date, ad_views: d.ad_views }));

    // Provider Data for Pie Chart
    const providerData = detailedStats?.user?.provider ? [
        { name: 'Google', value: detailedStats.user.provider.google, color: '#DB4437' },
        { name: 'Naver', value: detailedStats.user.provider.naver, color: '#03C75A' },
        { name: 'Kakao', value: detailedStats.user.provider.kakao, color: '#FEE500' },
        { name: 'Email', value: detailedStats.user.provider.email, color: '#4285F4' },
    ].filter(d => d.value > 0) : [];

    const renderGrowthBadge = (growth: number) => {
        if (growth === 0) return <span className="text-xs text-gray-400 font-medium">-</span>;
        const isPositive = growth > 0;
        return (
            <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(growth)}%
            </span>
        );
    };

    return (
        <div className="space-y-6 pb-20">
            {/* 1. KPI Cards Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Users */}
                <div
                    onClick={() => setActiveSection('users')}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Users className="w-5 h-5" />
                        </div>
                        {renderGrowthBadge(userGrowth)}
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-1">{stats?.totalUsers.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 font-medium">총 회원수 (주간 성장)</div>
                </div>

                {/* Total Reviews */}
                <div
                    onClick={() => setActiveSection('reviews')}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <FileText className="w-5 h-5" />
                        </div>
                        {renderGrowthBadge(reviewGrowth)}
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-1">{stats?.totalReviews.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 font-medium">총 리뷰 (주간 성장)</div>
                </div>

                {/* Today Visitors */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 group">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                            <Eye className="w-5 h-5" />
                        </div>
                        {renderGrowthBadge(visitorGrowth)}
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-1">
                        {dailyTrends.length > 0 ? dailyTrends[dailyTrends.length - 1].visitors : 0}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">오늘 방문자 (주간 성장)</div>
                </div>

                {/* Pending Reports */}
                <div
                    onClick={() => setActiveSection('reports')}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group relative"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        {stats?.pendingReports && stats.pendingReports > 0 && (
                            <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full absolute top-6 right-6"></span>
                        )}
                    </div>
                    <div className="text-2xl font-black text-gray-900 mb-1">{stats?.pendingReports}</div>
                    <div className="text-xs text-gray-500 font-medium">미처리 신고</div>
                </div>
            </div>

            {/* 2. Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Trend (Line Chart) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2 min-w-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">회원가입 현황</h3>
                            <p className="text-xs text-gray-500">최근 30일간의 신규 회원가입 현황입니다.</p>
                        </div>
                    </div>
                    <GrowthChart data={userTrendData} dataKey="new_users" color="#3b82f6" label="신규 가입" />
                </div>

                {/* Signup Source (Pie Chart) */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">가입 경로 분석</h3>
                    <p className="text-xs text-gray-500 mb-6">회원들이 어떤 경로로 가입했는지 보여줍니다.</p>
                    <DistributionChart data={providerData} />
                </div>
            </div>

            {/* 3. Secondary Stats Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Visitor Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">방문자 추이</h3>
                            <p className="text-xs text-gray-500">최근 30일간의 일일 방문자 수입니다.</p>
                        </div>
                    </div>
                    <GrowthChart data={visitorTrendData} dataKey="visitors" color="#f59e0b" label="방문자" />
                </div>

                {/* Ad Views Trend */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">광고 시청 추이</h3>
                            <p className="text-xs text-gray-500">최근 30일간의 광고 시청 및 리워드 지급 현황입니다.</p>
                        </div>
                    </div>
                    <BarChart
                        data={detailedStats?.ads?.trend || []}
                        dataKey="ad_views"
                        categoryKey="date"
                        color="#8b5cf6"
                        label="광고 시청"
                    />
                </div>
            </div>

            {/* Credit Flow Chart (New) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">크레딧 수급 현황</h3>
                        <p className="text-xs text-gray-500">일별 크레딧 적립(수입)과 차감(지출) 내역을 비교합니다.</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <div className="flex items-center"><span className="w-3 h-3 bg-green-400 rounded-sm mr-1"></span>적립</div>
                        <div className="flex items-center"><span className="w-3 h-3 bg-red-400 rounded-sm mr-1"></span>차감</div>
                        <div className="flex items-center"><span className="w-3 h-2 bg-blue-600 mr-1" style={{ height: 2 }}></span>순증감</div>
                    </div>
                </div>
                <div className="h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={200}>
                        <ComposedChart data={detailedStats?.credit || []}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(val) => val.slice(5).replace('-', '/')}
                            />
                            <YAxis yAxisId="left" fontSize={10} />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: any, name: any) => [value.toLocaleString(), name === 'earned' ? '적립' : name === 'spent' ? '차감' : '순증감']}
                                labelFormatter={(label) => `날짜: ${label}`}
                            />
                            <Bar yAxisId="left" dataKey="earned" fill="#4ade80" radius={[4, 4, 0, 0]} barSize={20} />
                            <Bar yAxisId="left" dataKey="spent" fill="#f87171" radius={[4, 4, 0, 0]} barSize={20} />
                            <Line yAxisId="left" type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};
