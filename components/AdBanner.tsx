import React, { useEffect, useState } from 'react';
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

        const showAdMob = async () => {
            // Get config to initialize AdMob
            const config = await dbSupabase.getAdConfig();

            // Initialize AdMob with config from Supabase
            await adMobService.initialize(config);

            // Only show AdMob banner for BANNER type to avoid floating ads over content
            if (type === 'BANNER') {
                if (position === 'bottom') {
                    await adMobService.showBottomBanner();
                } else {
                    await adMobService.showBanner(BannerAdPosition.TOP_CENTER, { margin });
                }
            }
        };

        showAdMob();

        return () => {
            // Cleanup handled by individual components if needed
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
    // AdMob banners are native overlays, so we don't render a DOM element
    // The banner will appear as a native overlay at the specified position
    return null;
};
