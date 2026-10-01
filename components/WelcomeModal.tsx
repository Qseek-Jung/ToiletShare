import React from 'react';
import { X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';

interface WelcomeModalProps {
    open: boolean;
    onClose: () => void;
}

export function WelcomeModal({ open, onClose }: WelcomeModalProps) {
    const { t } = useTranslation();
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-surface dark:bg-surface-dark rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 ring-1 ring-border/50 relative max-h-[85vh] overflow-y-auto no-scrollbar">

                {/* Close Button (Optional, provided via main button too) */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-text-muted" />
                </button>

                {/* Hero Image Section Removed */}
                <div className="pt-8"></div>

                {/* Content Section */}
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-black text-text-main dark:text-text-light mb-2 tracking-tight" dangerouslySetInnerHTML={{ __html: t('welcome_title', '대똥단결에 오신걸<br />환영합니다! 🎉') }}>
                    </h2>

                    <p className="text-sm text-primary-600 dark:text-primary-400 font-bold mb-4">
                        {t('welcome_subtitle', '"이곳은 급할 나를 위한 정보공유앱 입니다."')}
                    </p>

                    <div className="text-text-muted text-sm leading-relaxed mb-8 space-y-1">
                        <p dangerouslySetInnerHTML={{ __html: t('welcome_bonus', '가입축하 뽀나스 <span className="text-urgency font-bold">50 크레딧</span> 드려요.') }} />
                        <p>{t('welcome_msg_1', '급똥에 대비 잘 하시고,')}</p>
                        <p>{t('welcome_msg_2', '우리 서로 한 번씩만 도와보아요~')}</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 bg-primary hover:bg-primary-500 text-white rounded-2xl font-bold text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span>{t('welcome_btn', '서로 돕겠습니다 🤝')}</span>
                    </button>
                    <div className="h-4"></div>
                </div>
                {/* Native App Branding */}
                {Capacitor.isNativePlatform() && (
                    <div className="pb-10 mb-2 text-center">
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">
                            Powered by Q
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
