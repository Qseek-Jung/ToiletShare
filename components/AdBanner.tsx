import React, { useEffect, useState, useRef } from 'react';
import { adMobService } from '../services/admob';
import { Capacitor } from '@capacitor/core';

interface AdBannerProps {
    className?: string;
    style?: React.CSSProperties;
}

// Global variable to track active banners to prevent overlap if component remounts quickly
let activeBannerId: string | null = null;

export const AdBanner: React.FC<AdBannerProps> = ({ className, style }) => {
    const bannerRef = useRef<HTMLDivElement>(null);
    const [isAdLoaded, setIsAdLoaded] = useState(false);
    const [adError, setAdError] = useState<string | null>(null);

    // New state for web simulation
    const [isWebTestMode, setIsWebTestMode] = useState(false);

    useEffect(() => {
        // Check if we are in web test mode
        // Logic: Not native platform AND test mode is enabled in config/adService
        const checkTestMode = async () => {
            const isNative = Capacitor.isNativePlatform();
            if (!isNative && window.location.hostname === 'localhost') {
                setIsWebTestMode(true);
            }
        };
        checkTestMode();

        const loadBanner = async () => {
            try {
                // If not native and not in web test mode, don't try to load AdMob
                if (!Capacitor.isNativePlatform()) {
                    // console.log("Web platform detected, AdBanner skipping native load.");
                    return;
                }

                // If a banner is already effective, we might want to ensure it is visible or reload?
                // For now, let's treat every mount as a request to show the banner.
                await adMobService.showBottomBanner();
                setIsAdLoaded(true);
                activeBannerId = 'bottom_banner';
            } catch (error: any) {
                console.error("AdBanner failed to load:", error);
                setAdError(error?.message || "Unknown error");
                setIsAdLoaded(false);
            }
        };

        loadBanner();

        return () => {
            // Cleanup on unmount
            const cleanup = async () => {
                try {
                    if (Capacitor.isNativePlatform()) {
                        await adMobService.hideBanner();
                        activeBannerId = null;
                    }
                } catch (e) {
                    console.error("Error hiding banner on unmount:", e);
                }
            };
            cleanup();
        };
    }, []);

    // Web Simulation Render
    if (isWebTestMode) {
        return (
            <div
                className={`${className || ''}`}
                style={{
                    width: '100%',
                    height: '60px', // Standard banner height
                    backgroundColor: '#f0f0f0',
                    borderTop: '1px solid #ddd',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: '#666',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    boxShadow: '0 -2px 5px rgba(0,0,0,0.05)',
                    ...style
                }}
            >
                <div style={{ fontWeight: 'bold', color: '#333' }}>TEST AD BANNER</div>
                <div>(Visible in localhost only)</div>
            </div>
        );
    }

    // Native Render (Placeholder structure, the actual ad is an overlay)
    // We render a transparent div to take up space in the DOM if needed, 
    // but AdMob overlay usually floats.
    // However, purely logical component doesn't need much UI.
    // If you want to reserve space for the banner so it doesn't cover content:
    return (
        <div
            ref={bannerRef}
            className={`ad-banner-placeholder ${className || ''}`}
            style={{
                height: '60px', // Reserve space for the banner
                width: '100%',
                backgroundColor: 'transparent',
                display: isAdLoaded ? 'block' : 'none', // Hide placeholder if ad not loaded? Or keep it to prevent layout shift?
                // Usually keeping it is better even if empty to prevent jumping, but let's hide if error.
                ...style
            }}
        >
            {/* Native Ad overlay will appear here (visually) */}
            {adError && process.env.NODE_ENV === 'development' && (
                <div style={{ fontSize: '10px', color: 'red', padding: '4px' }}>Ad Error: {adError}</div>
            )}
        </div>
    );
};
