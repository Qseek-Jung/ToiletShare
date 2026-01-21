import React, { useEffect, useState } from 'react';
import { adMobService } from '../services/admob';
import { dbSupabase } from '../services/db_supabase';
import { BannerAdPosition } from '../services/admob';
import { CustomBannerType } from '../types';

interface AdBannerProps {
    position?: 'top' | 'bottom';
    className?: string;
    maxHeight?: number;
    // Ratio constraints for responsive sizing
    minRatio?: number;
    maxRatio?: number;
    isInline?: boolean; // If true, doesn't stick to screen edges
    margin?: number; // Margin for top/bottom sticky
    type?: CustomBannerType; // Added type prop
}

export const AdBanner: React.FC<AdBannerProps> = ({
    position = 'bottom',
    className = '',
    maxHeight,
    minRatio,
    maxRatio,
    isInline = false,
    margin = 0,
    type = 'BANNER' // Default to BANNER
}) => {
    const [shouldShow, setShouldShow] = useState(false);
    const [customBanner, setCustomBanner] = useState<{ imageUrl: string, targetUrl: string } | null>(null);
    const [source, setSource] = useState<'admob' | 'custom'>('admob');

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
                    // Backwards compatibility: if b.type is undefined, treat as BANNER
                    const bType = b.type || 'BANNER';
                    return bType === type;
                });

                if (validBanners.length > 0) {
                    const randomBanner = validBanners[Math.floor(Math.random() * validBanners.length)];
                    setCustomBanner(randomBanner);
                } else {
                    // Fallback to AdMob if no valid custom banner for this type
                    // Or hide? Let's fallback to AdMob if custom is empty
                    if (config.customBanners.length === 0) setSource('admob');
                    else setShouldShow(false); // Have custom banners but none for this type -> Hide
                }
            }
        };

        checkConfig();

        // Listen for App Resume to refresh Ad Config
        const setupListener = async () => {
            const { App } = await import('@capacitor/app');
            return App.addListener('appStateChange', ({ isActive }) => {
                if (isActive) {
                    // Force re-check on resume (uses TTL cache in db_supabase)
                    checkConfig();
                }
            });
        };

        let listenerHandle: any;
        setupListener().then(handle => { listenerHandle = handle; });

        return () => {
            if (listenerHandle) listenerHandle.remove();
        };
    }, [type]); // Re-run if type changes

    useEffect(() => {
        if (!shouldShow || source !== 'admob') {
            // Cleanup AdMob if switching away or hiding
            if (source === 'custom') adMobService.hideBanner();
            return;
        }

        const showAdMob = async () => {
            const pos = position === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER;
            // Native/Inline slots might need different handling if plugin supports view-embedding.
            // Capacitor AdMob Banners are overlays. Inline visual is hard.
            // If isInline is true, we simply reserve space in DOM, but the Ad is overlay (fixed or absolute).
            // This is a known limitation.
            // Best effort: Show banner at calculated position?
            // Wait, standard usage in this app for inline: 
            // It actually just renders the Custom Banner as img.
            // For AdMob: The plugin puts a WebView overlay.
            // If we want "Native", we generally need a different plugin or Native Advanced.
            // For this task, we focus on Custom Banners logic mostly as per user request.
            // For AdMob, we just call showBanner.

            // Note: If type is 'NATIVE_MODAL' or 'NATIVE_LIST', standard banner might look odd overlaying.
            // We'll stick to 'showBanner' which does overlay at top/bottom.
            // If isInline, we might skip AdMob if it can't be embedded?
            // Actually, for specific "Native" slots, maybe we DON'T show AdMob Standard Banner 
            // because it floats?
            // Let's assume user is okay with Custom Banners for those slots or AdMob if it works.

            // For now, only show AdMob if strict "BANNER" type (Bottom/Top) to avoid floating ads over content?
            // Or allow it.
            if (type === 'BANNER') {
                if (position === 'bottom') adMobService.showBottomBanner();
                else adMobService.showBanner(BannerAdPosition.TOP_CENTER, { margin });
            } else {
                // For Native slots, AdMob overlay is tricky.
                // Maybe we create an MREC ad?
                // But sticking to simple update:
                // If AdMob source AND Native type -> Try valid AdMob or Hide
                // Let's hide AdMob for Native slots for now to prevent UI breaking, 
                // UNLESS Custom Banner is present.
                // User specifically asked for "Custom Banner categorization".
            }
        };

        showAdMob();

        return () => {
            // adMobService.hideBanner(); // Don't hide on unmount aggressively if global?
            // Actually AdBanner is used in specific places.
            // Use hide logic carefully.
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

    // AdMob Placeholder
    // Since AdMob banners are overlays, we don't need a DOM element unless we want to reserve space.
    // For bottom banner, we usually adjust body padding.
    // For inline/native, we might ideally want a placeholder, but current implementation is overlay-based for AdMob.
    return null;
};
