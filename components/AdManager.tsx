import React, { useEffect, useState, useRef } from 'react';
import { adMobService } from '../services/admob';
import { X } from 'lucide-react';
import { dbSupabase } from '../services/db_supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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
    const [showMP4, setShowMP4] = useState(false); // NEW: iOS MP4 player
    const [canClose, setCanClose] = useState(false);

    // Duration Logic
    const [targetDuration, setTargetDuration] = useState(15);
    const [timeLeft, setTimeLeft] = useState(15);

    // Track actual playing state for accurate timing
    const [isPlaying, setIsPlaying] = useState(false);

    // Playlist State
    const [playlistIds, setPlaylistIds] = useState<string[]>([]);
    const [clickUrls, setClickUrls] = useState<string[]>([]); // NEW: Click-through URLs
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0); // NEW: Current video in playlist

    // Config State
    const [config, setConfig] = useState<any>(null);

    const initialTimeRef = useRef(15);
    const timeLeftRef = useRef(15);
    const playerRef = useRef<any>(null);
    const videoRef = useRef<HTMLVideoElement>(null); // NEW: MP4 video element
    const containerRef = useRef<HTMLDivElement>(null);
    const playlistIdsRef = useRef<string[]>([]);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setShowYoutube(false);
            setShowMP4(false);
            setCanClose(false);
            setIsPlaying(false);
            setPlaylistIds([]);
            setClickUrls([]);
            setCurrentVideoIndex(0);

            // Refs RESET
            playlistIdsRef.current = [];
            playerRef.current = null;
            if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.src = '';
            }

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

    // Timer logic - YouTube
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

    // Timer logic - MP4 (iOS)
    useEffect(() => {
        let timer: any;
        if (showMP4 && isPlaying && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    timeLeftRef.current = next;
                    return next;
                });
            }, 1000);
        } else if (showMP4 && timeLeft <= 0) {
            setCanClose(true);
        }
        return () => clearInterval(timer);
    }, [showMP4, isPlaying, timeLeft]);

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

            const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
            const source = cfg.interstitialSource || 'admob';

            // Determine platform-specific config
            let platformConfig: { urls: string[], clicks: string[], duration: number } | null = null;

            if (source === 'youtube') {
                if (platform === 'ios') {
                    // iOS: Use MP4 videos
                    const ios = cfg.interstitialIOS || { videoUrls: [], clickUrls: [], durationUnlock: 15, durationPoint: 15, durationNavigation: 5 };
                    const duration = triggerType === 'unlock' ? (ios.durationUnlock || 15) :
                        triggerType === 'point' ? (ios.durationPoint || 15) :
                            (ios.durationNavigation || 5);
                    platformConfig = {
                        urls: ios.videoUrls || [],
                        clicks: ios.clickUrls || [],
                        duration
                    };
                } else {
                    // Android/Web: Use YouTube
                    const android = cfg.interstitialAndroid || { youtubeUrls: cfg.youtubeUrls || [], clickUrls: [], durationUnlock: 15, durationPoint: 15, durationNavigation: 5 };
                    const duration = triggerType === 'unlock' ? (android.durationUnlock || cfg.durationUnlock || 15) :
                        triggerType === 'point' ? (android.durationPoint || cfg.durationPoint || 15) :
                            (android.durationNavigation || cfg.durationNavigation || 5);

                    // Extract YouTube IDs
                    const ids: string[] = [];
                    (android.youtubeUrls || []).forEach((url: string) => {
                        const extracted = extractVideoId(url);
                        if (extracted) ids.push(extracted);
                    });

                    platformConfig = {
                        urls: ids,
                        clicks: android.clickUrls || [],
                        duration
                    };
                }

                if (platformConfig && platformConfig.urls.length > 0) {
                    if (platform === 'ios') {
                        // iOS: Select only 1 random video (to minimize R2 traffic - cached once, looped)
                        const randomIndex = Math.floor(Math.random() * platformConfig.urls.length);
                        setPlaylistIds([platformConfig.urls[randomIndex]]); // Single video
                        setClickUrls([platformConfig.clicks[randomIndex] || '']);
                        playlistIdsRef.current = [platformConfig.urls[randomIndex]];
                        setCurrentVideoIndex(0);
                    } else {
                        // Android: Shuffle entire playlist (cycle through multiple videos)
                        const shuffled = [...platformConfig.urls].sort(() => Math.random() - 0.5);
                        setPlaylistIds(shuffled);
                        setClickUrls(platformConfig.clicks);
                        playlistIdsRef.current = shuffled;
                    }

                    setTargetDuration(platformConfig.duration);
                    setTimeLeft(platformConfig.duration);
                    initialTimeRef.current = platformConfig.duration;
                    timeLeftRef.current = platformConfig.duration;

                    if (platform === 'ios') {
                        setShowMP4(true);
                    } else {
                        setShowYoutube(true);
                    }
                    setIsLoading(false);
                } else {
                    // No videos configured - fallback to AdMob
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

    // NEW: Handle video click (YouTube or MP4)
    const handleVideoClick = () => {
        const clickUrl = clickUrls[currentVideoIndex];
        if (clickUrl && clickUrl.trim()) {
            Browser.open({ url: clickUrl }).catch(e => console.error('Failed to open URL:', e));
        }
    };

    // NOTE: Handle MP4 video ended - NOT USED (iOS uses loop={true})
    const handleMP4VideoEnded = () => {
        // iOS: loop={true} handles automatic replay, this is not called
    };

    // NEW: Handle MP4 error
    const handleMP4Error = (e: any) => {
        console.error('📽️ [AdManager] MP4 Playback Error:', {
            error: e,
            src: videoRef.current?.src,
            readyState: videoRef.current?.readyState,
            networkState: videoRef.current?.networkState
        });
        handleAdMobFallback(config?.testMode || true);
    };

    const handleMP4LoadStart = () => {
        console.log('📽️ [AdManager] MP4 Load Start:', playlistIds[0]);
    };

    const handleMP4CanPlay = () => {
        console.log('📽️ [AdManager] MP4 Can Play (Buffered)');
        // Try to force play if it hasn't started
        if (videoRef.current && !isPlaying) {
            videoRef.current.play().catch(e => console.error('📽️ [AdManager] AutoPlay Blocked:', e));
        }
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
                playerVars: {
                    'autoplay': 1,
                    'mute': 1, // Required for iOS autoplay
                    'controls': 0,
                    'disablekb': 1,
                    'fs': 0,
                    'modestbranding': 1,
                    'playsinline': 1,
                    'rel': 0,
                    'showinfo': 0,
                    'iv_load_policy': 3,
                },
                events: {
                    'onReady': (event: any) => {
                        event.target.loadPlaylist({
                            playlist: ids,
                            index: 0,
                            startSeconds: 0
                        });
                        event.target.setLoop(true);
                        setTimeout(() => {
                            try {
                                event.target.unMute();
                                event.target.setVolume(100);
                            } catch (e) { /* iOS may block this */ }
                        }, 500);
                    },
                    'onStateChange': (event: any) => {
                        if (event.data === 1) {
                            setIsPlaying(true);
                            if (safetyTimer) clearTimeout(safetyTimer);
                        }
                        else if (event.data === 0) {
                            console.log("YouTube Video Ended (Looping)");
                        }
                        else {
                            setIsPlaying(false);
                        }
                    },
                    'onError': (e: any) => {
                        console.error("YT Player Error", e);
                        handleAdMobFallback(config?.testMode);
                    }
                }
            });
        };

        initPlayer();

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

    if (!showYoutube && !showMP4) return null;

    return (
        <div className="fixed inset-0 z-[3000] bg-black flex flex-col items-center justify-center font-sans">
            <div className="w-full h-full max-w-md bg-black relative flex flex-col items-center justify-center overflow-hidden">

                {/* Clear top for iOS Status Bar */}
                <div className="absolute top-0 left-0 right-0 h-[env(safe-area-inset-top)] bg-transparent z-[60]" />

                {/* YouTube Player Section */}
                {showYoutube && (
                    <div className="w-full h-full flex items-center justify-center relative">
                        <div ref={containerRef} className="w-full h-full bg-black relative flex items-center justify-center">
                            <div id="youtube-player-container" className="w-full aspect-video pointer-events-auto"></div>

                            {!isPlaying && !canClose && (
                                <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
                                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}

                            {!canClose && (
                                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-50">
                                    <div
                                        className="h-full bg-primary-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                        style={{ width: `${((initialTimeRef.current - timeLeft) / initialTimeRef.current) * 100}%` }}
                                    />
                                </div>
                            )}

                            <div className="absolute inset-0 z-10 bg-transparent cursor-pointer" onClick={handleVideoClick} />
                        </div>
                    </div>
                )}

                {/* iOS MP4 Player Section */}
                {showMP4 && (
                    <div className="w-full h-full flex items-center justify-center relative">
                        <video
                            ref={videoRef}
                            src={playlistIds[0]}
                            autoPlay
                            muted
                            playsInline
                            loop={true}
                            preload="auto"
                            onLoadStart={handleMP4LoadStart}
                            onCanPlay={handleMP4CanPlay}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onError={handleMP4Error}
                            onWaiting={() => console.log('📽️ [AdManager] MP4 Waiting (Buffering)...')}
                            onStalled={() => console.warn('📽️ [AdManager] MP4 Stalled')}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'black' }}
                            className="ad-video"
                        />

                        {!isPlaying && !canClose && (
                            <div className="absolute inset-0 flex items-center justify-center z-[5] pointer-events-none">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        )}

                        {!canClose && (
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 z-50">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                    style={{ width: `${((initialTimeRef.current - timeLeft) / initialTimeRef.current) * 100}%` }}
                                />
                            </div>
                        )}

                        <div className="absolute inset-0 z-10 bg-transparent cursor-pointer" onClick={handleVideoClick} />
                    </div>
                )}

                {/* Bottom Unified Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(16px+env(safe-area-inset-bottom))] flex justify-between items-end z-[70] pointer-events-none">
                    <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 pointer-events-auto">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white/90 text-[11px] font-bold tracking-tight uppercase">Sponsored</span>
                    </div>

                    {canClose ? (
                        <button
                            onClick={showMP4 ? () => { if (onReward) onReward(); onClose(); } : handleYoutubeClose}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full transition-all active:scale-95 shadow-lg shadow-green-500/30 animate-in slide-in-from-bottom-4 duration-300 pointer-events-auto cursor-pointer"
                        >
                            <span className="text-sm font-black">{adType === 'reward' ? '리워드 지급됨' : '닫기'}</span>
                            <div className="w-px h-3 bg-white/30 mx-1" />
                            <X className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-full border border-white/20 flex items-center gap-2 pointer-events-auto">
                            <span className="text-white text-base font-black tabular-nums">{timeLeft}</span>
                            <div className="w-px h-4 bg-white/20" />
                            <span className="text-white/70 text-xs font-medium">
                                {!isPlaying ? "로딩 중..." : "광고 중..."}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

