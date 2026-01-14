import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, Star, MessageSquareQuote, ShieldAlert, Award, Footprints, CheckCheck, Trash2, X } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';
import { User, PushNotification, NotificationType } from '../types';
import { dbSupabase as db } from '../services/db_supabase';
import { formatDistanceToNow } from '../utils';

interface NotificationPageProps {
    user: User;
    onRefreshUser: () => void;
}

export const NotificationPage: React.FC<NotificationPageProps> = ({ user, onRefreshUser }) => {
    const [notifications, setNotifications] = useState<PushNotification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const loadNotifications = async () => {
        if (!user.id) return;
        setIsLoading(true);

        // 1. Auto Cleanup (D+1)
        await db.cleanupExpiredNotifications(user.id);

        // 2. Load
        const data = await db.getUserNotifications(user.id);
        setNotifications(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadNotifications();
    }, [user.id]);

    const handleNotifClick = async (n: PushNotification) => {
        if (isEditMode) {
            toggleSelect(n.id);
            return;
        }

        if (!n.read) {
            await db.markNotificationAsRead(n.id);
            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, read: true } : item));
            onRefreshUser();
        }

        // Navigation logic
        if (n.data?.toiletId) {
            window.location.hash = `#/toilet/${n.data.toiletId}`;
        } else if (n.data?.reportId) {
            if (n.type === NotificationType.REPORT_RESULT && n.data.toiletId) {
                window.location.hash = `#/toilet/${n.data.toiletId}`;
            }
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleMarkAllRead = async () => {
        if (!user.id) return;
        await db.markAllNotificationsAsRead(user.id);
        setNotifications(prev => prev.map(item => ({ ...item, read: true })));
        onRefreshUser();
    };

    const handleClearAll = async () => {
        if (!user.id) return;
        await db.deleteAllNotifications(user.id);
        setNotifications([]);
        setShowClearConfirm(false);
        setIsEditMode(false);
        onRefreshUser();
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        const idsToDelete = Array.from(selectedIds) as string[];
        await db.deleteNotifications(idsToDelete);
        setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
        setSelectedIds(new Set());
        if (notifications.length <= idsToDelete.length) setIsEditMode(false);
        onRefreshUser();
    };

    const getIcon = (type: NotificationType) => {
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

    const getBgColor = (type: NotificationType, read: boolean) => {
        if (read) return 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800';

        switch (type) {
            case NotificationType.TOILET_REPORTED: return 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30';
            case NotificationType.REVIEW_ADDED: return 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30';
            case NotificationType.CREDIT_AWARDED: return 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30';
            default: return 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800';
        }
    };

    // Grouping Logic
    const groupedNotifications = (() => {
        const groups: { [key: string]: PushNotification[] } = {
            '오늘': [],
            '어제': [],
            '이전': []
        };

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        notifications.forEach(n => {
            const d = new Date(n.sentAt);
            if (d.toDateString() === today.toDateString()) {
                groups['오늘'].push(n);
            } else if (d.toDateString() === yesterday.toDateString()) {
                groups['어제'].push(n);
            } else {
                groups['이전'].push(n);
            }
        });
        return groups;
    })();

    const hasNotifications = notifications.length > 0;
    const hasUnread = notifications.some(n => !n.read);

    return (
        <PageLayout className="pb-24">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (isEditMode) {
                                setIsEditMode(false);
                                setSelectedIds(new Set());
                                return;
                            }
                            if (window.history.length > 2) window.history.back();
                            else window.location.hash = '#/my';
                        }}
                        className="p-2 -ml-2 text-gray-900 dark:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {isEditMode ? <X className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
                    </button>
                    <h1 className="font-bold text-lg text-gray-900 dark:text-white">
                        {isEditMode ? `${selectedIds.size}개 선택됨` : '알림 센터'}
                    </h1>
                </div>

                {hasNotifications && (
                    <div className="flex items-center gap-1">
                        {!isEditMode ? (
                            <>
                                {hasUnread && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                                        title="모두 읽음"
                                    >
                                        <CheckCheck className="w-5 h-5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsEditMode(true)}
                                    className="p-2 text-gray-500 hover:bg-gray-50 rounded-full font-bold text-sm"
                                >
                                    편집
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setShowClearConfirm(true)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full text-xs font-bold"
                            >
                                전체삭제
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="pt-16 px-4">
                {isLoading ? (
                    <div className="flex justify-center py-20 text-gray-400">
                        데이터를 불러오는 중입니다...
                    </div>
                ) : !hasNotifications ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-in fade-in zoom-in duration-300">
                        <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">새로운 알림이 없습니다</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[200px] leading-relaxed">
                            다양한 활동을 통해<br />알림을 받아보세요!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6 pb-20">
                        {Object.entries(groupedNotifications).map(([label, items]) => (
                            items.length > 0 && (
                                <div key={label} className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                                    <h2 className="text-sm font-bold text-gray-400 mb-3 px-1">{label}</h2>
                                    <div className="flex flex-col gap-3">
                                        {items.map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => handleNotifClick(n)}
                                                className={`relative border rounded-2xl p-4 transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-sm flex items-center gap-3
                                                    ${getBgColor(n.type, n.read)}
                                                    ${!n.read ? 'ring-1 ring-blue-500/20' : ''}
                                                    ${isEditMode && selectedIds.has(n.id) ? 'border-primary bg-primary/5' : ''}
                                                `}
                                            >
                                                {isEditMode && (
                                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedIds.has(n.id) ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'}`}>
                                                        {selectedIds.has(n.id) && <CheckCheck className="w-4 h-4 text-white" />}
                                                    </div>
                                                )}
                                                <div className="flex-1 flex gap-3 min-w-0">
                                                    <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm
                                                        ${n.read ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>
                                                        {getIcon(n.type)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <div className="max-w-[80%]">
                                                                <h4 className={`text-sm mb-0.5 dark:text-gray-200 truncate ${n.read ? 'font-medium text-gray-700' : 'font-bold text-gray-900'}`}>
                                                                    {n.title}
                                                                </h4>
                                                            </div>
                                                            <span className="text-xs font-medium text-gray-400 whitespace-nowrap ml-2">
                                                                {formatDistanceToNow(new Date(n.sentAt))}
                                                            </span>
                                                        </div>
                                                        <p className={`text-sm line-clamp-2 leading-relaxed ${n.read ? 'text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}>
                                                            {n.message}
                                                        </p>
                                                    </div>
                                                </div>
                                                {!n.read && !isEditMode && (
                                                    <div className="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full shadow-sm ring-2 ring-white dark:ring-gray-900" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Action Bar (Edit Mode) */}
            {isEditMode && hasNotifications && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 flex gap-3 animate-in slide-in-from-bottom-full">
                    <button
                        onClick={handleDeleteSelected}
                        disabled={selectedIds.size === 0}
                        className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${selectedIds.size > 0 ? 'bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none' : 'bg-gray-100 dark:bg-gray-800 text-gray-400'}`}
                    >
                        <Trash2 className="w-5 h-5" />
                        {selectedIds.size}개 삭제하기
                    </button>
                    <button
                        onClick={() => { setIsEditMode(false); setSelectedIds(new Set()); }}
                        className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold"
                    >
                        취소
                    </button>
                </div>
            )}

            {/* Clear All Confirm Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-xs p-8 shadow-2xl transform transition-all scale-100">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">알림 전체 삭제</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                                모든 알림 내역이 DB에서도 영구 삭제됩니다.<br />복구할 수 없습니다.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleClearAll}
                                className="w-full py-4 bg-red-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-red-200 dark:shadow-none active:scale-95 transition-transform"
                            >
                                예, 모두 삭제하겠습니다
                            </button>
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-bold text-sm h-14"
                            >
                                다시 생각할게요
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    );
};

export default NotificationPage;
