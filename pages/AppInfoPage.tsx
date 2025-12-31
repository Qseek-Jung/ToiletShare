import React, { useState } from 'react';
import { PageLayout } from '../components/PageLayout';
import { ArrowRight, Info, Building2, MapPin, Mail, MessageSquare } from 'lucide-react';
import { User, UserRole } from '../types';
import { APP_VERSION, LAST_UPDATE_DATE, UPDATE_NOTES, COMPANY_INFO } from '../constants/version';
import { ContactModal } from '../components/ContactModal';

interface AppInfoPageProps {
    user: User;
    onBack: () => void;
}

export const AppInfoPage: React.FC<AppInfoPageProps> = ({ user, onBack }) => {
    const [showContactModal, setShowContactModal] = useState(false);

    return (
        <PageLayout className="p-0 pb-20 relative bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100 dark:border-gray-700 shadow-sm">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">앱 정보</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Logo & Version */}
                <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-4 mb-4 flex items-center justify-center ring-1 ring-gray-100 dark:ring-gray-700">
                        <img src="/images/app/ddong-icon.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-2xl font-black text-primary mb-1">대똥단결</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">Version {APP_VERSION}</span>
                        <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-full">
                            Latest
                        </span>
                    </div>
                </div>

                {/* Release Notes */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Info className="w-5 h-5 text-primary" />
                        최근 업데이트 ({LAST_UPDATE_DATE})
                    </h3>
                    <ul className="space-y-3">
                        {UPDATE_NOTES.map((note, index) => (
                            <li key={index} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                                {note}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Company Info */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Building2 className="w-5 h-5 text-gray-400" />
                        개발사 정보
                    </h3>
                    <div className="space-y-4 text-sm">
                        <div className="flex items-start gap-3">
                            <Building2 className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div>
                                <div className="font-bold text-gray-900 dark:text-white mb-0.5">{COMPANY_INFO.name}</div>
                                {/* <div className="text-gray-500">사업자 등록번호: 000-00-00000</div> */}
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {COMPANY_INFO.address}
                            </div>
                        </div>
                        {/* <div className="flex items-start gap-3">
                            <Mail className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                            <div className="text-gray-600 dark:text-gray-300">
                                {COMPANY_INFO.contactEmail}
                            </div>
                        </div> */}
                    </div>

                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="w-full py-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-600"
                        >
                            <MessageSquare className="w-5 h-5 text-primary" />
                            문의하기
                        </button>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-400 py-4">
                    © {new Date().getFullYear()} {COMPANY_INFO.name} All rights reserved.
                </div>
            </div>

            {/* Contact Modal */}
            <ContactModal
                isOpen={showContactModal}
                onClose={() => setShowContactModal(false)}
                user={user}
            />
        </PageLayout>
    );
};
