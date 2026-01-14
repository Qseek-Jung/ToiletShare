import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WithdrawalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWithdraw: (reason: string) => void;
}

export const WithdrawalModal: React.FC<WithdrawalModalProps> = ({ isOpen, onClose, onWithdraw }) => {
    const [selectedReason, setSelectedReason] = useState<string>('');
    const [otherReason, setOtherReason] = useState('');
    const [step, setStep] = useState<'reason' | 'confirm'>('reason');

    if (!isOpen) return null;

    const { t } = useTranslation();
    const reasons = [
        t('withdraw_reason_1', '앱을 더 이상 사용하지 않아요'),
        t('withdraw_reason_2', '오류가 많아서 사용하기 불편해요'),
        t('withdraw_reason_3', '등록된 화장실 정보가 부족해요'),
        t('withdraw_reason_4', '개인정보 보호가 우려돼요'),
        t('withdraw_reason_5', '새 계정으로 다시 가입하고 싶어요')
    ];

    const handleSubmit = () => {
        if (!selectedReason) {
            alert(t('withdraw_alert_reason', '탈퇴 사유를 선택해주세요.'));
            return;
        }

        const finalReason = selectedReason === t('withdraw_other', '기타') ? otherReason : selectedReason;
        if (selectedReason === t('withdraw_other', '기타') && !otherReason.trim()) {
            alert(t('withdraw_alert_other', '기타 사유를 입력해주세요.'));
            return;
        }

        onWithdraw(finalReason);
    };

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X className="w-6 h-6" />
                </button>

                {step === 'reason' && (
                    <div className="animate-in slide-in-from-right">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('withdraw_reason_title', '탈퇴 사유를 알려주세요')}</h3>
                        <p className="text-sm text-gray-500 mb-6">{t('withdraw_reason_desc', '더 나은 서비스를 만드는데 도움이 됩니다.')}</p>

                        <div className="space-y-3 mb-6 text-left">
                            {reasons.map((reason) => (
                                <label key={reason} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <input
                                        type="radio"
                                        name="withdrawalReason"
                                        value={reason}
                                        checked={selectedReason === reason}
                                        onChange={(e) => setSelectedReason(e.target.value)}
                                        className="w-4 h-4 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{reason}</span>
                                </label>
                            ))}
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <input
                                    type="radio"
                                    name="withdrawalReason"
                                    value={t('withdraw_other', '기타')}
                                    checked={selectedReason === t('withdraw_other', '기타')}
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    className="w-4 h-4 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{t('withdraw_other', '기타')}</span>
                            </label>
                            {selectedReason === t('withdraw_other', '기타') && (
                                <textarea
                                    className="w-full mt-2 p-3 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder={t('withdraw_reason_placeholder', '사유를 입력해주세요...')}
                                    rows={2}
                                    value={otherReason}
                                    onChange={(e) => setOtherReason(e.target.value)}
                                />
                            )}
                        </div>

                        <button
                            onClick={() => setStep('confirm')}
                            className="w-full py-3.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            {t('withdraw_next', '다음')}
                        </button>
                    </div>
                )}

                {step === 'confirm' && (
                    <div className="animate-in slide-in-from-right py-4">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('withdraw_confirm_title', '정말 떠나시나요?')}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('withdraw_confirm_desc', '탈퇴 시 모든 적립 포인트가 소멸되며<br />복구할 수 없습니다. 😢') }} />

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {t('cancel', '취소')}
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/30"
                            >
                                {t('withdraw_confirm_btn', '탈퇴하기')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
