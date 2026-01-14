import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Check, X, Search, Download, Star, Edit2, Trash2, Lock, ArrowRight, ScrollText, Waves, DoorClosed, MessageSquareQuote, MapPin, Globe, Minus, Plus, Crosshair, Loader2 } from 'lucide-react';
import { Toilet, Gender } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { ToiletTypeIcon } from '../../components/Icons';
import { AdminToiletDetail } from '../../components/admin/AdminToiletDetail';
import { VisitorStatistics } from './VisitorStatistics';
import { BulkUploadPage } from './BulkUploadPage';
import { RegionalStats } from './RegionalStats';
import { ToiletStats } from './ToiletStats';

interface ToiletManagementProps {
    subSection: string;
    setRefreshTrigger: (cb: (prev: number) => number) => void;
    initialEditToiletId?: string | null;
    onBackToReports?: () => void;
}

// --- Helper Components ---

// --- Main Components ---

// 2. ToiletListView (Server-Side Pagination & Filtering)
const ToiletListView = ({ onEdit, onDelete }: { onEdit: (t: Toilet) => void, onDelete: (id: string) => Promise<void> }) => {
    const [toilets, setToilets] = useState<Toilet[]>([]);
    const [loading, setLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit] = useState(100);
    const [totalCount, setTotalCount] = useState(0);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState<'all' | 'admin' | 'user'>('all');
    const [filterType, setFilterType] = useState<'all' | 'open' | 'closed'>('all');
    const [filterVisibility, setFilterVisibility] = useState<'all' | 'public' | 'private'>('all');
    const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Parse URL search param on mount
    useEffect(() => {
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(hash.split('?')[1]);
        const search = searchParams.get('search');
        if (search) {
            setSearchTerm(search);
        }
    }, []);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // Calculate date range
            let startDate: string | undefined;
            let endDate: string | undefined;

            const now = new Date();
            if (dateRange === 'today') {
                startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            } else if (dateRange === 'week') {
                const weekAgo = new Date(now.setDate(now.getDate() - 7));
                startDate = weekAgo.toISOString();
            } else if (dateRange === 'month') {
                const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                startDate = monthAgo.toISOString();
            } else if (dateRange === 'custom') {
                if (customStartDate) startDate = new Date(customStartDate).toISOString();
                if (customEndDate) endDate = new Date(customEndDate + 'T23:59:59').toISOString();
            }

            const { data, count } = await db.getAdminToilets(page, limit, {
                search: debouncedSearchTerm,
                userIds: debouncedSearchTerm ? await db.searchUsers(debouncedSearchTerm) : undefined,
                source: filterSource,
                type: filterType,
                visibility: filterVisibility,
                startDate,
                endDate
            });

            setToilets(data);
            setTotalCount(count);
        } catch (e) {
            console.error("Failed to fetch admin toilets", e);
        } finally {
            setLoading(false);
        }
    };

    // Trigger fetch on filters/page change
    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [page, limit, debouncedSearchTerm, filterSource, filterType, filterVisibility, dateRange, customStartDate, customEndDate]);

    // Reset page and selection when filters change
    useEffect(() => {
        setPage(1);
        setSelectedIds(new Set());
    }, [debouncedSearchTerm, filterSource, filterType, filterVisibility, dateRange]);


    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            // Select all currently visible toilets
            const newSelected = new Set(selectedIds);
            toilets.forEach(t => newSelected.add(t.id));
            setSelectedIds(newSelected);
        } else {
            // Deselect all currently visible toilets
            const newSelected = new Set(selectedIds);
            toilets.forEach(t => newSelected.delete(t.id));
            setSelectedIds(newSelected);
        }
    };

    const handleSelectOne = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const handleBulkDeleteConfirm = async () => {
        if (selectedIds.size === 0) return;
        setIsBulkDeleting(true);
        try {
            await db.bulkDeleteToilets(Array.from(selectedIds));
            setSelectedIds(new Set());
            setShowBulkDeleteConfirm(false);
            fetchData();
        } finally {
            setIsBulkDeleting(false);
        }
    };


    const handleDeleteConfirm = async () => {
        if (!deleteId) return;
        setIsDeleting(true);
        try {
            await onDelete(deleteId);
            setDeleteId(null);
            fetchData(); // Refresh list after delete
        } finally {
            setIsDeleting(false);
        }
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="space-y-6">

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="화장실명, 주소, 등록자(ID/이메일) 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                    {/* Standard Filters */}
                    <select
                        value={filterSource}
                        onChange={(e) => setFilterSource(e.target.value as any)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">모든 등록자</option>
                        <option value="admin">관리자 등록</option>
                        <option value="user">사용자 제보</option>
                    </select>
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">모든 유형</option>
                        <option value="open">개방형 (비번X)</option>
                        <option value="closed">폐쇄형 (비번O)</option>
                    </select>
                    {/* NEW: Visibility Filter */}
                    <select
                        value={filterVisibility}
                        onChange={(e) => setFilterVisibility(e.target.value as any)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500"
                    >
                        <option value="all">모든 공개설정</option>
                        <option value="public">공유하기 (공개)</option>
                        <option value="private">나만보기 (비공개)</option>
                    </select>

                    <div className="h-6 w-px bg-gray-200 mx-1"></div>

                    {/* Date Filters */}
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                        {['all', 'today', 'week', 'month'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range as any)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${dateRange === range
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                {{ all: '전체', today: '오늘', week: '이번주', month: '이번달' }[range]}
                            </button>
                        ))}
                        <button
                            onClick={() => setDateRange('custom')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${dateRange === 'custom'
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            직접설정
                        </button>
                    </div>

                    {/* Custom Date Inputs */}
                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                            />
                            <span className="text-gray-400">~</span>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                            />
                        </div>
                    )}
                </div>

                <div className="text-sm text-gray-500 font-medium flex items-center gap-4">
                    <span>총 <span className="text-blue-600 font-bold">{totalCount}</span>개의 화장실이 검색되었습니다.</span>
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                            <span className="text-gray-400">|</span>
                            <span className="font-bold text-gray-700">{selectedIds.size}개 선택됨</span>
                            <button
                                onClick={() => setShowBulkDeleteConfirm(true)}
                                className="px-3 py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" /> 선택 삭제
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 w-[40px]">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            onChange={handleSelectAll}
                                            checked={toilets.length > 0 && toilets.every(t => selectedIds.has(t.id))}
                                        />
                                    </th>
                                    <th className="px-4 py-3 whitespace-nowrap">화장실 정보</th>
                                    <th className="px-4 py-3 whitespace-nowrap">등록자</th>
                                    <th className="px-4 py-3 whitespace-nowrap">주소</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-center">성별</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-center">평점</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-center">상태</th>
                                    <th className="px-4 py-3 whitespace-nowrap text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {toilets.map((toilet) => (
                                    <tr
                                        key={toilet.id}
                                        className={`hover:bg-blue-50 transition-colors group ${selectedIds.has(toilet.id) ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                checked={selectedIds.has(toilet.id)}
                                                onChange={() => handleSelectOne(toilet.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 max-w-[200px]">
                                            <div className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate" title={toilet.name}>
                                                {toilet.name}
                                            </div>
                                            <div className="mt-1">
                                                {toilet.isPrivate && (
                                                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded font-bold flex items-center gap-0.5 w-fit">
                                                        <Lock className="w-3 h-3" /> 나만보기
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {toilet.createdBy === 'admin' || toilet.source === 'admin' || !toilet.createdBy ? (
                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-lg font-bold">관리자</span>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-lg font-bold w-fit mb-1">사용자</span>
                                                    {toilet.creatorEmail ? (
                                                        <span className="text-sm text-gray-700 font-mono font-bold">
                                                            {toilet.creatorEmail.split('@')[0]}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">ID 없음</span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate" title={toilet.address}>
                                            {toilet.address}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center">
                                                <ToiletTypeIcon type={toilet.genderType} className="w-6 h-6" />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1 text-amber-500 font-bold">
                                                <Star className="w-3 h-3 fill-current" />
                                                <span>{(toilet.ratingAvg || 0).toFixed(1)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${!toilet.hasPassword ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {!toilet.hasPassword ? '개방형' : '폐쇄형'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => onEdit(toilet)}
                                                    className="p-2 bg-gray-100 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="수정"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(toilet.id)}
                                                    className="p-2 bg-gray-100 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {toilets.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search className="w-8 h-8 opacity-20" />
                                                <span>검색 결과가 없습니다.</span>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

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
                            {/* Simple Page Numbers (Max 5) */}
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pNum = i + 1;
                                if (totalPages > 5 && page > 3) {
                                    pNum = page - 2 + i;
                                    if (pNum > totalPages) pNum = pNum - (pNum - totalPages);
                                }
                                // Basic logic to show relevant pages around current
                                // For MVP, let's just show Previous / Next and maybe current
                                return null;
                            })}
                            {/* Re-implementing simpler paging for robustness */}
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

            {/* Delete Confirmation Modal (List View) */}
            {
                deleteId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border-t-4 border-red-500">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center mb-3">정말 삭제하시겠습니까?</h3>
                            <p className="text-gray-500 text-sm text-center mb-6">
                                삭제된 화장실은 복구할 수 없습니다.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setDeleteId(null)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleDeleteConfirm}
                                    disabled={isDeleting}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            {/* Bulk Delete Confirmation Modal */}
            {
                showBulkDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border-t-4 border-red-500">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2">선택한 {selectedIds.size}개를 삭제할까요?</h3>
                            <div className="text-center mb-6 space-y-2">
                                <p className="text-gray-500 text-sm">
                                    삭제된 화장실은 복구할 수 없습니다.
                                </p>
                                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700 text-left">
                                    <span className="font-bold block mb-1">📢 알림</span>
                                    리뷰도 함께 삭제되지만, 리뷰 작성자에게 지급된 <span className="font-bold underline">크래딧은 차감되지 않습니다.</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowBulkDeleteConfirm(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleBulkDeleteConfirm}
                                    disabled={isBulkDeleting}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isBulkDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    일괄 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

// 3. ToiletManagement (Container)
interface ToiletManagementProps {
    subSection: string;
    setRefreshTrigger: (cb: (prev: number) => number) => void;
    initialEditToiletId?: string | null;
    onBackToReports?: () => void;
}

// 3. ToiletManagement (Container)
export const ToiletManagement: React.FC<ToiletManagementProps> = ({ subSection, setRefreshTrigger, initialEditToiletId, onBackToReports }) => {
    const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
    const [editingToilet, setEditingToilet] = useState<Toilet | null>(null);

    // Handle initial toilet editing from report navigation
    useEffect(() => {
        const handleDeepLink = async () => {
            if (initialEditToiletId) {
                try {
                    const [fetched] = await db.getToiletsByIds([initialEditToiletId]);
                    if (fetched) {
                        setEditingToilet(fetched);
                        setViewMode('edit');
                    }
                } catch (error) {
                    console.error("Failed to fetch deep-linked toilet:", error);
                }
            }
        };

        handleDeepLink();
    }, [initialEditToiletId]);

    const handleEdit = (toilet: Toilet) => {
        setEditingToilet(toilet);
        setViewMode('edit');
    };

    const handleBack = () => {
        if (onBackToReports) {
            // Custom back to reports
            onBackToReports();
        } else {
            // Explicitly go back to list view
            setViewMode('list');
            setEditingToilet(null);
        }
    };

    const handleSave = async (updatedToilet: Toilet) => {
        await db.updateToilet(updatedToilet);
        alert('수정되었습니다.');
        handleBack();
        // Refresh global state after navigation
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 100);
    };

    const handleDelete = async (id: string) => {
        await db.deleteToilet(id);
        alert('삭제되었습니다.');
        if (viewMode === 'edit') handleBack();
        // Refresh global state after navigation
        setTimeout(() => setRefreshTrigger(prev => prev + 1), 100);
    };


    // Render appropriate sub-component based on subSection
    if (subSection === 'toilet-map') return <RegionalStats />;
    if (subSection === 'toilet-chart') return <ToiletStats />;
    if (subSection === 'toilet-bulk') {
        return (
            <BulkUploadPage
                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
            />
        );
    }

    // Main List/Edit View Logic
    if (subSection === '' || subSection === 'toilet-list') {
        if (viewMode === 'edit' && editingToilet) {
            return (
                <AdminToiletDetail
                    toilet={editingToilet}
                    onBack={handleBack}
                    onSave={handleSave}
                    onDelete={handleDelete}
                />
            );
        }
        return (
            <ToiletListView
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        );
    }

    return null;
};

export default ToiletManagement;
