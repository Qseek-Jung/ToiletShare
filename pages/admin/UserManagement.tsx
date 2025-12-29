import React, { useState, useEffect } from 'react';
import { Search, Download, X, Shield, Star, User as UserIcon, Loader2, Trash2, Filter } from 'lucide-react';
import { User, UserRole, DailyStats, BannedUser } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { LineChart } from '../../components/admin/LineChart';
import { CalendarView } from '../../components/admin/CalendarView';
import { GrowthChart } from '../../components/admin/charts/GrowthChart';
import { DistributionChart } from '../../components/admin/charts/DistributionChart';
import { StackedBarChart } from '../../components/admin/charts/StackedBarChart';
import { TrendingUp, PieChart, Smartphone, Monitor } from 'lucide-react';
import { VisitorStatistics } from './VisitorStatistics';
import { WithdrawnUsersPage } from './WithdrawnUsersPage';

// --- Extracted Components ---

// --- Extracted Components ---

interface UserListViewProps {
    onRefresh?: () => void;
}

const UserListView: React.FC<UserListViewProps> = ({ onRefresh }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);

    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterGender, setFilterGender] = useState<string>('all');
    const [filterRole, setFilterRole] = useState<string>('all');
    const [filterLevel, setFilterLevel] = useState<string>('all');
    const [filterProvider, setFilterProvider] = useState<string>('all');

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBanConfirm, setShowBanConfirm] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data, count } = await db.getAdminUsers(page, limit, {
                search: debouncedSearch,
                gender: filterGender,
                role: filterRole, // 'all' is handled in db service
                level: filterLevel,
                provider: filterProvider
            });
            setUsers(data);
            setTotalCount(count);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [page, limit, debouncedSearch, filterGender, filterRole, filterLevel, filterProvider]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set());
    }, [debouncedSearch, filterGender, filterRole, filterLevel, filterProvider]);


    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(users.map(u => u.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectUser = (id: string, checked: boolean) => {
        const newSelected = new Set(selectedIds);
        if (checked) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        setIsProcessing(true);
        try {
            const idsToDelete: string[] = Array.from(selectedIds);
            for (const id of idsToDelete) {
                await db.deleteUser(id);
            }
            fetchData();
            onRefresh?.();
            setShowBulkDeleteConfirm(false);
            setSelectedIds(new Set());
            alert(`${idsToDelete.length}명의 회원이 삭제되었습니다.`);
        } catch (e) {
            console.error(e);
            alert('일부 회원 삭제 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadCSV = () => {
        // Note: This only downloads CURRENT PAGE in paginated view. 
        // For full export, we would need a separate backend call or iterate all pages.
        // Alerting user for clarification.
        if (totalCount > users.length) {
            if (!window.confirm(`현재 페이지(${users.length}명)만 다운로드됩니다. 계속하시겠습니까?`)) return;
        }

        const headers = ['ID', 'Email', 'Role', 'Credits', 'Gender', 'Created At'];
        const csvContent = [
            headers.join(','),
            ...users.map(u => [
                u.id,
                `"${u.email}"`,
                u.role,
                u.credits,
                u.gender || 'N/A',
                u.createdAt || ''
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const getRoleIcon = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN: return <Shield className="w-5 h-5 text-red-600" />;
            case UserRole.VIP: return <Star className="w-5 h-5 text-amber-500 fill-current" />;
            case UserRole.USER: return <UserIcon className="w-5 h-5 text-blue-500" />;
            default: return <UserIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getRoleBadge = (role: UserRole) => {
        switch (role) {
            case UserRole.ADMIN: return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">ADMIN</span>;
            case UserRole.VIP: return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">VIP</span>;
            case UserRole.USER: return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">USER</span>;
            default: return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs font-bold">GUEST</span>;
        }
    };

    const handleUserClick = (u: User) => {
        window.location.hash = `#/admin/users/${u.id}`;
    };

    const handleRoleChange = async (newRole: UserRole) => {
        if (!selectedUser) return;
        const updatedUser = { ...selectedUser, role: newRole };

        // Optimistic
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
        setSelectedUser(updatedUser);

        setIsProcessing(true);
        try {
            await db.saveUser(updatedUser);
        } catch (error) {
            console.error(error);
            fetchData(); // Revert
            alert("등급 변경에 실패했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCreditChange = async (amount: number) => {
        if (!selectedUser) return;
        const newCredits = Math.max(0, selectedUser.credits + amount);
        const updatedUser = { ...selectedUser, credits: newCredits };

        setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u));
        setSelectedUser(updatedUser);

        setIsProcessing(true);
        try {
            await db.saveUser(updatedUser);
        } catch (error) {
            console.error(error);
            fetchData();
            alert("크래딧 업데이트에 실패했습니다.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        setIsProcessing(true);
        try {
            await db.deleteUser(selectedUser.id);
            fetchData();
            onRefresh?.();
            setShowDeleteConfirm(false);
            setShowUserModal(false);
            alert('회원이 삭제되었습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBanUser = async () => {
        if (!selectedUser || !banReason.trim()) {
            alert('차단 사유를 입력해주세요.');
            return;
        }
        setIsProcessing(true);
        try {
            await db.banUserPermanently(selectedUser.id, banReason, 'admin');
            fetchData();
            onRefresh?.();
            setShowBanConfirm(false);
            setShowUserModal(false);
            setBanReason('');
            alert('회원이 영구 차단되었습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    // Derived stats for CURRENT PAGE only (Limitation of server pagination)
    // To show total stats properly, we need separate API or DashboardStats.
    // For now, we remove the filtered count stats or just show "Page Stats"

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="이메일, 닉네임 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                    />
                </div>
                <button
                    onClick={downloadCSV}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                >
                    <Download className="w-3 h-3" />
                    CSV
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
                <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-white border text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="all">전체 성별</option>
                    <option value="MALE">남성</option>
                    <option value="FEMALE">여성</option>
                </select>
                <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-white border text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="all">전체 권한</option>
                    <option value="admin">관리자</option>
                    <option value="vip">VIP</option>
                    <option value="user">일반</option>
                </select>
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)} className="bg-white border text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="all">전체 등급</option>
                    <option value="0">Lv.0</option>
                    <option value="1">Lv.1</option>
                    <option value="2">Lv.2</option>
                    <option value="3">Lv.3</option>
                    <option value="4">Lv.4</option>
                    <option value="5">Lv.5</option>
                </select>
                <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} className="bg-white border text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="all">전체 가입유형</option>
                    <option value="email">이메일</option>
                    <option value="google">구글</option>
                    <option value="kakao">카카오</option>
                    <option value="naver">네이버</option>
                </select>

                {selectedIds.size > 0 && (
                    <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="hidden md:flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors ml-auto"
                    >
                        <Trash2 className="w-3 h-3" />
                        {selectedIds.size}명 삭제
                    </button>
                )}
            </div>

            {/* User List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 bg-gray-50 border-b font-bold text-sm text-gray-600 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            className="hidden md:block rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={users.length > 0 && selectedIds.size === users.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                        <span>회원 목록</span>
                    </div>
                    <span className="text-xs text-gray-400">총 {totalCount}명 (현재 {users.length}명)</span>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 max-h-[500px] md:max-h-[600px] lg:max-h-[700px] overflow-y-auto">
                        {users.map(u => (
                            <div
                                key={u.id}
                                className={`p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedIds.has(u.id) ? 'bg-blue-50/50' : ''}`}
                            >
                                <input
                                    type="checkbox"
                                    className="hidden md:block rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    checked={selectedIds.has(u.id)}
                                    onChange={(e) => handleSelectUser(u.id, e.target.checked)}
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <div className="shrink-0" onClick={() => handleUserClick(u)}>
                                    {getRoleIcon(u.role)}
                                </div>
                                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleUserClick(u)}>
                                    <div className="font-bold text-sm text-gray-800 truncate">
                                        {u.email}{u.nickname && <span className="text-gray-500 font-normal ml-1">({u.nickname})</span>}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {getRoleBadge(u.role)}
                                        <span className="text-xs text-gray-400">·</span>
                                        <span className="text-xs text-gray-400">{u.gender || 'N/A'}</span>
                                        <span className="text-xs text-gray-300">|</span>
                                        <span className="text-xs text-gray-400">Lv.{u.level || 0}</span>
                                        <span className="text-xs text-gray-300">|</span>
                                        <span className="text-xs text-gray-400">
                                            {u.signupProvider === 'google' && 'G'}
                                            {u.signupProvider === 'kakao' && 'K'}
                                            {u.signupProvider === 'naver' && 'N'}
                                            {!u.signupProvider && 'E'}
                                        </span>
                                        <span className="text-xs text-gray-300">|</span>
                                        <span className="text-xs text-gray-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="text-sm font-bold text-amber-500">{u.credits}</div>
                                    <div className="text-xs text-gray-400">크래딧</div>
                                </div>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                검색 결과가 없습니다.
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 rounded-md bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50"
                            >
                                이전
                            </button>

                            <div className="flex gap-1">
                                {page > 2 && <span className="px-2">...</span>}
                                {page > 1 && (
                                    <button onClick={() => setPage(page - 1)} className="w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-600 text-sm">{page - 1}</button>
                                )}
                                <button className="w-8 h-8 rounded-md bg-blue-600 text-white text-sm font-bold">{page}</button>
                                {page < totalPages && (
                                    <button onClick={() => setPage(page + 1)} className="w-8 h-8 rounded-md bg-white border border-gray-200 text-gray-600 text-sm">{page + 1}</button>
                                )}
                                {page < totalPages - 1 && <span className="px-2">...</span>}
                            </div>

                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 rounded-md bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50"
                            >
                                다음
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals structure remains... (Copied from original but updated to use state) */}

            {showBulkDeleteConfirm && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-center mb-2 text-gray-900">선택 삭제 확인</h3>
                        <p className="text-sm text-gray-600 text-center mb-4">
                            선택한 <span className="font-bold text-red-600">{selectedIds.size}명</span>의 회원을<br />
                            삭제하시겠습니까?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowBulkDeleteConfirm(false)}
                                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={isProcessing}
                                className="py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                전체 삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Keeping other modals (Delete, Ban) simplified for length but assuming valid logic above ... */}
            {/* Note: I cannot see the full original code for Modals so I must rely on the provided replace block functioning as a full replace for the UserListView component. 
               However, I'm replacing lines 10-380. I should verify if Modals were inside or outside?
               In snippet, Modals were inside UserListView (lines 383+).
               So I must include them.
               
               I've included BulkDelete. 
               I need to include DeleteUser and BanUser modals too.
            */}
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-center mb-2 text-gray-900">일반 삭제 확인</h3>
                        <p className="text-sm text-gray-600 text-center mb-4">
                            <span className="font-bold text-orange-600">{selectedUser.email}</span> 회원을<br />
                            일반 삭제하시겠습니까?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setShowDeleteConfirm(false)} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold  hover:bg-gray-200">취소</button>
                            <button onClick={handleDeleteUser} disabled={isProcessing} className="py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 flex items-center justify-center gap-2">{isProcessing && <Loader2 className="w-4 h-4 animate-spin" />} 삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Confirmation Modal */}
            {showBanConfirm && selectedUser && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-center mb-2 text-gray-900">영구 차단 확인</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-gray-700 mb-2">차단 사유</label>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="차단 사유를 입력하세요..."
                                className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setShowBanConfirm(false)} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold  hover:bg-gray-200">취소</button>
                            <button onClick={handleBanUser} disabled={isProcessing} className="py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 flex items-center justify-center gap-2">{isProcessing && <Loader2 className="w-4 h-4 animate-spin" />} 영구 차단</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

// UserStatsView Component
const UserStatsView: React.FC = () => {
    const [viewMode, setViewMode] = useState<'graph' | 'calendar'>('graph');
    const [period, setPeriod] = useState<'week' | 'month' | '6month' | 'year'>('week');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    const [statsData, setStatsData] = useState<DailyStats[]>([]);
    const [calendarData, setCalendarData] = useState<{ [date: string]: number }>({});
    const [providerStats, setProviderStats] = useState<any>(null); // New state for provider stats
    const [loading, setLoading] = useState(false);

    const getDays = (period: string) => {
        switch (period) {
            case 'week': return 7;
            case 'month': return 30;
            case '6month': return 180;
            case 'year': return 365;
            default: return 7;
        }
    };

    useEffect(() => {
        const loadGraphData = async () => {
            if (viewMode === 'graph') {
                setLoading(true);
                try {
                    const [daily, detailed] = await Promise.all([
                        db.getStatsForLastNDays(getDays(period)),
                        db.getDetailedUserStats()
                    ]);
                    setStatsData(daily);
                    setProviderStats(detailed.provider);
                } catch (e) { console.error(e); }
                setLoading(false);
            }
        };
        loadGraphData();
    }, [viewMode, period]);

    useEffect(() => {
        const loadCalendarData = async () => {
            if (viewMode === 'calendar') {
                setLoading(true);
                const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
                const dates: string[] = [];
                for (let day = 1; day <= daysInMonth; day++) {
                    dates.push(`${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
                }

                const promises = dates.map(d => db.getDailyStats(d));
                const results = await Promise.all(promises);

                const newCalendarData: { [date: string]: number } = {};
                results.forEach((stat, idx) => {
                    newCalendarData[dates[idx]] = stat.newUsers;
                });
                setCalendarData(newCalendarData);
                setLoading(false);
            }
        };
        loadCalendarData();
    }, [viewMode, selectedYear, selectedMonth]);

    const chartData = statsData.map(s => s.newUsers);
    const chartLabels = statsData.map(s => s.date);

    return (
        <div className="space-y-4">
            <div className="flex gap-2">
                <button
                    onClick={() => setViewMode('graph')}
                    className={`flex-1 py-2 rounded-xl font-medium transition-all ${viewMode === 'graph' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                >
                    📊 그래프
                </button>
                <button
                    onClick={() => setViewMode('calendar')}
                    className={`flex-1 py-2 rounded-xl font-medium transition-all ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
                >
                    📅 캘린더
                </button>
            </div>

            {loading ? <div className="p-8 text-center text-gray-500">데이터 로딩 중...</div> : (
                viewMode === 'graph' ? (
                    <>
                        <div className="grid grid-cols-4 gap-2">
                            {[
                                { value: 'week', label: '1주일' },
                                { value: 'month', label: '1개월' },
                                { value: '6month', label: '6개월' },
                                { value: 'year', label: '1년' },
                            ].map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => setPeriod(p.value as any)}
                                    className={`py-2 rounded-lg text-sm font-medium transition-all ${period === p.value ? 'bg-blue-100 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold text-gray-900 mb-4">신규 가입 추이</h3>
                                <div className="h-[200px]">
                                    <GrowthChart data={statsData} dataKey="newUsers" color="#3b82f6" label="신규 가입" />
                                </div>
                                <div className="text-center text-xs text-gray-500 mt-2">
                                    총 {chartData.reduce((a, b) => a + b, 0)}명 가입
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border">
                                <h3 className="font-bold text-gray-900 mb-4">가입 경로 (Provider)</h3>
                                {providerStats ? (
                                    <DistributionChart data={[
                                        { name: 'Google', value: providerStats.google || 0, color: '#DB4437' },
                                        { name: 'Naver', value: providerStats.naver || 0, color: '#03C75A' },
                                        { name: 'Kakao', value: providerStats.kakao || 0, color: '#FEE500' },
                                        { name: 'Email', value: providerStats.email || 0, color: '#4285F4' },
                                    ].filter(d => d.value > 0)} />
                                ) : (
                                    <div className="flex items-center justify-center h-64 text-gray-400">데이터 없음</div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex gap-2 bg-white p-3 rounded-xl">
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="flex-1 p-2 border rounded-lg"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                    <option key={y} value={y}>{y}년</option>
                                ))}
                            </select>
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                className="flex-1 p-2 border rounded-lg"
                            >
                                {Array.from({ length: 12 }, (_, i) => i).map(m => (
                                    <option key={m} value={m}>{m + 1}월</option>
                                ))}
                            </select>
                        </div>
                        <div className="bg-white p-4 rounded-xl border">
                            <h3 className="font-bold text-gray-900 mb-4">일별 가입 현황</h3>
                            <CalendarView year={selectedYear} month={selectedMonth} data={calendarData} />
                        </div>
                    </>
                )
            )}
        </div >
    );
};



// BannedUsersView Component
// BannedUsersView Component
interface BannedUsersViewProps {
}

const BannedUsersView: React.FC<BannedUsersViewProps> = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [showUnbanConfirm, setShowUnbanConfirm] = useState(false);
    const [selectedBannedUser, setSelectedBannedUser] = useState<{ id: string; email: string } | null>(null);
    const [bannedUsers, setBannedUsers] = useState<BannedUser[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchBannedUsers = async () => {
        setLoading(true);
        try {
            const data = await db.getBannedUsers();
            setBannedUsers(data);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBannedUsers();
    }, []);

    const filteredBannedUsers = bannedUsers.filter(bu =>
        bu.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleUnban = (bannedUserId: string, email: string) => {
        setSelectedBannedUser({ id: bannedUserId, email });
        setShowUnbanConfirm(true);
    };

    const confirmUnban = async () => {
        if (selectedBannedUser) {
            await db.unbanUser(selectedBannedUser.id);

            await fetchBannedUsers();

            setShowUnbanConfirm(false);
            setSelectedBannedUser(null);
            alert('영구 차단이 해제되었습니다.');
        }
    };

    if (loading && bannedUsers.length === 0) {
        return <div className="p-8 text-center text-gray-500">데이터 로딩 중...</div>;
    }

    return (
        <div className="space-y-4">
            {/* Statistics Card */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 rounded-lg shadow-sm text-white flex items-center justify-between">
                <span className="text-sm font-bold">영구 차단된 회원</span>
                <span className="text-2xl font-black">{bannedUsers.length}명</span>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="이메일로 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                />
            </div>

            {/* Banned Users List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 bg-red-50 border-b border-red-100 font-bold text-sm text-red-700 flex justify-between items-center">
                    <span>영구 차단 회원 목록</span>
                    <span className="text-xs text-red-500">{filteredBannedUsers.length}명</span>
                </div>
                <div className="divide-y divide-gray-100 max-h-[500px] md:max-h-[600px] lg:max-h-[700px] overflow-y-auto">
                    {filteredBannedUsers.map(bu => (
                        <div
                            key={bu.id}
                            className="p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <div className="font-bold text-sm text-gray-900 mb-1">{bu.email}</div>
                                    <div className="text-xs text-gray-600 mb-2">
                                        <span className="font-medium">차단 사유:</span> {bu.reason}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        차단 일시: {new Date(bu.bannedAt).toLocaleString('ko-KR')}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleUnban(bu.id, bu.email)}
                                    className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors shrink-0"
                                >
                                    차단 해제
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredBannedUsers.length === 0 && (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            {searchQuery ? '검색 결과가 없습니다.' : '영구 차단된 회원이 없습니다.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Unban Confirmation Modal */}
            {showUnbanConfirm && selectedBannedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-center mb-2 text-gray-900">차단 해제 확인</h3>
                        <p className="text-sm text-gray-600 text-center mb-4">
                            <span className="font-bold text-green-600">{selectedBannedUser.email}</span> 회원의<br />
                            영구 차단을 해제하시겠습니까?
                        </p>
                        <div className="bg-green-50 rounded-lg p-3 mb-6">
                            <p className="text-xs text-green-800 text-center">
                                ✅ 해제 후 해당 이메일로<br />
                                재가입이 가능합니다.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setShowUnbanConfirm(false);
                                    setSelectedBannedUser(null);
                                }}
                                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmUnban}
                                className="py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                            >
                                해제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---

interface UserManagementProps {
    subSection: string;
    onRefresh?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ subSection, onRefresh }) => {
    // Render appropriate sub-component based on subSection
    if (subSection === '' || subSection === 'user-list') return <UserListView onRefresh={onRefresh} />;
    if (subSection === 'user-stats') return <UserStatsView />;
    if (subSection === 'visitor-stats') return <VisitorStatistics />;
    if (subSection === 'visitor-stats') return <VisitorStatistics />;
    if (subSection === 'banned-users') return <BannedUsersView />;
    if (subSection === 'withdrawn-users') return <WithdrawnUsersPage onBack={() => { }} />;

    return null;
};

export default UserManagement;
