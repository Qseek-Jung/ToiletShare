import React from 'react';
import { X, AlertCircle, CheckCircle, Ban } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
    onConfirm?: () => void;
    isConfirm?: boolean; // Deprecated but kept for backward compatibility
    type?: 'success' | 'confirm' | 'error'; // New flexible type
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, message, onClose, onConfirm, isConfirm, type = 'success' }) => {
    if (!isOpen) return null;

    // Determine effective type
    const effectiveType = isConfirm ? 'confirm' : (type === 'error' ? 'error' : 'success');

    let icon = <CheckCircle className="w-6 h-6" />;
    let iconBg = 'bg-primary-50 text-primary';

    if (effectiveType === 'confirm') {
        icon = <AlertCircle className="w-6 h-6" />;
        iconBg = 'bg-amber-100 text-amber-500';
    } else if (effectiveType === 'error') {
        icon = <Ban className="w-6 h-6" />;
        iconBg = 'bg-red-100 text-red-500';
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative mb-[10vh]">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 ${iconBg}`}>
                        {icon}
                    </div>

                    <p className="text-gray-900 dark:text-white font-medium text-base mb-6 whitespace-pre-line leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-2 w-full">
                        {effectiveType === 'confirm' ? (
                            <>
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={() => {
                                        if (onConfirm) onConfirm();
                                        onClose();
                                    }}
                                    className="flex-1 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-600 transition-colors"
                                >
                                    확인
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={onClose}
                                className={`w-full py-3 rounded-xl font-bold text-white transition-colors ${effectiveType === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary-600'}`}
                            >
                                확인
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
