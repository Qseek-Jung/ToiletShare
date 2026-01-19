import React, { useState } from 'react';
import { TextLayout } from '../components/TextLayout';
import { ArrowRight, Info, Building2, MapPin, Mail, MessageSquare } from 'lucide-react';
import { User, UserRole } from '../types';
import { APP_VERSION, LAST_UPDATE_DATE, UPDATE_NOTES, COMPANY_INFO } from '../constants/version';
import { ContactModal } from '../components/ContactModal';
import { dbSupabase as db } from '../services/db_supabase';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Bell, RefreshCw } from 'lucide-react';

interface AppInfoPageProps {
    user: User;
    onBack: () => void;
}

export const AppInfoPage: React.FC<AppInfoPageProps> = ({ user, onBack }) => {
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const [storeUrl, setStoreUrl] = useState<string>('');
    const [isChecking, setIsChecking] = useState(true);

    // Initial Version Check
    React.useEffect(() => {
        const checkUpdate = async () => {
            try {
                // 1. Get Latest Version from DB (Version Policy -> app_config)
                // This ensures we match what the Admin Panel sets (VersionManagement.tsx)
                const policy = await db.getVersionPolicy();
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

                const config = isIOS ? policy.ios : policy.android;

                setLatestVersion(config.latestVersion);
                setStoreUrl(config.storeUrl);
            } catch (e) {
                console.error("Failed to check version", e);
            } finally {
                setIsChecking(false);
            }
        };
        checkUpdate();
    }, []);

    const isUpdateAvailable = latestVersion && latestVersion !== APP_VERSION;
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    return (
        <TextLayout className="p-0 pb-20 relative bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100 dark:border-gray-700 shadow-sm">
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

                    <div className="flex flex-col items-center gap-2 mt-2">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">현재 버전: {APP_VERSION}</span>
                            {!isChecking && !isUpdateAvailable && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                    최신버전
                                </span>
                            )}
                        </div>

                        {/* Update Available UI */}
                        {!isChecking && isUpdateAvailable && (
                            <div className="flex flex-col items-center gap-2 mt-2 animate-in fade-in slide-in-from-bottom-2">
                                <span className="text-xs font-bold text-primary">
                                    새로운 버전({latestVersion})이 있습니다
                                </span>
                                <a
                                    href={storeUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`px-4 py-2 rounded-full font-bold text-sm text-white shadow-lg active:scale-95 transition-all flex items-center gap-2 ${isIOS ? 'bg-black hover:bg-gray-800' : 'bg-[#00897B] hover:bg-[#00796B]'
                                        }`}
                                >
                                    {isIOS ? (
                                        <>
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/6/67/App_Store_%28iOS%29.svg" className="w-4 h-4 invert" alt="Apple" />
                                            <span>App Store</span>
                                        </>
                                    ) : (
                                        <>
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/d/d0/Google_Play_Arrow_logo.svg" className="w-4 h-4" alt="Play Store" />
                                            <span>Google Play</span>
                                        </>
                                    )}
                                    <span>업데이트</span>
                                </a>
                            </div>
                        )}
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

                {/* Push Diagnostics (Visible for debugging) */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Bell className="w-5 h-5 text-orange-500" />
                        푸시 알림 진단
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">User ID</span>
                            <span className="font-mono text-xs">{user.id ? user.id.substring(0, 8) + '...' : 'Guest'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Local Token</span>
                            <span className={`font-bold ${localStorage.getItem('push_token') ? 'text-green-500' : 'text-red-500'}`}>
                                {localStorage.getItem('push_token') ? '발급됨 (OK)' : '없음 (Missing)'}
                            </span>
                        </div>

                        <button
                            onClick={async () => {
                                try {
                                    if (Capacitor.getPlatform() === 'web') {
                                        alert('웹에서는 동작하지 않습니다.');
                                        return;
                                    }
                                    const result = await PushNotifications.requestPermissions();
                                    if (result.receive === 'granted') {
                                        await PushNotifications.register();
                                        alert('재등록 요청을 보냈습니다. 잠시 후 다시 확인해주세요.');
                                    } else {
                                        alert('권한이 거부되었습니다. 설정에서 허용해주세요.');
                                    }
                                } catch (e) {
                                    alert('오류: ' + JSON.stringify(e));
                                }
                            }}
                            className="w-full mt-2 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <RefreshCw className="w-4 h-4" />
                            토큰 강제 재발급 (Resync)
                        </button>
                    </div>
                </div>

                <div className="text-center text-xs text-gray-400 py-4">
                    © {new Date().getFullYear()} {COMPANY_INFO.name}. All rights reserved.
                </div>
            </div>
        </TextLayout>
    );
};
