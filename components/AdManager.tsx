import React, { useEffect, useState, useRef } from 'react';
import { adMobService } from '../services/admob';
import { X, ExternalLink } from 'lucide-react';
import { dbSupabase } from '../services/db_supabase';

interface AdManagerProps {
    isOpen: boolean;
    onClose: () => void; // Called when ad is finished/skipped/closed
    onReward?: () => void; // Only for Rewarded Ads
    adType?: 'reward' | 'interstitial';
}

export const AdManager: React.FC<AdManagerProps> = ({ isOpen, onClose, onReward, adType = 'reward' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showYoutube, setShowYoutube] = useState(false);
    const [youtubeUrl, setYoutubeUrl] = useState<string | null>(null);
    const [canClose, setCanClose] = useState(false);
    const [timeLeft, setTimeLeft] = useState(adType === 'interstitial' ? 5 : 15);
    const initialTimeRef = useRef(adType === 'interstitial' ? 5 : 15);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            const duration = adType === 'interstitial' ? 5 : 15;
            setIsLoading(true);
            setShowYoutube(false);
            setCanClose(false);
            setTimeLeft(duration);
            initialTimeRef.current = duration;
            setYoutubeUrl(null);

            runAdLogic();
        }
    }, [isOpen, adType]);

    // Timer for YouTube Interstitial
    useEffect(() => {
        let timer: any;
        if (showYoutube && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (showYoutube && timeLeft === 0) {
            setCanClose(true);
        }
        return () => clearInterval(timer);
    }, [showYoutube, timeLeft]);

    const runAdLogic = async () => {
        try {
            const config = await dbSupabase.getAdConfig();
            const source = config.interstitialSource || 'admob';

            if (source === 'youtube') {
                const validUrls = config.youtubeUrls?.filter(u => u && u.trim().length > 0) || [];
                const url = validUrls.length > 0 ? validUrls[Math.floor(Math.random() * validUrls.length)] : null;

                if (url) {
                    // Robust YouTube ID extraction
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
                    const match = url.match(regExp);
                    const vId = (match && match[2].length === 11) ? match[2] : null;

                    if (vId) {
                        // Use youtube-nocookie for maximum compatibility and to avoid some redirect issues
                        const embedUrl = `https://www.youtube-nocookie.com/embed/${vId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0&iv_load_policy=3&widget_referrer=${encodeURIComponent(window.location.href)}`;
                        setYoutubeUrl(embedUrl);
                        setShowYoutube(true);
                        setIsLoading(false);
                    } else {
                        console.warn("YouTube ID extraction failed for URL:", url);
                        handleAdMobFallback(config.testMode);
                    }
                } else {
                    handleAdMobFallback(config.testMode);
                }
            } else {
                handleAdMobFallback(config.testMode);
            }
        } catch (e) {
            console.error("Ad Decision Failed", e);
            onClose();
        }
    };

    const handleAdMobFallback = async (testMode: boolean) => {
        try {
            if (adType === 'reward') {
                const result = await adMobService.showRewardVideo(testMode);
                if (result && onReward) onReward();
            } else {
                await adMobService.showInterstitial(testMode);
            }
        } catch (error) {
            console.error("AdMob Playback Failed:", error);
        } finally {
            onClose();
        }
    };

    const handleYoutubeClose = () => {
        if (onReward) onReward();
        onClose();
    };

    if (!isOpen) return null;

    // Loading State (Spinner) - show clearly while decisions are being made
    if (isLoading) {
        return (
            <div className="fixed inset-0 z-[3000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="text-white text-center">
                    <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mx-auto mb-4 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    <p className="text-sm font-medium text-white/70 animate-pulse">잠시만 기다려주세요...</p>
                </div>
            </div>
        );
    }

    // fallback if no youtube but loading finished (shouldn't happen with the fallbacks above)
    if (!showYoutube) return null;

    return (
        <div className="fixed inset-0 z-[3000] bg-black flex flex-col items-center justify-center font-sans">
            <div className="w-full h-full max-w-md bg-black relative flex flex-col items-center justify-center overflow-hidden">

                {/* Header: Action & Status */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-[60]">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white/90 text-[11px] font-bold tracking-tight uppercase">Sponsored</span>
                    </div>

                    {canClose ? (
                        <button
                            onClick={handleYoutubeClose}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-green-500/30 animate-in slide-in-from-top-4 duration-300"
                        >
                            <span className="text-sm font-black">{adType === 'reward' ? '리워드 지급됨' : '닫기'}</span>
                            <div className="w-px h-3 bg-white/30 mx-1" />
                            <X className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                            <span className="text-white text-sm font-black tabular-nums">{timeLeft}</span>
                            <div className="w-px h-3 bg-white/20" />
                            <span className="text-white/70 text-xs font-medium">광고 중...</span>
                        </div>
                    )}
                </div>

                {/* Full Width Video Container */}
                <div className="w-full h-full flex items-center justify-center relative">
                    <div className="w-full aspect-[9/16] bg-black relative overflow-hidden">
                        <iframe
                            key={youtubeUrl}
                            src={youtubeUrl || undefined}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            frameBorder="0"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        ></iframe>

                        {/* Progress Bar (Bottom of Video Frame) */}
                        {!canClose && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-50">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${((initialTimeRef.current - timeLeft) / initialTimeRef.current) * 100}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
