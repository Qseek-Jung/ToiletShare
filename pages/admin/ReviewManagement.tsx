import React, { useState, useEffect } from 'react';
import { Search, Trash2, Star, MapPin, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Review } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';

interface ReviewManagementProps {
    onRefresh: () => void;
    onNavigateToToilet?: (toiletId: string, returnTo: 'reviews') => void;
}

export const ReviewManagement: React.FC<ReviewManagementProps> = ({ onRefresh, onNavigateToToilet }) => {
    // Data State
    const [reviews, setReviews] = useState<Review[]>([]);
    const [page, setPage] = useState(1);
    const [limit] = useState(20);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
    const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'custom'>('week');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [ratingFilters, setRatingFilters] = useState<number[]>([]);
    const [typeFilters, setTypeFilters] = useState<('MALE' | 'FEMALE' | 'UNISEX')[]>([]);

    // Modal State
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Debounce Search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
            setPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Parse URL search param on mount
    useEffect(() => {
        const hash = window.location.hash;
        const searchParams = new URLSearchParams(hash.split('?')[1]);
        const search = searchParams.get('search');
        if (search) {
            setSearchQuery(search);
        }
    }, []);

    // Fetch Data
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const { data, count } = await db.getAdminReviews(page, limit, {
                search: debouncedSearchQuery,
                period: periodFilter,
                startDate: customStartDate,
                endDate: customEndDate,
                ratings: ratingFilters,
                types: typeFilters.length > 0 ? typeFilters : undefined
            });
            setReviews(data);
            setTotalCount(count);
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [page, periodFilter, customStartDate, customEndDate, ratingFilters, typeFilters, debouncedSearchQuery]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [periodFilter, customStartDate, customEndDate, ratingFilters, typeFilters]);

    // Toggle rating filter
    const toggleRating = (rating: number) => {
        if (ratingFilters.includes(rating)) {
            setRatingFilters(ratingFilters.filter(r => r !== rating));
        } else {
            setRatingFilters([...ratingFilters, rating]);
        }
    };

    // Toggle type filter
    const toggleType = (type: 'MALE' | 'FEMALE' | 'UNISEX') => {
        if (typeFilters.includes(type)) {
            setTypeFilters(typeFilters.filter(t => t !== type));
        } else {
            setTypeFilters([...typeFilters, type]);
        }
    };

    const handleDelete = async () => {
        if (!selectedReview) return;
        setIsDeleting(true);
        try {
            await db.adminDeleteReview(selectedReview.id);
            onRefresh(); // Trigger parent refresh (dashboard stats)
            fetchData(); // Refresh list
            setShowDeleteConfirm(false);
            setShowDetailModal(false);
        } finally {
            setIsDeleting(false);
        }
    };

    const getGenderLabel = (type?: string) => {
        if (type === 'MALE') return '남성용';
        if (type === 'FEMALE') return '여성용';
        if (type === 'UNISEX') return '남녀공용';
        return type || '알수없음';
    };

    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="space-y-4">
            {/* Header with Back Button */}
            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                <div className="flex items-center gap-2 border rounded-lg px-3 py-2">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="내용 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold mb-2">📅 기간</label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { value: 'today', label: '오늘' },
                            { value: 'week', label: '최근 1주일' },
                            { value: 'month', label: '최근 1달' },
                            { value: 'custom', label: '사용자 설정' },
                        ].map(period => (
                            <button
                                key={period.value}
                                onClick={() => setPeriodFilter(period.value as any)}
                                className={`py-2 rounded-lg text-xs font-bold ${periodFilter === period.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                                    } `}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                    {periodFilter === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                            <input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold mb-2">⭐ 평점 (다중선택)</label>
                        <div className="grid grid-cols-3 gap-1">
                            <button onClick={() => setRatingFilters([])} className={`py-1.5 rounded text-xs font-bold ${ratingFilters.length === 0 ? 'bg-yellow-500 text-white' : 'bg-gray-100'} `}>
                                전체
                            </button>
                            {[5, 4, 3, 2, 1].map(rating => (
                                <button key={rating} onClick={() => toggleRating(rating)} className={`py-1.5 rounded text-xs font-bold ${ratingFilters.includes(rating) ? 'bg-yellow-500 text-white' : 'bg-gray-100'} `}>
                                    {rating}★
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold mb-2">🚻 타입 (다중선택)</label>
                        <div className="grid grid-cols-2 gap-1">
                            <button onClick={() => setTypeFilters([])} className={`py-1.5 rounded text-xs font-bold ${typeFilters.length === 0 ? 'bg-purple-600 text-white' : 'bg-gray-100'} `}>
                                전체
                            </button>
                            {[{ value: 'MALE' as const, label: '남성' }, { value: 'FEMALE' as const, label: '여성' }, { value: 'UNISEX' as const, label: '공용' }].map(type => (
                                <button key={type.value} onClick={() => toggleType(type.value)} className={`py-1.5 rounded text-xs font-bold ${typeFilters.includes(type.value) ? 'bg-purple-600 text-white' : 'bg-gray-100'} `}>
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between px-1 items-center">
                <span className="text-sm font-bold text-gray-500">
                    {isLoading ? '로딩 중...' : <>총 <span className="text-blue-600">{totalCount}</span>건</>}
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

            {/* Desktop: Table View */}
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
                                    <th className="px-4 py-3 text-left whitespace-nowrap w-[40%]">리뷰 내용</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">화장실</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">평점</th>
                                    <th className="px-4 py-3 text-left whitespace-nowrap">작성자</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">날짜</th>
                                    <th className="px-4 py-3 text-center whitespace-nowrap">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {reviews.map(review => {
                                    const toiletName = review.toiletName || '삭제된 화장실';
                                    const userEmail = review.userEmail || review.userId;
                                    return (
                                        <tr key={review.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div
                                                    className="line-clamp-2 cursor-pointer hover:text-blue-600"
                                                    onClick={() => { setSelectedReview(review); setShowDetailModal(true); }}
                                                >
                                                    {review.content}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-bold text-gray-700">
                                                <button
                                                    onClick={() => {
                                                        if (onNavigateToToilet) {
                                                            onNavigateToToilet(review.toiletId, 'reviews');
                                                        } else {
                                                            window.location.hash = `#/detail/${review.toiletId}`;
                                                        }
                                                    }}
                                                    className="font-bold text-gray-700 hover:text-blue-600 transition-colors text-left"
                                                >
                                                    {toiletName}
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center text-yellow-500 font-bold gap-0.5">
                                                    <Star className="w-3.5 h-3.5 fill-current" />
                                                    <span>{review.rating}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {userEmail}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-400">
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => { setSelectedReview(review); setShowDeleteConfirm(true); }}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {reviews.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                                            리뷰가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Mobile: Card Grid */}
            <div className="md:hidden grid grid-cols-1 gap-3">
                {isLoading ? (
                    <div className="text-center py-10">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                    </div>
                ) : reviews.length > 0 ? (
                    reviews.map(review => {
                        const toiletName = review.toiletName || '삭제된 화장실';
                        const userEmail = review.userEmail || review.userId;
                        return (
                            <div
                                key={review.id}
                                onClick={() => { setSelectedReview(review); setShowDetailModal(true); }}
                                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${review.rating >= 4 ? 'bg-green-100 text-green-700' : review.rating >= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'} `}>
                                        {review.rating}.0
                                    </span>
                                    <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 mb-1">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onNavigateToToilet) {
                                                onNavigateToToilet(review.toiletId, 'reviews');
                                            } else {
                                                window.location.hash = `#/detail/${review.toiletId}`;
                                            }
                                        }}
                                        className="font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
                                    >
                                        {toiletName}
                                    </button>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{review.content}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                                    <span>{userEmail}</span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-400 py-10">
                        리뷰가 없습니다.
                    </div>
                )}
            </div>
            {/* Pagination for Mobile */}
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

            {showDetailModal && selectedReview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">리뷰 상세</h3>
                            <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <label className="block text-xs font-bold text-gray-600 mb-1">작성자</label>
                            <p className="text-sm font-bold">{selectedReview.userEmail || selectedReview.userId}</p>
                        </div>

                        {/* Toilet Info Section */}
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <label className="block text-xs font-bold text-blue-600 mb-1">화장실 정보</label>
                                    <p className="text-sm font-bold flex items-center gap-2">
                                        {selectedReview.toiletName || '삭제된 화장실'}
                                        {selectedReview.toiletGender && (
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${selectedReview.toiletGender === 'MALE' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                selectedReview.toiletGender === 'FEMALE' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                                                    'bg-purple-100 text-purple-700 border-purple-200'
                                                }`}>
                                                {getGenderLabel(selectedReview.toiletGender)}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {selectedReview.toiletAddress && (
                                <p className="text-xs text-gray-600 flex items-start gap-1">
                                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                                    {selectedReview.toiletAddress}
                                </p>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={() => {
                                        if (onNavigateToToilet) {
                                            onNavigateToToilet(selectedReview.toiletId, 'reviews');
                                            setShowDetailModal(false);
                                        } else {
                                            window.location.hash = `#/detail/${selectedReview.toiletId}`;
                                            setShowDetailModal(false);
                                        }
                                    }}
                                    className="w-full py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-600 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" /> 관리자 화장실 상세 이동
                                </button>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-600 mb-2">평점</label>
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (<Star key={i} className={`w-6 h-6 ${i < selectedReview.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} `} />))}
                                <span className="ml-2 text-lg font-bold">{selectedReview.rating}.0</span>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-600 mb-2">리뷰 내용</label>
                            <p className="text-sm bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">{selectedReview.content}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => { setShowDeleteConfirm(true); setShowDetailModal(false); }}
                                disabled={isDeleting}
                                className="py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> 삭제
                            </button>
                            <button onClick={() => setShowDetailModal(false)} className="py-3 bg-gray-100 rounded-xl font-bold">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteConfirm && selectedReview && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-in fade-in zoom-in">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2">리뷰 삭제 확인</h3>
                        <p className="text-sm text-gray-600 text-center mb-4">이 리뷰를 정말 삭제하시겠습니까?</p>

                        {selectedReview.rewarded ? (
                            <div className="bg-red-50 rounded-lg p-3 mb-6 border border-red-100">
                                <p className="text-xs text-red-700 text-center font-bold break-keep">
                                    ⚠️ 광고 시청으로 보상이 지급된 리뷰입니다.<br />
                                    삭제 시 작성자에게서 지급된 크래딧이 회수됩니다.
                                </p>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-lg p-3 mb-6">
                                <p className="text-xs text-gray-500 text-center">
                                    이 리뷰는 보상이 지급되지 않았으므로,<br />크래딧이 차감되지 않습니다.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setShowDeleteConfirm(false)} className="py-3 bg-gray-100 rounded-xl font-bold">취소</button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="py-3 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                            >
                                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                삭제
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
