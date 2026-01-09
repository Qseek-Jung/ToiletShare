import React, { useState, useEffect } from 'react';
import { UserIcon, Shield, PlayCircle, Star, HelpCircle, X, Send, CheckCircle, AlertCircle, Sun, Moon, ArrowRight, Share2, Mail, Lock, BookOpen, Eye, Bell, Menu, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User, Toilet, UserRole, Gender, Review } from '../types';
import { SUPERVISOR_EMAIL, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../config';
import emailjs from '@emailjs/browser';
import { INITIAL_USER } from '../constants';
import { dbSupabase as db } from '../services/db_supabase';
import { Capacitor } from '@capacitor/core';
import { PageLayout } from '../components/PageLayout';
import { LevelIcon } from '../components/LevelIcon';
import { getDisplayName } from '../utils'; // Import helper
import { WithdrawalModal } from '../components/WithdrawalModal';
// import { GoogleAd } from '../components/GoogleAd';
// import AdErrorBoundary from '../components/AdErrorBoundary';
import { HamburgerMenu } from '../components/HamburgerMenu';
import { shareService } from '../services/shareService';
import { ContactModal } from '../components/ContactModal';
import { AppNotice } from '../types';
import { NoticeDetailModal } from '../components/NoticeDetailModal';
import { formatDistanceToNow } from '../utils';

interface MyPageProps {
    user: User;
    toilets: Toilet[];
    bookmarks: Set<string>;
    onToiletClick: (t: Toilet) => void;
    onLogout: () => void;
    onLoginRequest: () => void;
    onAdRequest: () => void;
    onUserUpdate: (user: User) => void;
    darkMode: boolean;
    onToggleDarkMode: () => void;
    onContactModalChange: (isOpen: boolean) => void;
    onNoticeModalChange: (isOpen: boolean) => void;
}

const MyPage: React.FC<MyPageProps> = ({
    user,
    bookmarks,
    toilets,
    onToiletClick,
    onLogout,
    onLoginRequest,
    onAdRequest,
    onUserUpdate,
    darkMode,
    onToggleDarkMode,
    onContactModalChange,
    onNoticeModalChange
}) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'my' | 'favorites' | 'reviews'>('my');
    const [myReviews, setMyReviews] = useState<Review[]>([]);

    const [myToilets, setMyToilets] = useState<Toilet[]>([]); // New state for fetching directly from DB
    const [favoriteToilets, setFavoriteToilets] = useState<Toilet[]>([]); // New: Fetch favorites independently
    const [appNotices, setAppNotices] = useState<AppNotice[]>([]);
    const [selectedNotice, setSelectedNotice] = useState<AppNotice | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Nickname Edit State
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [newNickname, setNewNickname] = useState(user.nickname || user.email.split('@')[0]);
    const [showNicknameSuccessModal, setShowNicknameSuccessModal] = useState(false);
    const [currentNoticeIndex, setCurrentNoticeIndex] = useState(0);



    // const myToiletsList = toilets.filter(t => t.createdBy === user.id); // Removed: Client-side filter is unreliable
    // const favoriteToiletsList = toilets.filter(t => bookmarks.has(t.id)); // REMOVED: Radius dependent


    // Contact Modal State
    const [showContactModal, setShowContactModal] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Hamburger Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);

    // Reset page when tab changes
    useEffect(() => {
        setPage(1);
    }, [activeTab]);

    const getCurrentList = () => {
        switch (activeTab) {

            case 'my': return myToilets; // Use state instead of prop filter
            case 'favorites': return favoriteToilets; // Use fetched favorites
            case 'reviews': return myReviews;
            default: return [];
        }
    };

    const currentList = getCurrentList();
    const totalPages = Math.ceil(currentList.length / ITEMS_PER_PAGE);
    const paginatedItems = currentList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Helper functions for Modal open/close to sync with App state
    const handleOpenContactModal = () => {
        setShowContactModal(true);
        onContactModalChange?.(true);
    };

    const handleCloseContactModal = () => {
        setShowContactModal(false);
        onContactModalChange?.(false);
    };

    const handleNotificationClick = () => {
        window.location.hash = '#/notifications';
    };

    // GUEST 체크 - 비회원은 내정보 페이지 접근 불가
    useEffect(() => {
        if (user.role === UserRole.GUEST) {
            onLoginRequest();
        }
    }, [user.role, onLoginRequest]);

    useEffect(() => {
        const loadReviews = async () => {
            if (user.id) {
                // Parallel fetch
                const items = await db.getUserReviews(user.id);
                setMyReviews(items);

                const unreadCount = await db.getUnreadNotificationCountToday(user.id);
                setUnreadNotifCount(unreadCount);

                const userToilets = await db.getUserToilets(user.id);
                setMyToilets(userToilets);
                setNewNickname(user.nickname || user.email.split('@')[0]);

                // Fetch Favorites (using bookmarks prop)
                if (bookmarks.size > 0) {
                    const favs = await db.getToiletsByIds(Array.from(bookmarks));
                    setFavoriteToilets(favs);
                } else {
                    setFavoriteToilets([]);
                }

                // Fetch App Notices
                const { notices, hiddenIds } = await db.getAppNotices(user.id);
                setAppNotices(notices.filter(n => !hiddenIds.has(n.id)));
            }
        };
        loadReviews();
    }, [user.id, activeTab, refreshTrigger, bookmarks]); // Added bookmarks dependency

    useEffect(() => {
        if (appNotices.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentNoticeIndex(prev => (prev + 1) % appNotices.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [appNotices.length]);

    useEffect(() => {
        onNoticeModalChange(!!selectedNotice);
    }, [selectedNotice, onNoticeModalChange]);

    useEffect(() => {
        const handler = () => setSelectedNotice(null);
        window.addEventListener('closeNoticeDetail', handler);
        return () => window.removeEventListener('closeNoticeDetail', handler);
    }, []);

    const handleNicknameUpdate = async () => {
        if (!newNickname.trim()) {
            alert(t('nickname_input_alert', "닉네임을 입력해주세요."));
            return;
        }
        if (newNickname.length > 8) {
            alert(t('nickname_length_alert', "닉네임은 최대 8자까지만 가능합니다."));
            return;
        }

        try {
            const updatedUser = { ...user, nickname: newNickname };
            await db.saveUser(updatedUser); // Update DB

            // Supabase uses session, so local storage currentUser might not be main source of truth,
            // but we keep it for now if App relies on it.
            // App.tsx usually syncs with DB on load.
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));

            // Update App state directly instead of reloading
            onUserUpdate(updatedUser);
            setIsEditingNickname(false);
            setShowNicknameSuccessModal(true); // Show custom modal instead of alert
        } catch (e) {
            console.error("Failed to update nickname", e);
            alert(t('nickname_update_fail', "닉네임 변경 실패"));
        }
    };

    return (
        <PageLayout className="p-0 pb-48 relative">
            {/* ... existing header and body ... */}

            {/* Nickname Success Modal */}
            {
                showNicknameSuccessModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
                            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Star className="w-8 h-8 text-blue-600 dark:text-blue-400 fill-current" />
                            </div>
                            <h3 className="font-bold text-lg mb-2 dark:text-white">{t('change_complete', '변경 완료!')}</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm" dangerouslySetInnerHTML={{ __html: t('nickname_success_message', '와, 정말 멋진 닉네임이네요! 😎<br />새로운 이름으로 활동을 시작해보세요.') }} />
                            <button
                                onClick={() => setShowNicknameSuccessModal(false)}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-amber-600 transition"
                            >
                                {t('confirm', '확인')}
                            </button>
                        </div>
                    </div>
                )
            }
            {/* Header - Redesigned */}
            <div className="bg-surface dark:bg-surface-dark px-4 py-3 flex items-center justify-between sticky top-0 z-20 border-b border-border dark:border-border-dark shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.location.hash = '#/'} className="p-2 -ml-2 text-text-main dark:text-text-light hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                        <ArrowRight className="w-6 h-6 rotate-180" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight flex items-center gap-2 text-text-main dark:text-text-light">{t('my_page_title', 'My Page')}</h1>
                    </div>
                </div>
                <div className="flex gap-1">
                    {/* Notification Icon */}
                    <button
                        onClick={handleNotificationClick}
                        className="p-2 text-text-muted hover:bg-background dark:hover:bg-background-dark rounded-full transition-colors relative"
                    >
                        <Bell className="w-6 h-6" />
                        {unreadNotifCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 animate-in zoom-in duration-300">
                                {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                            </span>
                        )}
                    </button>

                    {/* Hamburger Menu Icon */}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-2 text-text-muted hover:bg-background dark:hover:bg-background-dark rounded-full transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                </div >
            </div >

            {/* Rolling Notice Bar */}
            {appNotices.length > 0 && (
                <div className="bg-white dark:bg-gray-800 border-b border-border/50 dark:border-border-dark/50 h-10 flex items-center px-4 relative z-10 transition-colors">
                    <div className="flex items-center gap-1.5 text-primary-500 font-bold text-[11px] shrink-0 mr-3 px-2 py-0.5 bg-primary/5 dark:bg-primary/10 rounded-full border border-primary/10">
                        <Bell className="w-3.5 h-3.5 animate-bounce" style={{ animationDuration: '3s' }} />
                        <span>NOTICE</span>
                    </div>
                    <div className="flex-1 h-full relative overflow-hidden">
                        {appNotices.map((notice, idx) => (
                            <div
                                key={notice.id}
                                onClick={() => setSelectedNotice(notice)}
                                className={`absolute inset-0 flex items-center transition-all duration-700 ease-in-out cursor-pointer
                                    ${idx === currentNoticeIndex
                                        ? 'translate-y-0 opacity-100'
                                        : idx < currentNoticeIndex
                                            ? '-translate-y-full opacity-0'
                                            : 'translate-y-full opacity-0'}`}
                            >
                                <span className="text-xs text-text-main dark:text-text-light truncate font-semibold">
                                    {notice.title}
                                </span>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setSelectedNotice(appNotices[currentNoticeIndex])}
                        className="p-2 text-text-muted hover:text-text-main transition-colors"
                    >
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <HamburgerMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                user={user}
                onLogout={onLogout}
                onOpenContact={handleOpenContactModal}
                onShareApp={() => shareService.shareApp(user.id)}
                onNavigate={(path) => {
                    window.location.hash = path;
                    setIsMenuOpen(false);
                }}
                onWithdraw={() => setIsWithdrawalModalOpen(true)}
            />

            <WithdrawalModal
                isOpen={isWithdrawalModalOpen}
                onClose={() => setIsWithdrawalModalOpen(false)}
                onWithdraw={async (reason) => {
                    try {
                        // Withdraw Logic
                        await db.withdrawUser(user.id, reason);
                        alert(t('withdraw_complete_alert', '회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.'));
                        onLogout();
                    } catch (e) {
                        console.error('Withdrawal failed', e);
                        alert(t('withdraw_fail_alert', '탈퇴 처리 중 오류가 발생했습니다.'));
                    }
                }}

            />

            <div className="p-4">
                <div className="bg-surface dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-border dark:border-border-dark mb-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex flex-col items-center">
                            {user.gender === Gender.MALE ? (
                                <img src="/images/icons/Man_boxicon.png" alt="Male" className="w-16 h-16" />
                            ) : user.gender === Gender.FEMALE ? (
                                <img src="/images/icons/Woman_boxicon.png" alt="Female" className="w-16 h-16" />
                            ) : (
                                <img src="/images/icons/uni_boxicon.png" alt="Unisex" className="w-16 h-16" />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl font-bold text-text-main dark:text-text-light truncate max-w-[120px] sm:max-w-[200px]">
                                        {user.nickname || user.email.split('@')[0]}
                                    </h2>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => { setNewNickname(user.nickname || user.email.split('@')[0]); setIsEditingNickname(true); }} className="text-text-muted hover:text-text-main p-1">
                                            <div className="bg-gray-100 dark:bg-gray-800 p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </div>
                                        </button>
                                        <div className="bg-surface dark:bg-surface-dark/50 rounded-full px-2 py-0.5 border border-border dark:border-border-dark flex items-center gap-1">
                                            <LevelIcon level={user.level || 0} size="sm" showLabel />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-xs text-text-muted mb-1 truncate">{user.email}</div>
                            <div className="flex items-center gap-2">
                                {(user.role === UserRole.ADMIN || user.role === UserRole.VIP) && (
                                    <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${user.role === UserRole.ADMIN ? 'bg-red-600 text-white' : 'bg-purple-100 text-purple-600'}`}>
                                        {user.role}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* SUPERVISOR OR ADMIN BUTTON */}
                    {(user.email === SUPERVISOR_EMAIL || user.role === UserRole.ADMIN) && (
                        <button onClick={() => window.location.hash = '#/admin'} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm mb-4 flex items-center justify-center gap-2 shadow-lg animate-pulse">
                            <Shield className="w-4 h-4" /> {t('admin_dashboard', '[관리자 모드] 대시보드')}
                        </button>
                    )}

                    <div className="bg-gray-900 text-white rounded-xl p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div><div className="text-xs text-gray-400 mb-1">{t('my_credit', '내 크래딧')}</div><div className="text-3xl font-bold text-amber-400">{user.credits}</div></div>
                            <button onClick={onAdRequest} className="bg-white/20 px-3 py-2 rounded-lg text-xs font-medium backdrop-blur-sm flex items-center gap-1 hover:bg-white/30 transition">
                                <PlayCircle className="w-3 h-3" /> {t('charge_with_ad', '광고보고 충전')}
                            </button>
                        </div>

                        {/* Recommend & Charge Button (Moved Here) */}
                        <button
                            onClick={() => shareService.shareApp(user.id)}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
                        >
                            <ThumbsUp className="w-4 h-4 fill-white text-white" />
                            {t('recommend_and_charge', '추천하고 충전')}
                        </button>
                    </div>
                </div>



                {/* Dark Mode Toggle */}





                <div className="flex mb-4 bg-surface dark:bg-surface-dark rounded-xl p-1 border border-border dark:border-border-dark">
                    <button onClick={() => setActiveTab('my')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'my' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}>{t('my_registrations', '내 등록')} ({myToilets.length})</button>
                    <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'favorites' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}>{t('favorites', '즐겨찾기')} ({favoriteToilets.length})</button>
                    <button onClick={() => setActiveTab('reviews')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'reviews' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}>{t('review_management', '리뷰관리')} ({myReviews.length})</button>
                </div>

                <div className="space-y-3 min-h-[300px]">
                    {activeTab === 'my' && paginatedItems.map((t: any) => (
                        <div key={t.id} onClick={() => onToiletClick(t)} className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark flex justify-between items-center cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
                            <div className="flex-1">
                                <div className="font-bold text-text-main dark:text-text-light flex items-center gap-2">
                                    {t.name}
                                </div>
                                <div className="text-sm text-text-muted">{t.address} {t.floor}층</div>
                            </div>
                            {t.isPrivate && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center text-xs text-text-muted bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                                        <Eye className="w-3 h-3 mr-1" />
                                        {t.viewCount || 0}
                                    </div>
                                    <div className="bg-gray-100 dark:bg-gray-700 p-1.5 rounded-lg">
                                        <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                    </div>
                                </div>
                            )}
                            {!t.isPrivate && (
                                <div className="flex items-center text-xs text-text-muted bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                                    <Eye className="w-3 h-3 mr-1" />
                                    {t.viewCount || 0}
                                </div>
                            )}
                        </div>
                    ))}

                    {activeTab === 'favorites' && paginatedItems.map((t: any) => (
                        <div key={t.id} onClick={() => onToiletClick(t)} className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark flex justify-between items-center cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
                            <div className="flex-1">
                                <div className="font-bold text-text-main dark:text-text-light">{t.name}</div>
                                <div className="text-sm text-text-muted">{t.address} {t.floor}층</div>
                            </div>
                            <Star className="w-5 h-5 text-amber-400 fill-current" />
                        </div>
                    ))}

                    {activeTab === 'reviews' && (
                        paginatedItems.length === 0 ? (
                            <div className="text-center py-10 text-text-muted">{t('no_reviews_written', '작성한 리뷰가 없습니다.')}</div>
                        ) : (
                            paginatedItems.map((r: any) => {
                                return (
                                    <div key={r.id} onClick={() => onToiletClick({ id: r.toiletId } as Toilet)} className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-text-main dark:text-text-light">{r.toiletName || t('deleted_toilet', "삭제된 화장실")}</div>
                                            <span className="text-xs text-text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-xs text-text-muted mb-2">{r.toiletAddress || ""}</div>
                                        <div className="flex items-center gap-1 mb-2">
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <Star key={star} className={`w-3 h-3 ${star <= r.rating ? 'text-amber-400 fill-current' : 'text-border dark:text-border-dark'}`} />
                                            ))}
                                        </div>
                                        <p className="text-sm text-text-main dark:text-text-light bg-background dark:bg-background-dark p-3 rounded-lg line-clamp-2">{r.content}</p>
                                    </div>
                                );
                            })
                        )
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-4 mb-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className={`p-2 rounded-lg ${page === 1 ? 'text-gray-300 dark:text-gray-600' : 'text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                        >
                            {t('prev_page', '이전')}
                        </button>
                        <span className="text-sm font-medium text-text-muted px-2">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className={`p-2 rounded-lg ${page === totalPages ? 'text-gray-300 dark:text-gray-600' : 'text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                        >
                            {t('next_page', '다음')}
                        </button>
                    </div>
                )}



                <button onClick={onLogout} className="w-full p-4 bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark text-text-muted font-medium hover:bg-background dark:hover:bg-background-dark transition mb-20 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">{t('logout', '로그아웃')}</button>

                {/* Nickname Success Modal */}
                {
                    showNicknameSuccessModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200 shadow-2xl ring-1 ring-black/5">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <Star className="w-8 h-8 text-amber-500 fill-current" />
                                </div>
                                <h3 className="font-bold text-xl mb-2 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">{t('nickname_success_title', '변경 완료!')}</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: t('nickname_success_desc', '와, 정말 멋진 닉네임이네요! ✨<br />새로운 이름으로 활동을 시작해보세요.') }} />
                                <button
                                    onClick={() => setShowNicknameSuccessModal(false)}
                                    className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5"
                                >
                                    {t('nickname_awesome', '멋져요!')}
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Nickname Edit Modal */}
                {isEditingNickname && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl p-6 animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-lg dark:text-white">{t('nickname_change_title', '닉네임 변경')}</h3>
                                <button
                                    onClick={() => setIsEditingNickname(false)}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    {t('nickname_new_label', '새로운 닉네임')}
                                </label>
                                <input
                                    type="text"
                                    value={newNickname}
                                    onChange={(e) => setNewNickname(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-primary dark:text-white text-lg font-bold placeholder:font-normal"
                                    placeholder={t('nickname_placeholder', '최대 8자 입력')}
                                    maxLength={8}
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-2 text-right">
                                    {newNickname.length} / 8
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setIsEditingNickname(false)}
                                    className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                >
                                    {t('cancel', '취소')}
                                </button>
                                <button
                                    onClick={handleNicknameUpdate}
                                    className="flex-1 py-3.5 bg-primary hover:bg-primary-500 text-white rounded-xl font-bold transition shadow-lg shadow-primary/30"
                                >
                                    {t('nickname_save', '저장')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ContactModal
                    isOpen={showContactModal}
                    onClose={handleCloseContactModal}
                    user={user}
                />

                {selectedNotice && (
                    <NoticeDetailModal
                        notice={selectedNotice}
                        onClose={() => setSelectedNotice(null)}
                    />
                )}
            </div>
        </PageLayout >
    );
};

export default MyPage;
