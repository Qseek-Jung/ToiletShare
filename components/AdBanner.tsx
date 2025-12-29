import React, { useEffect, useState } from 'react';
import { dbSupabase } from '../services/db_supabase';
import { adMobService } from '../services/admob';
import { BannerAdPosition } from '@capacitor-community/admob';

interface AdBannerProps {
    position?: 'top' | 'bottom';
    className?: string;
    margin?: number;
    maxHeight?: number; // New: Limit height (px)
    isInline?: boolean; // New: If true, don't trigger floating AdMob
    minRatio?: number;  // New: Filter banners by ratio
    maxRatio?: number;  // New: Filter banners by ratio
    useImageRatio?: boolean; // New: If true, use the banner's actual ratio for container
}

export const AdBanner: React.FC<AdBannerProps> = ({ position, className, margin, maxHeight, isInline, minRatio, maxRatio, useImageRatio }) => {
    const [isCustom, setIsCustom] = useState(false);
    const [customBanner, setCustomBanner] = useState<{ imageUrl: string; targetUrl?: string; ratio?: number } | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadAd = async () => {
            const config = await dbSupabase.getAdConfig();
            const source = config.bannerSource || 'admob';

            if (isMounted) {
                if (source === 'custom') {
                    // Hide AdMob floating banner
                    await adMobService.hideBanner();

                    // Filter Banners by Ratio
                    let banners = config.customBanners || [];
                    if (minRatio) {
                        banners = banners.filter(b => (b.ratio || 0) >= minRatio);
                    }
                    if (maxRatio) {
                        banners = banners.filter(b => (b.ratio || 999) <= maxRatio);
                    }

                    if (banners.length > 0) {
                        const randomBanner = banners[Math.floor(Math.random() * banners.length)];
                        setCustomBanner(randomBanner);
                        setIsCustom(true);
                    } else {
                        // If no custom banners match the ratio, fallback
                        if (!isInline && position) {
                            await showAdMob(position, margin);
                        }
                        setIsCustom(false);
                        setCustomBanner(null);
                    }
                } else {
                    // AdMob - Only show if not inline
                    if (!isInline && position) {
                        await showAdMob(position, margin);
                    }
                    setIsCustom(false);
                    setCustomBanner(null);
                }
            }
        };

        // Helper to trigger AdMob
        const showAdMob = async (pos: 'top' | 'bottom', m?: number) => {
            const adMobPos = pos === 'top' ? BannerAdPosition.TOP_CENTER : BannerAdPosition.BOTTOM_CENTER;
            await adMobService.showBanner(adMobPos, { margin: m });
        };

        loadAd();

        return () => {
            isMounted = false;
            // Only hide if we were the ones responsible for a floating banner
            if (!isInline && position) {
                adMobService.hideBanner();
            }
        };
    }, [position, margin, isInline, minRatio, maxRatio]);

    if (isCustom && customBanner) {
        return (
            <div
                className={`w-full flex justify-center items-center overflow-hidden bg-gray-100 ${className}`}
                style={{
                    ...(maxHeight ? { maxHeight: `${maxHeight}px` } : {}),
                    ...(useImageRatio && customBanner.ratio ? { aspectRatio: `${customBanner.ratio}` } : {})
                }}
            >
                <a
                    href={customBanner.targetUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                    style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}
                    onClick={(e) => {
                        if (!customBanner.targetUrl) e.preventDefault();
                    }}
                >
                    <img
                        src={customBanner.imageUrl}
                        alt="Ad"
                        className="w-full h-full object-cover mx-auto"
                        style={maxHeight ? { maxHeight: `${maxHeight}px` } : {}}
                    />
                </a>
            </div>
        );
    }

    // placeholder/empty for AdMob or empty custom
    return <div className={`min-h-[1px] ${className}`} style={maxHeight ? { height: '0px' } : {}}></div>;
};
