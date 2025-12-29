import React, { useState, useEffect } from 'react';
import { Trash2, Check, X, User, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Report, Toilet, User as UserType, UserRole } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { maskEmail } from '../../utils';

interface ReportManagementProps {
    setRefreshTrigger: (cb: (prev: number) => number) => void;
    currentUser: UserType;
    onNavigateToToilet?: (toiletId: string, returnTo: 'reports') => void;
}

export const ReportManagement: React.FC<ReportManagementProps> = ({ setRefreshTrigger, currentUser, onNavigateToToilet }) => {
    // Data State
    const [reports, setReports] = useState<Report[]>([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [statusFilter, setStatusFilter] = useState<'all' | 'unprocessed' | 'processed'>('unprocessed');
    const [reasonFilter, setReasonFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Modal State
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showReportDetailModal, setShowReportDetailModal] = useState(false);

    // User Modal State
    const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    // Toilet Detail State
    const [relatedToilet, setRelatedToilet] = useState<Toilet | null>(null);
    const [isLoadingToilet, setIsLoadingToilet] = useState(false);

    // Action State
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showBanConfirm, setShowBanConfirm] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data, count } = await db.getAdminReports(page, limit, {
                search: debouncedSearchQuery,
                status: statusFilter,
                reason: reasonFilter
            });
            setReports(data);
            setTotalCount(count);
        } catch (error) {
            console.error("Failed to fetch reports:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, statusFilter, reasonFilter, debouncedSearchQuery]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, reasonFilter]);


    // Fetch toilet details when selecting a report
    useEffect(() => {
        if (selectedReport) {
            const fetchToilet = async () => {
                setIsLoadingToilet(true);
                try {
                    const toilet = await db.getToilet(selectedReport.toiletId);
                    setRelatedToilet(toilet);
                } catch (error) {
                    console.error("Failed to fetch toilet details:", error);
                    setRelatedToilet(null);
                } finally {
                    setIsLoadingToilet(false);
                }
            };
            fetchToilet();
        } else {
            setRelatedToilet(null);
        }
    }, [selectedReport]);

    const handleApplyReport = async (report: Report) => {
        setIsProcessing(true);
        try {
            const toilet = await db.getToilet(report.toiletId);

            if (!toilet && !report.reason.includes('삭제')) {
                alert('이미 삭제된 화장실입니다.');
                await db.dismissReport(report.id);
                fetchData();
                setRefreshTrigger(prev => prev + 1); // Refresh dashboard stats
                setShowReportDetailModal(false);
                return;
            }

            if (report.reason === '비밀번호가 틀려요' || report.reason === '도어락이 생겼어요') {
                await db.deleteToilet(report.toiletId);
                alert('화장실이 삭제되었습니다.');
            } else if (report.reason === '건물주 요청으로 삭제해주세요') {
                await db.banToilet(report.toiletId, report.reason, currentUser.id);
                alert('화장실이 삭제되고 해당 주소는 차단되었습니다.');
            } else if (report.reason === '휴지가 없어요') {
                if (toilet) {
                    await db.updateToilet({ ...toilet, hasPaper: false });
                    alert('휴지 없음 상태로 변경되었습니다.');
                }
            } else if (report.reason === '비데가 없어요') {
                if (toilet) {
                    await db.updateToilet({ ...toilet, hasBidet: false });
                    alert('비데 없음 상태로 변경되었습니다.');
                }
            } else {
                alert('반영되었습니다.');
            }

            await db.approveReport(report.id, report.reporterId);
            fetchData();
            setRefreshTrigger(prev => prev + 1);
            setShowReportDetailModal(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDismissReport = async (report: Report) => {
        setIsProcessing(true);
        try {
            await db.dismissReport(report.id);
            fetchData();
            setRefreshTrigger(prev => prev + 1);
            setShowReportDetailModal(false);
        } finally {
            setIsProcessing(false);
        }
    };

    const getDisplayName = (report: Report) => {
        if (report.reporterEmail) return maskEmail(report.reporterEmail);
        return '알 수 없음';
    };

    const getResolutionText = (report: Report) => {
        if (report.status === 'dismissed') return '기각됨';
        if (report.status !== 'resolved') return '대기 중';

        switch (report.reason) {
            case '비밀번호가 틀려요':
            case '도어락이 생겼어요':
                return '화장실 삭제됨';
            case '건물주 요청으로 삭제해주세요':
                return '삭제 및 차단됨';
            case '휴지가 없어요':
                return '휴지 없음으로 변경됨';
            case '비데가 없어요':
                return '비데 없음으로 변경됨';
            default:
                return '반영 완료';
        }
    };

    const getCurrentStatusDisplay = (report: Report) => {
        if (!report.toiletDetails) return <span className="text-gray-300">-</span>;

        const details = report.toiletDetails;

        switch (report.reason) {
            case '휴지가 없어요':
                return (
                    <span className={`font-bold ${details.hasPaper ? 'text-green-600' : 'text-red-500'}`}>
                        {details.hasPaper ? 'O (있음)' : 'X (없음)'}
                    </span>
                );
            case '비데가 없어요':
                return (
                    <span className={`font-bold ${details.hasBidet ? 'text-blue-600' : 'text-red-500'}`}>
                        {details.hasBidet ? 'O (있음)' : 'X (없음)'}
                    </span>
                );
            case '도어락이 생겼어요':
            case '비밀번호가 틀려요':
                return (
                    <div>
                        {details.hasPassword ? (
                            <span className="text-red-500 font-bold">O ({details.password || '****'})</span>
                        ) : (
                            <span className="text-green-600 font-bold">X (없음)</span>
                        )}
                    </div>
                );
            default:
                return <span className="text-gray-300">-</span>;
        }
    };

    const handleViewToilet = (toiletId: string) => {
        if (onNavigateToToilet) {
            setShowReportDetailModal(false);
            onNavigateToToilet(toiletId, 'reports');
        }
    };

    const handleReporterClick = async (reporterId: string) => {
        setIsLoadingUser(true);
        try {
            const user = await db.getUserById(reporterId);
            if (user) {
                setSelectedUser(user);
                setShowUserModal(true);
            } else {
                alert("사용자 정보를 찾을 수 없습니다.");
            }
        } catch (e) {
            console.error(e);
            alert("사용자 정보를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setIsLoadingUser(false);
        }
    };

    // User management handlers (Role, Credit, Ban) remain same but need to handle refresh
    const handleRoleChange = async (newRole: UserRole) => {
        if (!selectedUser) return;
        const updatedUser = { ...selectedUser, role: newRole };
        await db.saveUser(updatedUser);
        setSelectedUser(updatedUser);
        // No need to refresh report list for user role change
    };

    const handleCreditChange = async (amount: number) => {
        if (!selectedUser) return;
        const newCredits = Math.max(0, selectedUser.credits + amount);
        const updatedUser = { ...selectedUser, credits: newCredits };
        await db.saveUser(updatedUser);
        setSelectedUser(updatedUser);
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <>
            {/* Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                {/* Status Filter */}
                <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex">
                    {[
                        { id: 'unprocessed', label: '미처리', color: 'red' },
                        { id: 'processed', label: '처리완료', color: 'blue' },
                        { id: 'all', label: '전체', color: 'gray' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setStatusFilter(opt.id as any)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${statusFilter === opt.id
                                ? `bg-${opt.color}-100 text-${opt.color}-600`
                                : 'text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Reason Filter */}
                <div className="bg-white px-3 rounded-xl border border-gray-100 shadow-sm flex items-center">
                    <span className="text-xs font-bold text-gray-400 mr-2 whitespace-nowrap">사유</span>
                    <select
                        value={reasonFilter}
                        onChange={(e) => setReasonFilter(e.target.value)}
                        className="w-full py-2 bg-transparent text-sm font-bold text-gray-700 outline-none"
                    >
                        <option value="all">전체 사유</option>
                        <option value="비밀번호가 틀려요">비밀번호 오류</option>
                        <option value="건물주 요청으로 삭제해주세요">건물주 요청</option>
                        <option value="도어락이 생겼어요">도어락 설치</option>
                        <option value="휴지가 없어요">휴지 없음</option>
                        <option value="비데가 없어요">비데 없음</option>
                        <option value="기타">기타 (직접 입력)</option>
                    </select>
                </div>

                {/* Search Bar */}
                <div className="bg-white px-3 rounded-xl border border-gray-100 shadow-sm flex items-center">
                    <div className="mr-2">
                        <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="w-full py-2 bg-transparent text-sm placeholder-gray-400 outline-none"
                        placeholder="이메일, 신고사유, 화장실명..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-between px-1 mb-2 items-center">
                <span className="text-sm text-gray-400">
                    {isLoading ? '로딩 중...' : `${totalCount}건 조회됨`}
                </span>
                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || isLoading}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-bold text-gray-600">
                        {page} / {totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || totalPages === 0 || isLoading}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full py-20">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">화장실</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">신고 사유</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">현상태</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">신고자</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">날짜</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap w-[200px]">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reports.map(r => (
                                    <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleViewToilet(r.toiletId)}
                                                className="font-bold text-gray-800 hover:text-blue-600 transition-colors text-left"
                                            >
                                                {r.toiletName}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-gray-800 font-medium">{r.reason}</span>
                                                {r.status === 'resolved' && <span className="text-[10px] text-blue-600 font-bold bg-blue-50 w-fit px-1.5 rounded mt-0.5">승인됨</span>}
                                                {r.status === 'dismissed' && <span className="text-[10px] text-gray-500 font-bold bg-gray-100 w-fit px-1.5 rounded mt-0.5">기각됨</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm">
                                            {getCurrentStatusDisplay(r)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => handleReporterClick(r.reporterId)}
                                                className="text-gray-600 hover:text-blue-600 hover:underline transition-colors flex items-center gap-1"
                                                disabled={isLoadingUser}
                                            >
                                                <User className="w-3.5 h-3.5" />
                                                {getDisplayName(r)}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs text-gray-400">
                                            {new Date(r.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-center gap-2">
                                                {r.status === 'pending' ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleDismissReport(r)}
                                                            disabled={isProcessing}
                                                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1 text-xs font-bold"
                                                            title="기각"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                            기각
                                                        </button>
                                                        <button
                                                            onClick={() => handleApplyReport(r)}
                                                            disabled={isProcessing}
                                                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 text-xs font-bold shadow-sm"
                                                            title="반영"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            반영
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${r.status === 'resolved' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        {getResolutionText(r)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                                            신고 내역이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile Card Grid */}
            <div className="md:hidden grid grid-cols-1 gap-3">
                {isLoading ? (
                    <div className="text-center py-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                    </div>
                ) : reports.length > 0 ? (
                    reports.map(r => (
                        <button
                            key={r.id}
                            onClick={() => {
                                setSelectedReport(r);
                                setShowReportDetailModal(true);
                            }}
                            className="w-full text-left bg-white p-4 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-gray-800">{r.toiletName}</div>
                                <span className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="text-sm text-red-500 font-medium">{r.reason}</div>
                            <div className="text-xs text-gray-400 mt-2">신고자: {getDisplayName(r)}</div>
                        </button>
                    ))
                ) : (
                    <div className="col-span-full text-center text-gray-400 py-10">신고 내역이 없습니다.</div>
                )}
            </div>
            {/* Pagination for Mobile (Simple Load More not implemented, keeping same pagination) */}
            <div className="md:hidden flex justify-center py-4 gap-4">
                <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                    className="p-2 bg-white rounded-full shadow disabled:opacity-50"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <span className="font-bold flex items-center">{page}</span>
                <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0 || isLoading}
                    className="p-2 bg-white rounded-full shadow disabled:opacity-50"
                >
                    <ChevronRight className="w-6 h-6" />
                </button>
            </div>

            {/* KEEP EXISTING MODALS AS IS - They rely on selectedReport/selectedUser which are still valid */}
            {/* Report Detail Modal */}
            {showReportDetailModal && selectedReport && (
                <div className="md:hidden fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    {/* ... (Modal content same as before, no logic changes needed here, just make sure to use handlers) ... */}
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in">
                        <h3 className="text-lg font-bold mb-4 border-b pb-2">신고 상세 내용</h3>

                        <div className="space-y-4 mb-6">
                            <div>
                                <div className="text-xs text-gray-500 mb-1">화장실</div>
                                <div className="font-bold text-gray-900">{selectedReport.toiletName}</div>
                                {isLoadingToilet ? (
                                    <div className="mt-2 text-xs text-gray-400">정보 불러오는 중...</div>
                                ) : relatedToilet ? (
                                    <div className="mt-2 text-xs bg-gray-50 p-2 rounded border border-gray-100 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className={relatedToilet.hasPaper ? "text-green-600 font-bold" : "text-gray-400"}>
                                                {relatedToilet.hasPaper ? "🧻 화장지 있음" : "🧻 화장지 없음"}
                                            </span>
                                            <span className="text-gray-300">|</span>
                                            <span className={relatedToilet.hasBidet ? "text-blue-600 font-bold" : "text-gray-400"}>
                                                {relatedToilet.hasBidet ? "🚽 비데 있음" : "🚽 비데 없음"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {relatedToilet.hasPassword ? (
                                                <span className="text-red-500 font-bold flex items-center gap-1">
                                                    🔒 {relatedToilet.password || "비밀번호 없음"}
                                                </span>
                                            ) : (
                                                <span className="text-green-600 font-bold">🔓 개방형</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-red-400">삭제된 화장실이거나 정보를 불러올 수 없습니다.</div>
                                )}
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">신고 사유</div>
                                <div className="font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                    {selectedReport.reason}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 mb-1">신고자</div>
                                <button
                                    onClick={() => {
                                        handleReporterClick(selectedReport.reporterId);
                                        setShowReportDetailModal(false);
                                    }}
                                    className="text-sm text-gray-700 hover:text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <User className="w-3.5 h-3.5" />
                                    {getDisplayName(selectedReport)}
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2 mb-2">
                            <button
                                onClick={() => handleViewToilet(selectedReport.toiletId)}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                            >
                                화장실 정보 보기
                            </button>
                        </div>

                        {selectedReport.status === 'pending' && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDismissReport(selectedReport)}
                                    disabled={isProcessing}
                                    className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    기각 (변려)
                                </button>
                                <button
                                    onClick={() => handleApplyReport(selectedReport)}
                                    disabled={isProcessing}
                                    className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                                >
                                    반영하기
                                </button>
                            </div>
                        )}
                        <button
                            onClick={() => setShowReportDetailModal(false)}
                            className="w-full mt-2 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}

            {/* User, Ban, Delete Modals (Keeping exactly as they were, just assume they are here) */}
            {showUserModal && selectedUser && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white z-10 p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold">회원 상세 정보</h2>
                            <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* User Info */}
                            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                        {selectedUser.email[0].toUpperCase()}
                                    </div>
                                    <div className="font-bold text-lg mb-1">{selectedUser.email}</div>
                                    <div className="text-sm text-gray-500">ID: {selectedUser.id}</div>
                                </div>
                            </div>

                            {/* Role Management */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold mb-3">회원 등급</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[UserRole.USER, UserRole.VIP, UserRole.ADMIN].map(role => (
                                        <button
                                            key={role}
                                            onClick={() => handleRoleChange(role)}
                                            className={`py-3 rounded-xl font-bold text-sm ${selectedUser.role === role
                                                ? role === UserRole.ADMIN ? 'bg-red-600 text-white' : role === UserRole.VIP ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'
                                                : 'bg-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {role === UserRole.ADMIN ? 'ADMIN' : role === UserRole.VIP ? 'VIP' : 'USER'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Credit Management */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold mb-3">크래딧 관리</label>
                                <div className="bg-amber-50 rounded-xl p-4 mb-3 text-center">
                                    <div className="text-xs text-gray-500 mb-1">현재 크래딧</div>
                                    <div className="text-3xl font-black text-amber-600">{selectedUser.credits}</div>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[-10, -5, +5, +10].map(amount => (
                                        <button
                                            key={amount}
                                            onClick={() => handleCreditChange(amount)}
                                            className={`py-2 rounded-lg font-bold text-sm ${amount < 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                                }`}
                                        >
                                            {amount > 0 ? '+' : ''}{amount}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    <button onClick={() => handleCreditChange(+50)} className="py-2 rounded-lg font-bold text-sm bg-blue-100 text-blue-600">+50</button>
                                    <button onClick={() => handleCreditChange(+100)} className="py-2 rounded-lg font-bold text-sm bg-purple-100 text-purple-600">+100</button>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="border-t pt-4">
                                <label className="block text-sm font-bold text-red-600 mb-3">⚠️ 위험 구역</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button onClick={() => setShowDeleteConfirm(true)} className="py-2.5 rounded-lg font-bold text-sm bg-orange-100 text-orange-600">일반 삭제</button>
                                    <button onClick={() => setShowBanConfirm(true)} className="py-2.5 rounded-lg font-bold text-sm bg-red-100 text-red-600">영구 차단</button>
                                </div>
                                <p className="text-xs text-gray-500 text-center">일반 삭제: 재가입 가능 | 영구 차단: 재가입 불가</p>
                            </div>

                            <button onClick={() => setShowUserModal(false)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold mt-4">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && selectedUser && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-center mb-2">일반 삭제 확인</h3>
                        <p className="text-sm text-gray-600 text-center mb-4">
                            <span className="font-bold text-orange-600">{selectedUser.email}</span> 회원을<br />일반 삭제하시겠습니까?
                        </p>
                        <div className="bg-yellow-50 rounded-lg p-3 mb-6">
                            <p className="text-xs text-yellow-800 text-center">⚠️ 회원 데이터가 삭제되지만<br />해당 이메일로 재가입이 가능합니다.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setShowDeleteConfirm(false)} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">취소</button>
                            <button
                                onClick={async () => {
                                    await db.deleteUser(selectedUser.id);
                                    setRefreshTrigger(prev => prev + 1);
                                    setShowDeleteConfirm(false);
                                    setShowUserModal(false);
                                    alert('회원이 삭제되었습니다.');
                                }}
                                className="py-3 bg-orange-600 text-white rounded-xl font-bold"
                            >삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Confirm Modal */}
            {showBanConfirm && selectedUser && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-center mb-2">영구 차단 확인</h3>
                        <p className="text-sm text-gray-600 text-center mb-4">
                            <span className="font-bold text-red-600">{selectedUser.email}</span> 회원을<br />영구 차단하시겠습니까?
                        </p>
                        <div className="bg-red-50 rounded-lg p-3 mb-4">
                            <p className="text-xs text-red-800 text-center">🚫 회원 데이터가 삭제되며<br />해당 이메일로 재가입이 <strong>영구 불가</strong>합니다.</p>
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">차단 사유</label>
                            <textarea
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                placeholder="차단 사유를 입력하세요..."
                                className="w-full p-3 border rounded-lg resize-none"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    setShowBanConfirm(false);
                                    setBanReason('');
                                }}
                                className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
                            >취소</button>
                            <button
                                onClick={async () => {
                                    if (!banReason.trim()) {
                                        alert('차단 사유를 입력해주세요.');
                                        return;
                                    }
                                    await db.banUserPermanently(selectedUser.id, banReason, 'admin');
                                    setRefreshTrigger(prev => prev + 1);
                                    setShowBanConfirm(false);
                                    setShowUserModal(false);
                                    setBanReason('');
                                    alert('회원이 영구 차단되었습니다.');
                                }}
                                className="py-3 bg-red-600 text-white rounded-xl font-bold"
                            >영구 차단</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
