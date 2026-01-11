import React, { useEffect, useState, useRef } from 'react';
import { adMobService } from '../services/admob';
import { X } from 'lucide-react';
import { dbSupabase } from '../services/db_supabase';

// Helper for YouTube API
declare global {
    interface Window {
        YT: any;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface AdManagerProps {
    isOpen: boolean;
    onClose: () => void; // Called when ad is finished/skipped/closed
    onReward?: () => void; // Only for Rewarded Ads
    adType?: 'reward' | 'interstitial';
}

export const AdManager: React.FC<AdManagerProps> = ({ isOpen, onClose, onReward, adType = 'reward' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showYoutube, setShowYoutube] = useState(false);
    const [videoId, setVideoId] = useState<string | null>(null);
    const [canClose, setCanClose] = useState(false);
    const [timeLeft, setTimeLeft] = useState(adType === 'interstitial' ? 5 : 15);
    // Track actual playing state for accurate timing
    const [isPlaying, setIsPlaying] = useState(false);

    const initialTimeRef = useRef(adType === 'interstitial' ? 5 : 15);
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            const duration = adType === 'interstitial' ? 5 : 15;
            setIsLoading(true);
            setShowYoutube(false);
            setCanClose(false);
            setTimeLeft(duration);
            setIsPlaying(false);
            initialTimeRef.current = duration;
            setVideoId(null);

            runAdLogic();
        } else {
            // Cleanup on close
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) { /* ignore */ }
                playerRef.current = null;
            }
        }
    }, [isOpen, adType]);

    // Timer logic: Only tick when video is actually playing
    useEffect(() => {
        let timer: any;
        // Only count down if shown, video is playing, and time remains
        if (showYoutube && isPlaying && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => prev - 1);
            }, 1000);
        } else if (showYoutube && timeLeft === 0) {
            setCanClose(true);
        }
        return () => clearInterval(timer);
    }, [showYoutube, isPlaying, timeLeft]);

    const runAdLogic = async () => {
        try {
            const config = await dbSupabase.getAdConfig();
            const source = config.interstitialSource || 'admob';

            if (source === 'youtube') {
                const validUrls = config.youtubeUrls?.filter(u => u && u.trim().length > 0) || [];
                const url = validUrls.length > 0 ? validUrls[Math.floor(Math.random() * validUrls.length)] : null;

                if (url) {
                    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
                    const match = url.match(regExp);
                    const vId = (match && match[2].length === 11) ? match[2] : null;

                    if (vId) {
                        setVideoId(vId);
                        setShowYoutube(true);
                        setIsLoading(false);
                        // Initialize player logic is handled by effect dependent on videoId
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
                const result = await adMobService.showRewardVideo();
                if (result && onReward) onReward();
            } else {
                await adMobService.showInterstitial();
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

    // Load YouTube API and Initialize Player
    useEffect(() => {
        if (!showYoutube || !videoId) return;

        let safetyTimer: NodeJS.Timeout;

        const initPlayer = () => {
            if (!containerRef.current) return;

            // If API not loaded
            if (!window.YT) {
                const tag = document.createElement('script');
                tag.src = "https://www.youtube.com/iframe_api";
                const firstScriptTag = document.getElementsByTagName('script')[0];
                firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

                window.onYouTubeIframeAPIReady = () => {
                    createPlayer(videoId);
                };
            } else {
                createPlayer(videoId);
            }
        };

        const createPlayer = (id: string) => {
            // Avoid duplicates
            if (playerRef.current) return;

            // The API replaces the node with iframe, so we need a stable ref target
            playerRef.current = new window.YT.Player('youtube-player-container', {
                height: '100%',
                width: '100%',
                videoId: id,
                playerVars: {
                    'autoplay': 1, // Auto play
                    'controls': 0, // No controls
                    'disablekb': 1,
                    'fs': 0,
                    'monitor': 0, // deprecate modestbranding?
                    'modestbranding': 1,
                    'playsinline': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'origin': window.location.origin
                },
                events: {
                    'onReady': (event: any) => {
                        event.target.playVideo();
                    },
                    'onStateChange': (event: any) => {
                        // YT.PlayerState.PLAYING = 1
                        if (event.data === 1) {
                            setIsPlaying(true);
                            // Clear safety timer if playing successfully
                            if (safetyTimer) clearTimeout(safetyTimer);
                        } else {
                            // Pause timer if buffering or paused
                            setIsPlaying(false);
                            // Ended = 0
                            if (event.data === 0) {
                                setCanClose(true);
                            }
                        }
                    },
                    'onError': (e: any) => {
                        console.error("YT Player Error", e);
                        // Fallback logic if video fails to play?
                        // Just allow close after safety timeout?
                        setCanClose(true);
                    }
                }
            });
        };

        initPlayer();

        // Safety timeout: if player API completely fails or blocked, enable close after duration + buffer
        // Default buffer 10s
        const safetyDuration = (adType === 'interstitial' ? 5 : 15) * 1000 + 10000;

        safetyTimer = setTimeout(() => {
            // Check ref or state? State is captured in closure, so check ref if needed or rely on cleanup
            // Actually, if we clear safetyTimer in onStateChange, this callback won't run if playing.
            // If it DOES run, it means we never started playing (stuck).
            console.warn("Ad Safety Timer Triggered", videoId);
            setCanClose(true);
        }, safetyDuration);

        return () => clearTimeout(safetyTimer);
    }, [showYoutube, videoId]);


    if (!isOpen) return null;

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
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-green-500/30 animate-in slide-in-from-top-4 duration-300 pointer-events-auto cursor-pointer"
                        >
                            <span className="text-sm font-black">{adType === 'reward' ? '리워드 지급됨' : '닫기'}</span>
                            <div className="w-px h-3 bg-white/30 mx-1" />
                            <X className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
                            <span className="text-white text-sm font-black tabular-nums">{timeLeft}</span>
                            <div className="w-px h-3 bg-white/20" />
                            <span className="text-white/70 text-xs font-medium">
                                {!isPlaying ? "로딩/대기 중..." : "광고 중..."}
                            </span>
                        </div>
                    )}
                </div>

                {/* Full Width Video Container */}
                <div className="w-full h-full flex items-center justify-center relative">
                    <div ref={containerRef} className="w-full aspect-[9/16] bg-black relative overflow-hidden flex items-center justify-center">
                        {/* The Player API will replace this div with the iframe */}
                        <div id="youtube-player-container" className="w-full h-full absolute inset-0"></div>

                        {!isPlaying && !canClose && (
                            <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}

                        {/* Progress Bar (Bottom of Video Frame) */}
                        {!canClose && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-50">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${((initialTimeRef.current - timeLeft) / initialTimeRef.current) * 100}%` }}
                                />
                            </div>
                        )}

                        {/* Overlay to block clicks on video (optional, but good for Ad feel) */}
                        <div className="absolute inset-0 z-10 bg-transparent" />
                    </div>
                </div>
            </div>
        </div>
    );
};
