import React from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

interface AlertModalProps {
    isOpen: boolean;
    message: string;
    onClose: () => void;
    onConfirm?: () => void; // If provided, shows "Cancel/Confirm" buttons
    isConfirm?: boolean;    // Distinct mode for confirmation dialogs
}

export const AlertModal: React.FC<AlertModalProps> = ({ isOpen, message, onClose, onConfirm, isConfirm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xs p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative mb-[10vh]">
                <div className="flex flex-col items-center text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isConfirm ? 'bg-amber-100 text-amber-500' : 'bg-primary-50 text-primary'}`}>
                        {isConfirm ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                    </div>

                    <p className="text-gray-900 dark:text-white font-medium text-base mb-6 whitespace-pre-line leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-2 w-full">
                        {isConfirm ? (
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
                                className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-600 transition-colors"
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
