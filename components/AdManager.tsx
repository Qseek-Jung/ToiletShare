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
    triggerType?: 'unlock' | 'point' | 'navigation'; // New Trigger Type
}

export const AdManager: React.FC<AdManagerProps> = ({ isOpen, onClose, onReward, adType = 'reward', triggerType = 'unlock' }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [showYoutube, setShowYoutube] = useState(false);
    const [canClose, setCanClose] = useState(false);

    // Duration Logic
    const [targetDuration, setTargetDuration] = useState(15);
    const [timeLeft, setTimeLeft] = useState(15);

    // Track actual playing state for accurate timing
    const [isPlaying, setIsPlaying] = useState(false);

    // Playlist State
    const [playlistIds, setPlaylistIds] = useState<string[]>([]);

    // Config State
    const [config, setConfig] = useState<any>(null);

    const initialTimeRef = useRef(15);
    const timeLeftRef = useRef(15);
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playlistIdsRef = useRef<string[]>([]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setShowYoutube(false);
            setCanClose(false);
            setIsPlaying(false);
            setPlaylistIds([]);

            // Refs RESET
            playlistIdsRef.current = [];
            playerRef.current = null; // Ensure new player is created for cleaner state

            // Load Config & Start
            loadAdConfig();
        } else {
            // Cleanup on close
            if (playerRef.current) {
                try {
                    playerRef.current.destroy();
                } catch (e) { /* ignore */ }
                playerRef.current = null;
            }
        }
    }, [isOpen]);

    // Timer logic (Independent of Video End)
    useEffect(() => {
        let timer: any;
        if (showYoutube && isPlaying && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    timeLeftRef.current = next; // Sync Ref
                    return next;
                });
            }, 1000);
        } else if (showYoutube && timeLeft <= 0) {
            setCanClose(true);
        }
        return () => clearInterval(timer);
    }, [showYoutube, isPlaying, timeLeft]);

    const extractVideoId = (urlOrId: string): string | null => {
        if (!urlOrId) return null;
        const clean = urlOrId.trim();
        if (clean.length === 0) return null;

        // 1. Try Raw ID (11 chars)
        if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
            return clean;
        }

        // 2. Try Standard/Share/Embed Regex
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = clean.match(regExp);
        if (match && match[2].length === 11) {
            return match[2];
        }

        // 3. Try Shorts Regex
        const shortsRegExp = /^.*(youtube.com\/shorts\/)([^#&?]*).*/;
        const shortsMatch = clean.match(shortsRegExp);
        if (shortsMatch && shortsMatch[2].length === 11) {
            return shortsMatch[2];
        }

        return null;
    };

    const loadAdConfig = async () => {
        try {
            const cfg = await dbSupabase.getAdConfig();
            setConfig(cfg);

            // Determine Duration
            let duration = 15; // Default
            if (triggerType === 'unlock') duration = cfg.durationUnlock || 15;
            else if (triggerType === 'point') duration = cfg.durationPoint || 15;
            else if (triggerType === 'navigation') duration = cfg.durationNavigation || 5;

            setTargetDuration(duration);
            setTimeLeft(duration);
            initialTimeRef.current = duration;
            timeLeftRef.current = duration;

            const source = cfg.interstitialSource || 'admob';

            if (source === 'youtube') {
                const rawUrls = cfg.youtubeUrls || [];
                // Extract IDs
                const ids: string[] = [];
                rawUrls.forEach((url: string) => {
                    const extracted = extractVideoId(url);
                    if (extracted) ids.push(extracted);
                });

                if (ids.length > 0) {
                    // Start Playlist Logic
                    const shuffled = [...ids].sort(() => Math.random() - 0.5);
                    setPlaylistIds(shuffled);
                    playlistIdsRef.current = shuffled;

                    setShowYoutube(true);
                    setIsLoading(false);
                    // Player creation handled by useEffect[showYoutube]
                } else {
                    handleAdMobFallback(cfg.testMode);
                }
            } else {
                handleAdMobFallback(cfg.testMode);
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
        if (!showYoutube || playlistIds.length === 0) return;

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
                    createPlayer(playlistIds);
                };
            } else {
                createPlayer(playlistIds);
            }
        };

        const createPlayer = (ids: string[]) => {
            if (playerRef.current) return;

            playerRef.current = new window.YT.Player('youtube-player-container', {
                height: '100%',
                width: '100%',
                // loadPlaylist via playerVars logic or directly? 
                // Best practice: init without videoId, then loadPlaylist.
                // Or use loadPlaylist in onReady.
                playerVars: {
                    'autoplay': 1,
                    'mute': 1, // Required for iOS autoplay
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'modestbranding': 1,
                    'playsinline': 1,
                    'rel': 0,
                    'showinfo': 0, // Deprecated but kept for older API compat
                    'iv_load_policy': 3, // Hide annotations
                },
                events: {
                    'onReady': (event: any) => {
                        // Load Playlist
                        event.target.loadPlaylist({
                            playlist: ids,
                            index: 0,
                            startSeconds: 0
                        });
                        event.target.setLoop(true); // Enable Infinite Loop
                        // Unmute after playback starts (for better UX on iOS)
                        setTimeout(() => {
                            try {
                                event.target.unMute();
                                event.target.setVolume(100);
                            } catch (e) { /* iOS may block this */ }
                        }, 500);
                    },
                    'onStateChange': (event: any) => {
                        // PLAYING = 1
                        if (event.data === 1) {
                            setIsPlaying(true);
                            if (safetyTimer) clearTimeout(safetyTimer);
                        }
                        // ENDED = 0
                        else if (event.data === 0) {
                            // Video ended. 
                            // Since setLoop(true) is on, it should auto-play next.
                            // We do NOT need manual logic here.
                            // Just check if we can close? 
                            // Timer is independent, so no action needed here except maybe logging.
                            console.log("Video Ended. Loop should continue.");
                        }
                        else {
                            // Paused/Buffering
                            setIsPlaying(false);
                        }
                    },
                    'onError': (e: any) => {
                        console.error("YT Player Error", e);
                        // Fallback to AdMob if YouTube fails
                        handleAdMobFallback(config?.testMode);
                    }
                }
            });
        };

        initPlayer();

        // Safety timeout (Total Duration + 15s buffer)
        const safetyDuration = (targetDuration * 1000) + 15000;
        safetyTimer = setTimeout(() => {
            console.warn("Ad Safety Timer Triggered");
            setCanClose(true);
        }, safetyDuration);

        return () => clearTimeout(safetyTimer);
    }, [showYoutube, playlistIds]);

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
                    <div ref={containerRef} className="w-full h-full bg-black relative flex items-center justify-center">
                        {/* YouTube Player: Fit-to-Width (contained) */}
                        <div id="youtube-player-container" className="w-full aspect-video pointer-events-auto"></div>

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
