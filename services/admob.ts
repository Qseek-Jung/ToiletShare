import { AdMob, BannerAdPosition, BannerAdSize, RewardAdPluginEvents } from '@capacitor-community/admob';
import type { BannerAdOptions } from '@capacitor-community/admob';
import type { AdOptions } from '@capacitor-community/admob';
import type { RewardAdOptions, AdMobRewardItem } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import type { AdConfig } from '../types';

// Re-export for use in components
export { BannerAdPosition };
export type { AdMobRewardItem };

class AdMobService {
    private isInitialized = false;
    private platform: 'ios' | 'android' | 'web';
    private adConfig: AdConfig | null = null;

    constructor() {
        this.platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    }

    /**
     * Initialize AdMob with configuration from Supabase
     * @param config - AdConfig from db.getAdConfig()
     */
    async initialize(config: AdConfig): Promise<void> {
        if (this.isInitialized) {
            console.log('[AdMob] Already initialized');
            return;
        }

        this.adConfig = config;

        // Only initialize on native platforms
        if (this.platform === 'web') {
            console.log('[AdMob] Web platform - skipping initialization');
            return;
        }

        try {
            // Request tracking authorization first (iOS)
            if (this.platform === 'ios') {
                try {
                    await AdMob.requestTrackingAuthorization();
                    console.log('[AdMob] Tracking authorization requested');
                } catch (e) {
                    console.warn('[AdMob] Tracking authorization request failed:', e);
                }
            }

            await AdMob.initialize({
                testingDevices: config.testMode ? ['SIMULATOR'] : [],
                initializeForTesting: config.testMode
            });

            this.isInitialized = true;
            console.log('[AdMob] Initialized successfully', {
                platform: this.platform,
                testing: config.testMode
            });
        } catch (error) {
            console.error('[AdMob] Initialization failed:', error);
        }
    }

    /**
     * Get platform-specific ad unit IDs
     */
    private getAdUnitIds() {
        if (!this.adConfig) {
            console.warn('[AdMob] No config loaded');
            return null;
        }

        // Use platform-specific IDs if available, fallback to legacy adMobIds
        if (this.platform === 'ios' && this.adConfig.adMobIdsIOS) {
            return this.adConfig.adMobIdsIOS;
        } else if (this.platform === 'android' && this.adConfig.adMobIdsAndroid) {
            return this.adConfig.adMobIdsAndroid;
        } else if (this.adConfig.adMobIds) {
            // Fallback to legacy adMobIds
            return {
                banner: this.adConfig.adMobIds.banner,
                interstitial: this.adConfig.adMobIds.interstitial,
                reward: this.adConfig.adMobIds.reward
            };
        }

        return null;
    }

    /**
     * Show banner ad at bottom center (default)
     */
    async showBottomBanner(): Promise<void> {
        if (this.platform === 'web') return;

        const ids = this.getAdUnitIds();
        if (!ids?.banner) {
            console.warn('[AdMob] No banner ID configured for', this.platform);
            return;
        }

        try {
            const options: BannerAdOptions = {
                adId: ids.banner,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0,
                isTesting: this.adConfig?.testMode || false
            };

            await AdMob.showBanner(options);
            console.log('[AdMob] Banner shown', { adId: ids.banner });
        } catch (error) {
            console.error('[AdMob] Show banner failed:', error);
        }
    }

    /**
     * Show banner ad at specified position
     */
    async showBanner(position: BannerAdPosition, options?: { margin?: number }): Promise<void> {
        if (this.platform === 'web') return;

        const ids = this.getAdUnitIds();
        if (!ids?.banner) {
            console.warn('[AdMob] No banner ID configured for', this.platform);
            return;
        }

        try {
            const bannerOptions: BannerAdOptions = {
                adId: ids.banner,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position,
                margin: options?.margin || 0,
                isTesting: this.adConfig?.testMode || false
            };

            await AdMob.showBanner(bannerOptions);
            console.log('[AdMob] Banner shown', { position, adId: ids.banner });
        } catch (error) {
            console.error('[AdMob] Show banner failed:', error);
        }
    }

    /**
     * Hide banner ad
     */
    async hideBanner(): Promise<void> {
        if (this.platform === 'web') return;

        try {
            await AdMob.hideBanner();
            console.log('[AdMob] Banner hidden');
        } catch (error) {
            console.error('[AdMob] Hide banner failed:', error);
        }
    }

    /**
     * Remove banner ad
     */
    async removeBanner(): Promise<void> {
        if (this.platform === 'web') return;

        try {
            await AdMob.removeBanner();
            console.log('[AdMob] Banner removed');
        } catch (error) {
            console.error('[AdMob] Remove banner failed:', error);
        }
    }

    /**
     * Prepare (preload) interstitial ad
     */
    async prepareInterstitial(): Promise<void> {
        if (this.platform === 'web') return;

        const ids = this.getAdUnitIds();
        if (!ids?.interstitial) {
            console.warn('[AdMob] No interstitial ID configured for', this.platform);
            return;
        }

        try {
            const options: AdOptions = {
                adId: ids.interstitial,
                isTesting: this.adConfig?.testMode || false
            };

            await AdMob.prepareInterstitial(options);
            console.log('[AdMob] Interstitial prepared', { adId: ids.interstitial });
        } catch (error) {
            console.error('[AdMob] Prepare interstitial failed:', error);
        }
    }

    /**
     * Show interstitial ad
     * @returns true if ad was shown, false otherwise
     */
    async showInterstitial(): Promise<boolean> {
        if (this.platform === 'web') return false;

        try {
            await AdMob.showInterstitial();
            console.log('[AdMob] Interstitial shown');
            return true;
        } catch (error) {
            console.error('[AdMob] Show interstitial failed:', error);
            return false;
        }
    }

    /**
     * Prepare (preload) rewarded video ad
     */
    async prepareRewardVideo(): Promise<void> {
        if (this.platform === 'web') return;

        const ids = this.getAdUnitIds();
        if (!ids?.reward) {
            console.warn('[AdMob] No reward ID configured for', this.platform);
            return;
        }

        try {
            const options: RewardAdOptions = {
                adId: ids.reward,
                isTesting: this.adConfig?.testMode || false
            };

            await AdMob.prepareRewardVideoAd(options);
            console.log('[AdMob] Reward video prepared', { adId: ids.reward });
        } catch (error) {
            console.error('[AdMob] Prepare reward video failed:', error);
        }
    }

    /**
     * Show rewarded video ad
     * @returns Reward item if user completed the video, null otherwise
     */
    async showRewardVideo(): Promise<AdMobRewardItem | null> {
        if (this.platform === 'web') return null;

        return new Promise((resolve) => {
            let listenerHandle: any;

            // Listen for reward event
            const rewardListener = AdMob.addListener(
                RewardAdPluginEvents.Rewarded,
                (reward: AdMobRewardItem) => {
                    console.log('[AdMob] User rewarded:', reward);
                    if (listenerHandle) listenerHandle.remove();
                    resolve(reward);
                }
            );

            // Show the ad
            AdMob.showRewardVideoAd()
                .then(() => {
                    console.log('[AdMob] Reward video shown');
                })
                .catch((error) => {
                    console.error('[AdMob] Show reward video failed:', error);
                    if (listenerHandle) listenerHandle.remove();
                    resolve(null);
                });

            listenerHandle = rewardListener;

            // Timeout fallback (30 seconds)
            setTimeout(() => {
                if (listenerHandle) {
                    listenerHandle.remove();
                    resolve(null);
                }
            }, 30000);
        });
    }
}

export const adMobService = new AdMobService();
