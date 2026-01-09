import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { AppNotice } from '../types';
import { formatDistanceToNow } from '../utils';

interface NoticeDetailModalProps {
    notice: AppNotice;
    onClose: () => void;
}

export const NoticeDetailModal: React.FC<NoticeDetailModalProps> = ({ notice, onClose }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Function to handle image clicks for gallery view
    const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'IMG') {
            setSelectedImage((target as HTMLImageElement).src);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <h2 className="text-lg font-bold truncate pr-4 text-gray-900 dark:text-white">공지사항</h2>
                <button
                    onClick={onClose}
                    className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
                <div className="max-w-3xl mx-auto">
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
                        className="prose prose-lg dark:prose-invert max-w-none prose-img:rounded-xl prose-img:shadow-md prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-headings:font-bold"
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
        </div>
    );
};
