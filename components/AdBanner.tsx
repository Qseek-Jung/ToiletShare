import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';

// The native banner floats above the WebView, so it must hide whenever something
// (modal, detail page, bottom sheet...) is drawn over its in-page slot.
// Sample the slot's left and right edges; the center is skipped because the raised
// "+" nav button legitimately overlaps it.
const DEFAULT_BANNER_HEIGHT = 50;
const isSlotCovered = (slot: HTMLElement): boolean => {
    const container = slot.parentElement ?? slot;
    const rect = slot.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return true;
    const y = rect.top + rect.height / 2;
    const xs = [rect.left + 8, rect.right - 8];
    return xs.every(x => {
        const el = document.elementFromPoint(x, y);
        return !el || !container.contains(el);
    });
};
import { adMobService } from '../services/admob';
import { dbSupabase } from '../services/db_supabase';
import { BannerAdPosition } from '../services/admob';
import { CustomBannerType } from '../types';

interface AdBannerProps {
    position?: 'top' | 'bottom';
    className?: string;
    maxHeight?: number;
    minRatio?: number;
    maxRatio?: number;
    isInline?: boolean;
    margin?: number;
    type?: CustomBannerType;
}

export const AdBanner: React.FC<AdBannerProps> = ({
    position = 'bottom',
    className = '',
    maxHeight,
    minRatio,
    maxRatio,
    isInline = false,
    margin = 0,
    type = 'BANNER'
}) => {
    const [shouldShow, setShouldShow] = useState(false);
    const [customBanner, setCustomBanner] = useState<{ imageUrl: string, targetUrl: string } | null>(null);
    const [source, setSource] = useState<'admob' | 'custom'>('admob');
    const [nativeBannerHeight, setNativeBannerHeight] = useState(0);
    const slotRef = useRef<HTMLDivElement>(null);
    const useNativeBottomBanner = Capacitor.isNativePlatform() && type === 'BANNER' && position === 'bottom';

    useEffect(() => {
        const checkConfig = async () => {
            const config = await dbSupabase.getAdConfig();

            // Global toggle check
            if (config.bannersEnabled === false) {
                setShouldShow(false);
                return;
            }

            setSource(config.bannerSource);
            setShouldShow(true);

            if (config.bannerSource === 'custom') {
                // Filter by type
                const validBanners = config.customBanners.filter(b => {
                    const bType = b.type || 'BANNER';
                    return bType === type;
                });

                if (validBanners.length > 0) {
                    const randomBanner = validBanners[Math.floor(Math.random() * validBanners.length)];
                    setCustomBanner(randomBanner);
                } else {
                    if (config.customBanners.length === 0) setSource('admob');
                    else setShouldShow(false);
                }
            }
        };

        checkConfig();

        // Listen for App Resume to refresh Ad Config
        const setupListener = async () => {
            const { App } = await import('@capacitor/app');
            return App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    checkConfig();
                }
            });
        };

        let listenerHandle: any;
        setupListener().then(handle => { listenerHandle = handle; });

        return () => {
            if (listenerHandle) listenerHandle.remove();
        };
    }, [type]);

    useEffect(() => {
        if (!shouldShow || source !== 'admob') {
            // Cleanup AdMob if switching away or hiding
            if (source === 'custom') adMobService.hideBanner();
            return;
        }

        let cancelled = false;
        let syncTimer: ReturnType<typeof setTimeout> | null = null;
        let observer: MutationObserver | null = null;
        let unsubscribeSize: (() => void) | null = null;

        // Place the native banner exactly over the in-page slot (above the bottom nav),
        // or hide it while any full-screen overlay is open.
        const syncNativeBanner = () => {
            if (cancelled || !slotRef.current) return;
            if (isSlotCovered(slotRef.current)) {
                adMobService.hideBottomBanner(0);
                return;
            }
            const rect = slotRef.current.getBoundingClientRect();
            // The native banner draws above the WebView, so keep it clear of the
            // raised "+" button that sticks out above the bottom nav.
            let bannerBottom = rect.bottom;
            const fab = document.getElementById('nav-fab');
            if (fab) {
                const fabRect = fab.getBoundingClientRect();
                if (fabRect.height > 0 && fabRect.top < bannerBottom) bannerBottom = fabRect.top - 4;
            }
            const marginFromBottom = window.innerHeight - bannerBottom;
            adMobService.showBottomBannerAt(marginFromBottom);
        };
        const scheduleSync = (delay = 120) => {
            if (syncTimer) clearTimeout(syncTimer);
            syncTimer = setTimeout(syncNativeBanner, delay);
        };

        const showAdMob = async () => {
            // Get config to initialize AdMob
            const config = await dbSupabase.getAdConfig();

            // Initialize AdMob with config from Supabase
            await adMobService.initialize(config);
            if (cancelled) return;

            // Only show AdMob banner for BANNER type to avoid floating ads over content
            if (type !== 'BANNER') return;

            if (useNativeBottomBanner) {
                unsubscribeSize = adMobService.onBannerSize(setNativeBannerHeight);
                observer = new MutationObserver(() => scheduleSync());
                observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
                window.addEventListener('resize', onResize);
                // Returning from a fullscreen ad (separate native screen) -> re-sync
                document.addEventListener('visibilitychange', onResize);
                window.addEventListener('focus', onResize);
                // Wait for the slot's slide-in animation to finish before measuring
                scheduleSync(600);
            } else if (position === 'bottom') {
                await adMobService.showBottomBanner();
            } else {
                await adMobService.showBanner(BannerAdPosition.TOP_CENTER, { margin });
            }
        };
        const onResize = () => scheduleSync();

        showAdMob();

        return () => {
            cancelled = true;
            if (syncTimer) clearTimeout(syncTimer);
            observer?.disconnect();
            unsubscribeSize?.();
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onResize);
            window.removeEventListener('focus', onResize);
            if (useNativeBottomBanner) adMobService.hideBottomBanner();
        };
    }, [shouldShow, source, position, margin, type]);

    if (!shouldShow) return null;

    if (source === 'custom' && customBanner) {
        return (
            <a
                href={customBanner.targetUrl}
                target="_blank"
                rel="noreferrer"
                className={`block overflow-hidden relative ${className}`}
                style={{ height: maxHeight ? `${maxHeight}px` : undefined }}
            >
                <img
                    src={customBanner.imageUrl}
                    alt="Advertisement"
                    className="w-full h-full object-cover"
                />
                <span className="absolute top-0 right-0 bg-black/20 text-[9px] text-white px-1">AD</span>
            </a>
        );
    }

    // AdMob banners are native overlays. On native bottom placements we render an
    // invisible slot of the same height so the banner position can be measured.
    if (useNativeBottomBanner && source === 'admob') {
        return <div ref={slotRef} aria-hidden="true" className="w-full" style={{ height: nativeBannerHeight || DEFAULT_BANNER_HEIGHT }} />;
    }
    return null;
};
