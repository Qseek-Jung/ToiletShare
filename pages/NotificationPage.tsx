import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Star, MessageSquareQuote, ShieldAlert, Award, Footprints, CheckCheck, Trash2, X, Megaphone, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import { TextLayout } from '../components/TextLayout';
import { User, PushNotification, NotificationType, AppNotice } from '../types';
import { dbSupabase as db } from '../services/db_supabase';
import { formatDistanceToNow } from '../utils';
import { NoticeDetailModal } from '../components/NoticeDetailModal';

interface NotificationPageProps {
    user: User;
    onRefreshUser: () => void;
    onLoginRequest: () => void;
    onAdRequest: () => void;
    onUserUpdate: (user: User) => void;
    darkMode: boolean;
    onToggleDarkMode: () => void;
    onContactModalChange: (isOpen: boolean) => void;
    onNoticeModalChange: (isOpen: boolean) => void;
}

// Unified Type for List Rendering
type DisplayItem =
    | (PushNotification & { kind: 'notification' })
    | (AppNotice & { kind: 'notice'; read: boolean; sentAt: string; message: string });

export const NotificationPage: React.FC<NotificationPageProps> = ({ user, onRefreshUser, onNoticeModalChange }) => {
    // State
    const [notifications, setNotifications] = useState<DisplayItem[]>([]);
    const [latestNotice, setLatestNotice] = useState<DisplayItem | null>(null);
    const [olderNotices, setOlderNotices] = useState<DisplayItem[]>([]);

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showOlderNotices, setShowOlderNotices] = useState(false);

    // Modals
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState<AppNotice | null>(null);

    const loadData = async () => {
        if (!user.id) return;
        setIsLoading(true);

        try {
            // Run cleanup and fetching in parallel
            const [notifs, noticeData] = await Promise.all([
                db.getUserNotifications(user.id),
                db.getAppNotices(user.id),
                db.cleanupExpiredNotifications(user.id) // Cleanup can run in background
            ]);

            const mappedNotifs: DisplayItem[] = notifs.map(n => ({ ...n, kind: 'notification' }));

            const { notices, hiddenIds } = noticeData;
            const mappedNotices: DisplayItem[] = notices
                .filter(n => !hiddenIds.has(n.id))
                .sort((a, b) => {
                    if (b.priority !== a.priority) return b.priority - a.priority;
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                })
                .map(n => ({
                    ...n,
                    kind: 'notice',
                    read: false,
                    sentAt: n.createdAt,
                    message: n.content.replace(/<[^>]*>/g, '').slice(0, 100) + (n.content.length > 100 ? '...' : '')
                }));

            // 4. Separate Notices
            if (mappedNotices.length > 0) {
                // The most recent/high priority one is pinned
                setLatestNotice(mappedNotices[0]);
                // The rest are older
                setOlderNotices(mappedNotices.slice(1));
            } else {
                setLatestNotice(null);
                setOlderNotices([]);
            }

            // 5. Set Notifications
            setNotifications(mappedNotifs);

        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user.id]);

    useEffect(() => {
        onNoticeModalChange(!!selectedNotice);
    }, [selectedNotice, onNoticeModalChange]);

    useEffect(() => {
        const handler = () => setSelectedNotice(null);
        window.addEventListener('closeNoticeDetail', handler);
        return () => window.removeEventListener('closeNoticeDetail', handler);
    }, []);

    // Handlers
    const handleItemClick = async (item: DisplayItem) => {
        if (isEditMode) {
            toggleSelect(item.id);
            return;
        }

        if (item.kind === 'notice') {
            setSelectedNotice(item);
            return;
        }

        // Notification Click Logic (Delete & Navigate)
        const n = item as PushNotification;

        // 1. Delete Item (Optimistic UI + API)
        try {
            // Remove from local list immediately
            setNotifications(prev => prev.filter(i => i.id !== n.id));

            // API Call
            await db.deleteNotifications([n.id]);
            onRefreshUser(); // Refresh user data (unread count etc)
        } catch (e) {
            console.error("Failed to delete notification on click", e);
            // Revert strictness? Usually not worth complexity for deletion failure
        }

        // 2. Navigation (if applicable)
        if (n.data?.toiletId) {
            window.location.hash = `#/toilet/${n.data.toiletId}`;
        } else if (n.data?.reviewId) {
            // If there's a reviewId but no toiletId, we might need logic. 
            // But usually toiletId is present for review notifications.
        } else if (n.type === NotificationType.CREDIT_AWARDED) {
            // Stay on page or go to points history? User said "just delete"
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleSelectAll = () => {
        const allIds = new Set<string>();
        notifications.forEach(n => allIds.add(n.id));
        setSelectedIds(allIds);
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;

        // Separate IDs
        const notifIdsToDelete: string[] = [];
        const noticeIdsToHide: string[] = [];

        // Check against our state lists to determine type
        // A bit inefficient but simple
        const checkAndSort = (item: DisplayItem) => {
            if (selectedIds.has(item.id)) {
                if (item.kind === 'notification') notifIdsToDelete.push(item.id);
                else noticeIdsToHide.push(item.id);
            }
        };

        if (latestNotice) checkAndSort(latestNotice);
        olderNotices.forEach(checkAndSort);
        notifications.forEach(checkAndSort);

        // Execute API Calls
        try {
            if (notifIdsToDelete.length > 0) {
                await db.deleteNotifications(notifIdsToDelete);
            }
            if (noticeIdsToHide.length > 0 && user.id) {
                for (const nid of noticeIdsToHide) {
                    await db.hideAppNotice(user.id, nid);
                }
            }
            console.log(`✅ Successfully deleted ${notifIdsToDelete.length} notifs and hid ${noticeIdsToHide.length} notices`);
        } catch (e) {
            console.error("Batch delete failed", e);
            alert("삭제 처리 중 오류가 발생했습니다.");
        }

        // Refresh Data locally
        setSelectedIds(new Set());
        setIsEditMode(false);
        await loadData(); // Reload to re-sort notices
        onRefreshUser();
    };

    // Helper: Icon
    const getIcon = (item: DisplayItem) => {
        if (item.kind === 'notice') return <Megaphone className="w-5 h-5 text-white" />;

        const type = (item as PushNotification).type;
        switch (type) {
            case NotificationType.REVIEW_ADDED: return <MessageSquareQuote className="w-5 h-5 text-blue-500" />;
            case NotificationType.TOILET_REPORTED: return <ShieldAlert className="w-5 h-5 text-red-500" />;
            case NotificationType.REPORT_RESULT: return <CheckCheck className="w-5 h-5 text-green-600" />;
            case NotificationType.CREDIT_AWARDED: return <Award className="w-5 h-5 text-amber-500" />;
            case NotificationType.NEARBY_TOILET: return <Footprints className="w-5 h-5 text-purple-500" />;
            case NotificationType.LEVEL_CHANGE: return <Star className="w-5 h-5 text-yellow-400" />;
            case NotificationType.SCORE_CHANGE: return <Award className="w-5 h-5 text-teal-500" />;
            default: return <Bell className="w-5 h-5 text-gray-400" />;
        }
    };

    const hasItems = (latestNotice !== null) || (olderNotices.length > 0) || (notifications.length > 0);

    return (
        <TextLayout className="pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 px-4 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] flex items-center justify-between transition-all duration-300">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            if (isEditMode) {
                                setIsEditMode(false);
                                setSelectedIds(new Set());
                            } else {
                                if (window.history.length > 2) window.history.back();
                                else window.location.hash = '#/my';
                            }
                        }}
                        className="p-1.5 -ml-1 text-gray-900 dark:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                        {isEditMode ? <X className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
                    </button>
                    <h1 className="font-black text-lg tracking-tight text-gray-900 dark:text-white">
                        {isEditMode ? `${selectedIds.size}` : '알림'}
                    </h1>
                </div>

                {hasItems && (
                    <div className="flex items-center">
                        {!isEditMode ? (
                            <button
                                onClick={() => setIsEditMode(true)}
                                className="px-3 py-1 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xs font-bold transition-colors"
                            >
                                편집
                            </button>
                        ) : (
                            <button
                                onClick={handleSelectAll}
                                className="px-3 py-1 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors"
                            >
                                전체선택
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="pt-[calc(4rem+env(safe-area-inset-top))] pb-20 px-4 max-w-lg mx-auto w-full">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : !hasItems ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Bell className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">새로운 알림이 없습니다</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                            소식이 도착하면 알려드릴게요!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Pinned Notice Section - SLIM */}
                        {latestNotice && (
                            <div className="animate-in slide-in-from-top-4 fade-in duration-700 ease-out">
                                <div
                                    onClick={() => handleItemClick(latestNotice)}
                                    className={`group relative overflow-hidden bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 px-4 py-3 cursor-pointer transition-all duration-300 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 active:scale-[0.98] ${isEditMode ? 'opacity-90' : ''}`}
                                >
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-9 h-9 rounded-xl bg-blue-500 dark:bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                                            <Megaphone className="w-5 h-5 text-white" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-0.5">
                                                <span className="text-[9px] uppercase tracking-tighter font-black text-blue-600 dark:text-blue-400">
                                                    Notice
                                                </span>
                                                <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600">
                                                    {formatDistanceToNow(new Date(latestNotice.sentAt))}
                                                </span>
                                            </div>
                                            <h3 className="font-extrabold text-gray-900 dark:text-white leading-tight truncate text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {latestNotice.title}
                                            </h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Older Notices Accordion */}
                        {olderNotices.length > 0 && (
                            <div className="animate-in fade-in duration-500 delay-75">
                                <div className="flex justify-center -mt-2 mb-2 relative z-10">
                                    <button
                                        onClick={() => setShowOlderNotices(!showOlderNotices)}
                                        className="px-4 py-1.5 flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 transition-all active:scale-95"
                                    >
                                        <span>{showOlderNotices ? '공지사항 접기' : '더보기'}</span>
                                        {showOlderNotices ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                    </button>
                                </div>

                                {showOlderNotices && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {olderNotices.map(notice => (
                                            <div
                                                key={notice.id}
                                                onClick={() => handleItemClick(notice)}
                                                className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center gap-3"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700/50 flex items-center justify-center shrink-0">
                                                    <Megaphone className="w-4 h-4 text-gray-500" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">{notice.title}</h4>
                                                    <p className="text-xs text-text-muted mt-0.5">{formatDistanceToNow(new Date(notice.sentAt))}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notifications List - SLIM */}
                        {notifications.length > 0 && (
                            <div className="animate-in slide-in-from-bottom-6 fade-in duration-800 delay-150">
                                <div className="space-y-2">
                                    {notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleItemClick(n)}
                                            className={`relative group bg-white dark:bg-gray-800 rounded-xl px-4 py-3 transition-all duration-300 active:scale-[0.99] cursor-pointer shadow-sm border
                                                ${selectedIds.has(n.id) && isEditMode ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/10' : 'border-gray-50 dark:border-gray-800/50'}
                                                ${!n.read && !isEditMode ? 'bg-blue-50/20 dark:bg-blue-900/05 border-blue-100/30 dark:border-blue-900/20' : 'hover:border-gray-200 dark:hover:border-gray-700'}
                                            `}
                                        >
                                            <div className="flex gap-3 items-center">
                                                {/* Edit Checkbox */}
                                                {isEditMode && (
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${selectedIds.has(n.id) ? 'bg-blue-600 border-blue-600 scale-105' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        {selectedIds.has(n.id) && <CheckCheck className="w-3 h-3 text-white" />}
                                                    </div>
                                                )}

                                                {/* Icon - SLIMMER */}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
                                                    ${n.read ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 group-hover:-translate-y-0.5'}`}>
                                                    <div className="scale-90">{getIcon(n)}</div>
                                                </div>

                                                {/* Text Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className={`text-sm truncate pr-2 ${n.read ? 'font-bold text-gray-500 dark:text-gray-400' : 'font-black text-gray-900 dark:text-white'}`}>
                                                            {n.title}
                                                        </h4>
                                                        <span className="text-[10px] font-bold text-gray-300 dark:text-gray-600 shrink-0">
                                                            {formatDistanceToNow(new Date(n.sentAt))}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[11px] line-clamp-1 truncate ${n.read ? 'text-gray-400' : 'font-semibold text-gray-500 dark:text-gray-400'}`}>
                                                        {n.message}
                                                    </p>
                                                </div>

                                                {/* Unread Indicator */}
                                                {!n.read && !isEditMode && (
                                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 shadow-sm shadow-blue-500/50" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {isEditMode && (
                <div className="fixed bottom-[150px] left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[1000] animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                        className={`w-full py-4 rounded-2xl font-bold text-lg shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98]
                            ${selectedIds.size > 0
                                ? 'bg-red-500 text-white shadow-red-500/30'
                                : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                        `}
                    >
                        <Trash2 className="w-5 h-5" />
                        {selectedIds.size > 0 ? `${selectedIds.size}개 삭제하기` : '삭제할 항목 선택'}
                    </button>
                </div>
            )}

            {/* Notice Detail Modal */}
            {selectedNotice && (
                <NoticeDetailModal
                    notice={selectedNotice}
                    onClose={() => setSelectedNotice(null)}
                />
            )}
        </TextLayout>
    );
};

export default NotificationPage;
