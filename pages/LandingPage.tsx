import React, { useEffect, useState } from 'react';
import { Clipboard } from '@capacitor/clipboard';
import { Share2, Copy, CheckCircle, Smartphone, Download } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useTranslation } from 'react-i18next';

// Store Links
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.toiletshare.app'; // Update if needed
const APP_STORE_URL = 'https://apps.apple.com/app/id6740177708'; // Update if needed

export const LandingPage: React.FC = () => {
    const { t } = useTranslation();
    const [referralCode, setReferralCode] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        // Extract referral code from URL query param 'ref' or 'code'
        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref') || params.get('code');
        if (code) {
            setReferralCode(code);
        }
    }, []);

    const handleDownload = async (store: 'android' | 'ios') => {
        // 1. Copy Code to Clipboard (if exists)
        if (referralCode) {
            try {
                // Determine the correct raw value to copy
                // The app expects base64 or whatever format. 
                // We copy exactly what is in the URL.
                await Clipboard.write({
                    string: referralCode
                });
                console.log('Referral code copied:', referralCode);
                setCopied(true);
            } catch (e) {
                console.error('Clipboard write failed (might be browser restriction)', e);
                // Fallback for web: navigator.clipboard
                try {
                    await navigator.clipboard.writeText(referralCode);
                    setCopied(true);
                } catch (e2) {
                    console.error('Navigator clipboard failed', e2);
                }
            }
        }

        // 2. Redirect to Store
        // Small delay to ensure clipboard operation finishes (sometimes helps on mobile safari)
        setTimeout(() => {
            if (store === 'android') {
                window.location.href = PLAY_STORE_URL;
            } else {
                window.location.href = APP_STORE_URL;
            }
        }, 300);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-500 to-orange-600 flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl mix-blend-overlay animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-48 h-48 bg-yellow-300 rounded-full blur-3xl mix-blend-overlay animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">

                {/* Logo Area */}
                <div className="w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-6 transform rotate-3 hover:rotate-0 transition duration-300">
                    {/* Placeholder for App Logo - Using Text/Icon for now */}
                    <img src="/images/icons/icon-192x192.png" alt="App Icon" className="w-20 h-20 object-contain" onError={(e) => {
                        // Fallback if image missing
                        (e.target as HTMLImageElement).style.display = 'none';
                    }} />
                    <span className="text-4xl absolute opacity-0">💩</span>
                </div>

                <h1 className="text-3xl font-extrabold mb-2 drop-shadow-md">
                    대똥단결
                </h1>
                <p className="text-white/90 font-medium mb-8 text-lg">
                    급똥으로 대동단결! <br />
                    내 주변 무료 개방 화장실 찾기
                </p>

                {/* Referral Code Section */}
                {referralCode && (
                    <div className="w-full bg-black/20 rounded-xl p-4 mb-8 border border-white/10">
                        <p className="text-sm text-white/80 mb-2">친구가 초대했어요! 🎁</p>
                        <div className="flex items-center justify-between bg-white/90 rounded-lg p-3 text-gray-800 font-mono font-bold text-lg shadow-inner">
                            <span className="truncate flex-1 text-center select-all">
                                {referralCode.length > 10 ? referralCode.substring(0, 10) + '...' : referralCode}
                            </span>
                            {copied ? (
                                <CheckCircle className="w-5 h-5 text-green-600 ml-2" />
                            ) : (
                                <Copy className="w-5 h-5 text-gray-500 ml-2" />
                            )}
                        </div>
                        <p className="text-xs text-white/60 mt-2">
                            앱 설치 시 코드가 <strong>자동으로 입력</strong>됩니다!
                        </p>
                    </div>
                )}

                {/* Download Buttons */}
                <div className="w-full space-y-3">
                    <button
                        onClick={() => handleDownload('android')}
                        className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 transition shadow-lg transform active:scale-95"
                    >
                        <img src="/images/icons/google-play.svg" alt="" className="w-6 h-6" onError={(e) => (e.target as HTMLElement).style.display = 'none'} />
                        <span>Google Play 다운로드</span>
                    </button>

                    <button
                        onClick={() => handleDownload('ios')}
                        className="w-full py-4 bg-black/80 text-white rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-black/90 transition shadow-lg transform active:scale-95 border border-white/10"
                    >
                        <img src="/images/icons/apple.svg" alt="" className="w-6 h-6" onError={(e) => (e.target as HTMLElement).style.display = 'none'} />
                        <span>App Store 다운로드</span>
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 w-full">
                    <div className="flex justify-center gap-6 text-white/60">
                        <div className="flex flex-col items-center gap-1">
                            <Share2 className="w-6 h-6" />
                            <span className="text-xs">친구 초대</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Smartphone className="w-6 h-6" />
                            <span className="text-xs">간편 사용</span>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <Download className="w-6 h-6" />
                            <span className="text-xs">무료 다운</span>
                        </div>
                    </div>
                </div>

            </div>

            <footer className="absolute bottom-4 text-white/40 text-xs text-center">
                © 2024 QSeek. All rights reserved.
            </footer>
        </div>
    );
};
