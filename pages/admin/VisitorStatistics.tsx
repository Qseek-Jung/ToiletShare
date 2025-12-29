import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Loader2 } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { StackedBarChart } from '../../components/admin/charts/StackedBarChart';

/**
 * VisitorStatistics Component
 * Displays daily visitor trends and device statistics.
 * (Regional Map functionality has been removed as per user request)
 */
export const VisitorStatistics: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await db.getVisitorStats();
                setStats(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

    const trendData: any[] = stats?.trend || [];
    const todayVisitors = trendData.length > 0 ? trendData[trendData.length - 1].visitors : 0;

    // Calculate WoW (Week over Week) Growth
    const calculateWoW = () => {
        if (trendData.length < 14) return 0;
        const thisWeek = trendData.slice(-7).reduce((acc: number, cur: any) => acc + (cur.visitors || 0), 0);
        const lastWeek = trendData.slice(-14, -7).reduce((acc: number, cur: any) => acc + (cur.visitors || 0), 0);
        if (lastWeek === 0) return thisWeek > 0 ? 100 : 0;
        return ((thisWeek - lastWeek) / lastWeek) * 100;
    };

    const wow = calculateWoW();
    const isPositive = wow >= 0;

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-2">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">일일 방문자 추이</h3>
                                <p className="text-xs text-gray-500">최근 30일간의 방문자 수 변화</p>
                            </div>
                        </div>
                    </div>
                    {/* Stacked Chart for Daily Device Breakdown */}
                    {(() => {
                        const chartData = trendData.map(d => ({
                            ...d,
                            visitors_unknown: Math.max(0, (d.visitors || 0) - ((d.visitors_mobile || 0) + (d.visitors_tablet || 0) + (d.visitors_pc || 0)))
                        }));

                        return (
                            <StackedBarChart
                                data={chartData}
                                categoryKey="date"
                                keys={[
                                    { key: 'visitors_mobile', name: 'Mobile', color: '#3b82f6' },
                                    { key: 'visitors_tablet', name: 'Tablet', color: '#10b981' },
                                    { key: 'visitors_pc', name: 'PC', color: '#8b5cf6' },
                                    { key: 'visitors_unknown', name: 'Unknown', color: '#d1d5db' }
                                ]}
                            />
                        );
                    })()}
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">오늘 방문자</h4>
                        <div className="text-3xl font-black text-gray-900">{todayVisitors.toLocaleString()}명</div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h4 className="text-sm font-bold text-gray-500 mb-2">주간 성장률 (WoW)</h4>
                        <div className={`text-3xl font-black ${isPositive ? 'text-green-600' : 'text-red-600'} flex items-center gap-2`}>
                            {isPositive ? '+' : ''}{wow.toFixed(1)}%
                            {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingUp className="w-6 h-6 rotate-180" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">지난 7일 대비 이번 7일의 증가율</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
