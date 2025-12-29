import React from 'react';
import { LoginNotice, User } from '../types';
import { Star, UserPlus, Info, CheckCircle } from 'lucide-react';
import { dbSupabase as db } from '../services/db_supabase';

interface LoginNoticeModalProps {
    user: User;
    onClose: (updatedUser: User) => void;
}

export const LoginNoticeModal: React.FC<LoginNoticeModalProps> = ({ user, onClose }) => {
    // Determine which notice to show (FIFO: First In First Out)
    const notice = user.loginNotices && user.loginNotices.length > 0 ? user.loginNotices[0] : null;

    if (!notice) return null;

    const handleConfirm = async () => {
        if (!user.id || !notice) return;

        try {
            // 1. Database: Remove the notice
            await db.removeLoginNotice(user.id, notice.id);

            // 2. Local State: Update user object with removed notice
            const updatedNotices = user.loginNotices?.filter(n => n.id !== notice.id) || [];
            const updatedUser = { ...user, loginNotices: updatedNotices };

            // 3. Callback to update App state (and potentially show next notice if loop handled in parent)
            onClose(updatedUser);

        } catch (e) {
            console.error("Failed to clear notice", e);
            // Even if DB fails, close modal to unblock user
            onClose(user);
        }
    };

    // Icon mapping
    const getIcon = () => {
        switch (notice.type) {
            case 'referral_success': return <UserPlus className="w-10 h-10 text-indigo-500" />;
            case 'level_up': return <Star className="w-10 h-10 text-amber-500" />;
            case 'admin_message': return <Info className="w-10 h-10 text-blue-500" />;
            default: return <CheckCircle className="w-10 h-10 text-green-500" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center transform transition-all scale-100 animate-in zoom-in-95 duration-200 border border-border dark:border-border-dark mb-[10vh]">

                {/* Decoration */}
                <div className="mx-auto w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mb-6 ring-4 ring-gray-50/50 dark:ring-gray-700/30">
                    {getIcon()}
                </div>

                <h3 className="font-black text-2xl mb-3 text-text-main dark:text-text-light leading-tight">
                    {notice.title}
                </h3>

                <p className="text-text-muted mb-8 whitespace-pre-wrap leading-relaxed text-base">
                    {notice.message}
                </p>

                <button
                    onClick={handleConfirm}
                    className="w-full py-4 bg-primary text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-[0.98]"
                >
                    확인했어요
                </button>

                {(user.loginNotices?.length || 0) > 1 && (
                    <div className="mt-4 text-xs text-text-muted font-medium">
                        +{user.loginNotices!.length - 1}개의 알림이 더 있습니다
                    </div>
                )}
            </div>
        </div>
    );
};
