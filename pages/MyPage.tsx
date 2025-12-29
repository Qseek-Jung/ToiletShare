import React, { useState, useEffect } from 'react';
import { UserIcon, Shield, PlayCircle, Star, HelpCircle, X, Send, CheckCircle, AlertCircle, Sun, Moon, ArrowRight, Share2, Mail, Lock, BookOpen, Eye, Bell, Menu, ThumbsUp } from 'lucide-react';
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
    onContactModalChange?: (isOpen: boolean) => void;
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
    onContactModalChange
}) => {
    const [activeTab, setActiveTab] = useState<'my' | 'favorites' | 'reviews'>('my');
    const [myReviews, setMyReviews] = useState<Review[]>([]);

    const [myToilets, setMyToilets] = useState<Toilet[]>([]); // New state for fetching directly from DB
    const [favoriteToilets, setFavoriteToilets] = useState<Toilet[]>([]); // New: Fetch favorites independently
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Nickname Edit State
    const [isEditingNickname, setIsEditingNickname] = useState(false);
    const [newNickname, setNewNickname] = useState(user.nickname || user.email.split('@')[0]);
    const [showNicknameSuccessModal, setShowNicknameSuccessModal] = useState(false);



    // const myToiletsList = toilets.filter(t => t.createdBy === user.id); // Removed: Client-side filter is unreliable
    // const favoriteToiletsList = toilets.filter(t => bookmarks.has(t.id)); // REMOVED: Radius dependent


    // Contact Modal State
    const [showContactModal, setShowContactModal] = useState(false);
    const [inquiryType, setInquiryType] = useState('서비스오류');
    const [contact, setContact] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Hamburger Menu State
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

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
                const [reviews, userToilets] = await Promise.all([
                    db.getUserReviews(user.id),
                    db.getUserToilets(user.id)
                ]);
                setMyReviews(reviews);
                setMyToilets(userToilets);
                setNewNickname(user.nickname || user.email.split('@')[0]);

                // Fetch Favorites (using bookmarks prop)
                if (bookmarks.size > 0) {
                    const favs = await db.getToiletsByIds(Array.from(bookmarks));
                    setFavoriteToilets(favs);
                } else {
                    setFavoriteToilets([]);
                }
            }
        };
        loadReviews();
    }, [user.id, activeTab, refreshTrigger, bookmarks]); // Added bookmarks dependency

    const handleNicknameUpdate = async () => {
        if (!newNickname.trim()) {
            alert("닉네임을 입력해주세요.");
            return;
        }
        if (newNickname.length > 8) {
            alert("닉네임은 최대 8자까지만 가능합니다.");
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
            alert("닉네임 변경 실패");
        }
    };

    const handleSendInquiry = async () => {
        if (!contact.trim() || !inquiryContent.trim()) {
            alert('연락처와 내용을 모두 입력해주세요.');
            return;
        }

        setIsSending(true);

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    from_name: user.nickname || '익명 사용자',
                    from_email: user.email,
                    reply_to: contact,
                    message: inquiryContent,
                    type: inquiryType
                },
                EMAILJS_PUBLIC_KEY
            );
            setShowSuccessModal(true);
            setContact('');
            setInquiryContent('');
            handleCloseContactModal();
        } catch (error) {
            console.error('EmailJS Error:', error);
            setShowErrorModal(true);
        } finally {
            setIsSending(false);
        }
    };

    // ... existing code ...

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
                            <h3 className="font-bold text-lg mb-2 dark:text-white">변경 완료!</h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                와, 정말 멋진 닉네임이네요! 😎<br />
                                새로운 이름으로 활동을 시작해보세요.
                            </p>
                            <button
                                onClick={() => setShowNicknameSuccessModal(false)}
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-amber-600 transition"
                            >
                                확인
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
                        <h1 className="font-bold text-lg leading-tight flex items-center gap-2 text-text-main dark:text-text-light">My Page</h1>
                    </div>
                </div>
                <div className="flex gap-1">
                    {/* Notification Icon */}
                    <button
                        onClick={() => window.location.hash = '#/notifications'}
                        className="p-2 text-text-muted hover:bg-background dark:hover:bg-background-dark rounded-full transition-colors relative"
                    >
                        <Bell className="w-6 h-6" />
                        {/* <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-gray-900"></span> */}
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

            <HamburgerMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                user={user}
                onLogout={onLogout}
                onOpenContact={handleOpenContactModal}
                onShareApp={() => {
                    const baseUrl = Capacitor.isNativePlatform()
                        ? 'https://toiletshare.pages.dev'
                        : window.location.origin;

                    const shareUrl = `${baseUrl}/?ref=${btoa(user.id)}`;

                    if (navigator.share) {
                        navigator.share({
                            title: '대똥단결 - 급똥으로 대동단결',
                            text: '내 주변 무료 개방 화장실 찾기!',
                            url: shareUrl
                        }).catch(console.error);
                    } else {
                        navigator.clipboard.writeText(shareUrl);
                        alert('링크가 복사되었습니다!');
                    }
                }}
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
                        alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
                        onLogout();
                    } catch (e) {
                        console.error('Withdrawal failed', e);
                        alert('탈퇴 처리 중 오류가 발생했습니다.');
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
                                {isEditingNickname ? (
                                    <div className="flex items-center gap-1">
                                        <input
                                            type="text"
                                            value={newNickname}
                                            onChange={(e) => setNewNickname(e.target.value)}
                                            className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                                            placeholder="닉네임"
                                            maxLength={8}
                                        />
                                        <button onClick={handleNicknameUpdate} className="bg-primary text-white text-xs px-2 py-1 rounded">저장</button>
                                        <button onClick={() => setIsEditingNickname(false)} className="bg-background dark:bg-background-dark text-text-muted text-xs px-2 py-1 rounded">취소</button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-xl font-bold text-text-main dark:text-text-light truncate max-w-[120px] sm:max-w-[200px]">
                                            {user.nickname || user.email.split('@')[0]}
                                        </h2>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button onClick={() => setIsEditingNickname(true)} className="text-text-muted hover:text-text-main">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <div className="bg-surface dark:bg-surface-dark/50 rounded-full px-2 py-0.5 border border-border dark:border-border-dark flex items-center gap-1">
                                                <LevelIcon level={user.level || 0} size="sm" showLabel />
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                            <Shield className="w-4 h-4" /> [관리자 모드] 대시보드
                        </button>
                    )}

                    <div className="bg-gray-900 text-white rounded-xl p-4">
                        <div className="flex justify-between items-center mb-4">
                            <div><div className="text-xs text-gray-400 mb-1">내 크래딧</div><div className="text-3xl font-bold text-amber-400">{user.credits}</div></div>
                            <button onClick={onAdRequest} className="bg-white/20 px-3 py-2 rounded-lg text-xs font-medium backdrop-blur-sm flex items-center gap-1 hover:bg-white/30 transition">
                                <PlayCircle className="w-3 h-3" /> 광고보고 충전
                            </button>
                        </div>

                        {/* Recommend & Charge Button (Moved Here) */}
                        <button
                            onClick={() => {
                                const baseUrl = Capacitor.isNativePlatform()
                                    ? 'https://toiletshare.pages.dev'
                                    : window.location.origin;

                                const shareUrl = `${baseUrl}/?ref=${btoa(user.id)}`;

                                if (navigator.share) {
                                    navigator.share({
                                        title: '대똥단결 - 급똥으로 대동단결',
                                        text: '내 주변 무료 개방 화장실 찾기!',
                                        url: shareUrl
                                    }).catch(console.error);
                                } else {
                                    navigator.clipboard.writeText(shareUrl);
                                    alert('공유 링크가 복사되었습니다!');
                                }
                            }}
                            className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
                        >
                            <ThumbsUp className="w-4 h-4 fill-white text-white" />
                            추천하고 충전
                        </button>
                    </div>
                </div>

                {/* Dark Mode Toggle */}
                <div className="bg-surface dark:bg-surface-dark rounded-2xl p-6 shadow-sm border border-border dark:border-border-dark mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <h3 className="font-bold text-text-main dark:text-text-light mb-1">다크/라이트 모드</h3>
                            <p className="text-xs text-text-muted">화면 테마를 변경합니다</p>
                        </div>
                        <button
                            onClick={onToggleDarkMode}
                            className={`relative w-16 h-8 rounded-full transition-all duration-300 ${darkMode ? 'bg-gray-700' : 'bg-amber-400'
                                }`}
                            aria-label="Toggle dark mode"
                        >
                            <div className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${darkMode ? 'translate-x-8' : 'translate-x-0'
                                }`}>
                                {darkMode ? (
                                    <Moon className="w-4 h-4 text-gray-700" />
                                ) : (
                                    <Sun className="w-4 h-4 text-amber-500" />
                                )}
                            </div>
                        </button>
                    </div>
                </div>





                <div className="flex mb-4 bg-surface dark:bg-surface-dark rounded-xl p-1 border border-border dark:border-border-dark">
                    <button onClick={() => setActiveTab('my')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'my' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}>내 등록 ({myToilets.length})</button>
                    <button onClick={() => setActiveTab('favorites')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'favorites' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}>즐겨찾기 ({favoriteToilets.length})</button>
                    <button onClick={() => setActiveTab('reviews')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'reviews' ? 'bg-primary text-white shadow' : 'text-text-muted hover:text-text-main'}`}>리뷰관리 ({myReviews.length})</button>
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
                            <div className="text-center py-10 text-text-muted">작성한 리뷰가 없습니다.</div>
                        ) : (
                            paginatedItems.map((r: any) => {
                                return (
                                    <div key={r.id} onClick={() => onToiletClick({ id: r.toiletId } as Toilet)} className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/10 transition">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-text-main dark:text-text-light">{r.toiletName || "삭제된 화장실"}</div>
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
                            이전
                        </button>
                        <span className="text-sm font-medium text-text-muted px-2">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className={`p-2 rounded-lg ${page === totalPages ? 'text-gray-300 dark:text-gray-600' : 'text-primary hover:bg-primary-50 dark:hover:bg-primary-900/20'}`}
                        >
                            다음
                        </button>
                    </div>
                )}



                <button onClick={onLogout} className="w-full p-4 bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark text-text-muted font-medium hover:bg-background dark:hover:bg-background-dark transition mb-20 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">로그아웃</button>

                {/* Nickname Success Modal */}
                {
                    showNicknameSuccessModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200 shadow-2xl ring-1 ring-black/5">
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <Star className="w-8 h-8 text-amber-500 fill-current" />
                                </div>
                                <h3 className="font-bold text-xl mb-2 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-amber-500 to-orange-600">변경 완료!</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">
                                    와, 정말 멋진 닉네임이네요! ✨<br />
                                    새로운 이름으로 활동을 시작해보세요.
                                </p>
                                <button
                                    onClick={() => setShowNicknameSuccessModal(false)}
                                    className="w-full py-3.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transform transition hover:-translate-y-0.5"
                                >
                                    멋져요!
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Contact Modal */}
                {
                    showContactModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                                    <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                                        <HelpCircle className="w-5 h-5 text-primary" />
                                        문의하기
                                    </h3>
                                    <button onClick={handleCloseContactModal} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                                        <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                                    </button>
                                </div>
                                <div className="p-6 space-y-6 overflow-y-auto">
                                    <div>
                                        <label className="block text-sm font-bold mb-3 dark:text-gray-300">문의 유형</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['서비스오류', '제휴문의', '광고문의', '기타문의'].map((type) => (
                                                <button
                                                    key={type}
                                                    onClick={() => setInquiryType(type)}
                                                    className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${inquiryType === type
                                                        ? 'bg-primary text-white shadow-md scale-[1.02]'
                                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">연락처 <span className="text-gray-400 font-normal text-xs">(답변 받을 곳)</span></label>
                                        <input
                                            type="text"
                                            value={contact}
                                            onChange={(e) => setContact(e.target.value)}
                                            placeholder="전화번호 또는 이메일"
                                            className="w-full p-4 border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold mb-2 dark:text-gray-300">문의 내용</label>
                                        <textarea
                                            value={inquiryContent}
                                            onChange={(e) => setInquiryContent(e.target.value)}
                                            placeholder="내용을 자세히 적어주시면 빠르게 확인할 수 있습니다."
                                            className="w-full p-4 border dark:border-gray-600 rounded-xl h-40 resize-none bg-gray-50 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                                        />
                                    </div>
                                </div>

                                <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                                    <button
                                        onClick={handleSendInquiry}
                                        disabled={isSending}
                                        className={`w-full py-4 bg-primary text-white text-lg rounded-2xl font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        {isSending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                                전송 중...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                문의 보내기
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Success Modal */}
                {
                    showSuccessModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <h3 className="font-bold text-lg mb-2 dark:text-white">전송 완료!</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">관리자에게 메일이<br />잘 전송되었습니다.</p>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full py-3 bg-primary text-white rounded-xl font-bold"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Error Modal */}
                {
                    showErrorModal && (
                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200">
                                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="font-bold text-lg mb-2 dark:text-white">전송 실패</h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                                    메일 시스템 오류가 발생했습니다.<br />
                                    <span className="font-bold select-all text-gray-800 dark:text-white">qseek77@gmail.com</span>으로<br />
                                    직접 문의 부탁드립니다.
                                </p>
                                <button
                                    onClick={() => setShowErrorModal(false)}
                                    className="w-full py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold"
                                >
                                    닫기
                                </button>
                            </div>
                        </div>
                    )
                }
            </div>
        </PageLayout >
    );
};

export default MyPage;
