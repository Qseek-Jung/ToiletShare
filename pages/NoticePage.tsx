import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, X } from 'lucide-react';
import { TextLayout } from '../components/TextLayout';
import { AppNotice, User } from '../types';
import { formatDistanceToNow } from '../utils';
import { dbSupabase as db } from '../services/db_supabase';

interface NoticePageProps {
    user: User;
    noticeId: string;
}

const NoticePage: React.FC<NoticePageProps> = ({ user, noticeId }) => {
    const [notice, setNotice] = useState<AppNotice | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        const loadNotice = async () => {
            if (!user) return;
            setLoading(true);
            try {
                // Fetch all notices and find the one (or implementing getNoticeById if available)
                // Since we don't have getNoticeById exposed commonly, we can reuse getAppNotices or similar.
                // Assuming efficient enough or minimal list.
                const { notices } = await db.getAppNotices(user.id);
                const found = notices.find(n => n.id === noticeId);
                setNotice(found || null);
            } catch (e) {
                console.error("Failed to load notice", e);
            } finally {
                setLoading(false);
            }
        };
        loadNotice();
    }, [user, noticeId]);

    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            setSelectedImage((target as HTMLImageElement).src);
        }
    };

    if (loading) {
        return (
            <TextLayout className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </TextLayout>
        );
    }

    if (!notice) {
        return (
            <TextLayout className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 space-y-4">
                <p className="text-gray-500">공지사항을 찾을 수 없습니다.</p>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-bold"
                >
                    돌아가기
                </button>
            </TextLayout>
        );
    }

    return (
        <TextLayout className="bg-white dark:bg-gray-900 p-0" noPadding>
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 pt-[env(safe-area-inset-top)] shadow-sm">
                <div className="flex items-center px-4 h-14">
                    <button
                        onClick={() => window.history.back()}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white truncate pr-4">공지사항</h1>
                </div>
            </div>

            {/* Content Scroll Area */}
            <div className="absolute inset-0 pt-[calc(env(safe-area-inset-top)+3.5rem)] pb-[env(safe-area-inset-bottom)] overflow-y-auto scrollbar-hide">
                <div className="max-w-3xl mx-auto p-5 pb-20">
                    {/* Notice Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                            {notice.priority > 0 && (
                                <span className="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-md text-xs font-bold">
                                    중요
                                </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-full">
                                <Calendar className="w-3 h-3" />
                                {formatDistanceToNow(new Date(notice.createdAt))}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                            {notice.title}
                        </h1>
                    </div>

                    {/* Rich Content */}
                    <div
                        className="prose prose-lg dark:prose-invert max-w-none prose-img:rounded-xl prose-img:shadow-md prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-headings:font-bold prose-p:text-gray-600 dark:prose-p:text-gray-300"
                        onClick={handleContentClick}
                        dangerouslySetInnerHTML={{ __html: notice.content }}
                    />
                </div>
            </div>

            {/* Image Gallery Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-full bg-black/50"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Zoomed"
                        className="max-w-full max-h-full rounded-lg shadow-2xl object-contain"
                    />
                </div>
            )}
        </TextLayout>
    );
};

export default NoticePage;
