import React, { useState } from 'react';
import { HelpCircle, X, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { User } from '../types';
import emailjs from '@emailjs/browser';
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || "";
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || "";
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || "";
import { useTranslation } from 'react-i18next';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose, user }) => {
    const { t } = useTranslation();
    const [inquiryType, setInquiryType] = useState('服务오류'); // Default set to translated value later or key, better to use internal key then display label
    // Actually, converting state to English key is better, but let's stick to simple replacement for valid labels if possible.
    // However, existing code uses this literal state. Let's initialize with the KEY and use translation for checking/displaying.
    // Or just translate the DISPLAY logic.
    const [inquiryTypeState, setInquiryTypeState] = useState('contact_type_error'); // Use keys internally if possible, but minimal change:

    // Minimal change: keep state as is but Initialize with a value that makes sense?
    // The previous code had hardcoded Korean in state. Let's switch to using keys for state to be safe across languages.
    // BUT emailjs might expect readable strings. I should translate them before sending if needed, or send keys.
    // Let's assume we want to send readable string to email.
    // I will stick to the previous pattern: translate the OPTIONS.
    const typeOptions = [
        { key: 'contact_type_error', label: t('contact_type_error', '서비스오류') },
        { key: 'contact_type_partner', label: t('contact_type_partner', '제휴문의') },
        { key: 'contact_type_ad', label: t('contact_type_ad', '광고문의') },
        { key: 'contact_type_other', label: t('contact_type_other', '기타문의') }
    ];
    // use the first option's label as default? or key?
    // Let's use the LABEL as the state value so it shows up in the UI and Email correctly translated (if the user sends it).
    // Actually, if I change language, the state might remain in old language.
    // Better to store KEY in state and translate on render/send.
    // Refactoring state to use keys:
    const [selectedTypeKey, setSelectedTypeKey] = useState('contact_type_error');
    const [contact, setContact] = useState('');
    const [inquiryContent, setInquiryContent] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    const handleSendInquiry = async () => {
        if (!contact.trim() || !inquiryContent.trim()) {
            alert(t('contact_alert_input', '연락처와 내용을 모두 입력해주세요.'));
            return;
        }

        setIsSending(true);

        try {
            await emailjs.send(
                EMAILJS_SERVICE_ID,
                EMAILJS_TEMPLATE_ID,
                {
                    from_name: user.nickname || '익명 사용자',
                    from_email: user.email,
                    reply_to: contact,
                    message: inquiryContent,
                    type: t(selectedTypeKey as any) // Translate key to string for email
                },
                EMAILJS_PUBLIC_KEY
            );
            setShowSuccessModal(true);
            setContact('');
            setInquiryContent('');
            // Don't close immediately, let user see success modal
        } catch (error) {
            console.error('EmailJS Error:', error);
            setShowErrorModal(true);
        } finally {
            setIsSending(false);
        }
    };

    const handleSuccessClose = () => {
        setShowSuccessModal(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[3000] flex items-center justify-center p-4 backdrop-blur-sm">
            {!showSuccessModal && !showErrorModal && (
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                        <h3 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                            <HelpCircle className="w-5 h-5 text-primary" />
                            {t('contact_title', '문의하기')}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full">
                            <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        </button>
                    </div>
                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div>
                            <label className="block text-sm font-bold mb-3 dark:text-gray-300">{t('contact_type_label', '문의 유형')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                {typeOptions.map((opt) => (
                                    <button
                                        key={opt.key}
                                        onClick={() => setSelectedTypeKey(opt.key)}
                                        className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${selectedTypeKey === opt.key
                                            ? 'bg-primary text-white shadow-md scale-[1.02]'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">{t('contact_info_label', '연락처')} <span className="text-gray-400 font-normal text-xs">{t('contact_info_hint', '(답변 받을 곳)')}</span></label>
                            <input
                                type="text"
                                value={contact}
                                onChange={(e) => setContact(e.target.value)}
                                placeholder={t('contact_info_placeholder', '전화번호 또는 이메일')}
                                className="w-full p-4 border dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold mb-2 dark:text-gray-300">{t('contact_content_label', '문의 내용')}</label>
                            <textarea
                                value={inquiryContent}
                                onChange={(e) => setInquiryContent(e.target.value)}
                                placeholder={t('contact_content_placeholder', '내용을 자세히 적어주시면 빠르게 확인할 수 있습니다.')}
                                className="w-full p-4 border dark:border-gray-600 rounded-xl h-40 resize-none bg-gray-50 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-800">
                        <button
                            onClick={handleSendInquiry}
                            disabled={isSending}
                            className={`w-full py-4 bg-primary text-white text-lg rounded-2xl font-bold shadow-lg hover:bg-primary/90 flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isSending ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    {t('contact_sending', '전송 중...')}
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    {t('contact_send', '문의 보내기')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Success View (Replaces content or separate modal? MyPage had separate. Let's keep it clean here) */}
            {showSuccessModal && (
                <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200 z-[3010]">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 dark:text-white">{t('contact_success_title', '전송 완료!')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm" dangerouslySetInnerHTML={{ __html: t('contact_success_desc', '관리자에게 메일이<br />잘 전송되었습니다.') }} />
                    <button
                        onClick={handleSuccessClose}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold"
                    >
                        {t('confirm', '확인')}
                    </button>
                </div>
            )}

            {/* Error View */}
            {showErrorModal && (
                <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl shadow-xl p-6 text-center animate-in fade-in zoom-in duration-200 z-[3010]">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 dark:text-white">{t('contact_fail_title', '전송 실패')}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm" dangerouslySetInnerHTML={{ __html: t('contact_fail_desc', '메일 시스템 오류가 발생했습니다.<br /><span className="font-bold select-all text-gray-800 dark:text-white">qseek77@gmail.com</span>으로<br />직접 문의 부탁드립니다.') }} />

                    <button
                        onClick={() => setShowErrorModal(false)}
                        className="w-full py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold"
                    >
                        {t('contact_close', '닫기')}
                    </button>
                </div>
            )}
        </div>
    );
};
