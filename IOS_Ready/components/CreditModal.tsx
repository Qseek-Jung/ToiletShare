import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CreditModalProps {
    isOpen: boolean;
    type: 'earn' | 'deduct';
    amount: number;
    message: string;
    subMessage?: string;
    onClose: () => void;
}

export const CreditModal: React.FC<CreditModalProps> = ({ isOpen, type, amount, message, subMessage, onClose }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShow(true);
        } else {
            setTimeout(() => setShow(false), 200); // Wait for exit animation
        }
    }, [isOpen]);

    if (!isOpen && !show) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? 'bg-black/50 backdrop-blur-sm opacity-100' : 'bg-black/0 backdrop-blur-none opacity-0 pointer-events-none'}`}>
            <div className={`bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-8 shadow-2xl transform transition-all duration-300 relative overflow-hidden mb-[10vh] ${isOpen ? 'scale-100 zoom-in-95' : 'scale-90 zoom-out-95 opacity-0'}`}>

                {/* Confetti Background Effect */}
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <circle cx="20" cy="20" r="5" fill="#FBBF24" />
                        <circle cx="80" cy="30" r="7" fill="#3B82F6" />
                        <rect x="40" y="60" width="8" height="8" fill="#EF4444" transform="rotate(45 44 64)" />
                    </svg>
                </div>

                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner">
                        <span className="text-4xl">{type === 'earn' ? '🎁' : '💸'}</span>
                    </div>

                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">{message}</h3>
                    {subMessage && <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{subMessage}</p>}

                    <div className={`text-3xl font-bold mb-6 flex items-center gap-1 ${type === 'earn' ? 'text-amber-500' : 'text-gray-500'}`}>
                        {type === 'earn' ? t('credit_earn', '+') : ''}{amount} <span className="text-lg text-gray-400 font-medium">{t('credit_unit', '크래딧')}</span>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-amber-500 transition-colors"
                    >
                        {t('credit_confirm', '확인')}
                    </button>
                </div>
            </div>
        </div>
    );
};
