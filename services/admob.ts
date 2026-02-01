import { AdMob, BannerAdPosition, BannerAdSize, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
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
    private isInterstitialLoaded = false;
    private isRewardLoaded = false;

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
            console.log('[AdMob] Starting initialization sequence...');

            // Request tracking authorization first (iOS)
            if (this.platform === 'ios') {
                try {
                    console.log('[AdMob] Requesting tracking info...');
                    await AdMob.requestTrackingAuthorization();
                    console.log('[AdMob] Tracking authorization requested');
                } catch (e) {
                    console.warn('[AdMob] Tracking authorization request failed:', e);
                }
            }

            console.log('[AdMob] Calling AdMob.initialize()...');

            // Race AdMob.initialize with a timeout
            const initPromise = AdMob.initialize({
                testingDevices: config.testMode ? ['SIMULATOR'] : [],
                initializeForTesting: config.testMode
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('AdMob Init Cancelled (Timeout)')), 5000)
            );

            await Promise.race([initPromise, timeoutPromise]);

            this.isInitialized = true;
            console.log('[AdMob] Initialized successfully', {
                platform: this.platform,
                testing: config.testMode
            });
        } catch (error) {
            console.error('[AdMob] Initialization failed:', error);
            // Even if init fails, we might want to let the app try to show ads?
            // Usually if init fails, ads won't work. But catching it prevents the hang.
            throw error; // Propagate so caller knows.
        }
    }

    /**
     * Get platform-specific ad unit IDs
     */
    private getAdUnitIds() {
        if (!this.adConfig) {
            console.warn('[AdMobService] ⚠️ No config!');
            return { banner: '', interstitial: '', reward: '' };
        }

        const platform = this.platform;

        if (platform === 'ios') {
            const ids = this.adConfig.adMobIdsIOS || {} as any;
            return {
                banner: (ids.banner || '').trim(),
                interstitial: (ids.interstitial || '').trim(),
                reward: (ids.reward || '').trim()
            };
        } else if (platform === 'android') {
            const ids = this.adConfig.adMobIdsAndroid || {} as any;
            return {
                banner: (ids.banner || '').trim(),
                interstitial: (ids.interstitial || 'ca-app-pub-8142649369272916/6481640998').trim(),
                reward: (ids.reward || 'ca-app-pub-8142649369272916/1560486806').trim()
            };
        }

        console.warn('[AdMobService] ⚠️ Falling back to legacy adMobIds');
        return this.adConfig.adMobIds || { banner: '', interstitial: '', reward: '' };
    }

    /**
     * Show banner ad at bottom center (default)
     */
    async showBottomBanner(): Promise<void> {
        if (this.platform === 'web' || !this.adConfig) return;

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
        } catch (error: any) {
            // Suppress noise if banner wasn't shown
            if (!error?.message?.includes('never shown')) {
                console.error('[AdMob] Hide banner failed:', error);
            }
        }
    }

    /**
     * Remove banner ad
     */
    async removeBanner(): Promise<void> {
        if (this.platform === 'web') return;

        try {
            await AdMob.removeBanner();
            console.log('[AdMobService] ✅ Banner removed');
        } catch (error: any) {
            // Suppress noise if banner wasn't shown
            if (!error?.message?.includes('never shown')) {
                console.error('[AdMobService] ❌ Remove banner failed:', error);
            }
        }
    }

    /**
     * Prepare (preload) interstitial ad
     */
    async prepareInterstitial(): Promise<void> {
        console.log('[AdMobService] 📺 prepareInterstitial called');
        if (this.platform === 'web') {
            console.log('[AdMobService] Web platform, skipping prepare interstitial.');
            return;
        }

        if (this.isInterstitialLoaded) {
            console.log('[AdMobService] Interstitial already loaded, skipping prepare.');
            return;
        }

        const ids = this.getAdUnitIds();
        if (!ids?.interstitial) {
            console.warn('[AdMobService] No interstitial ID configured for', this.platform);
            return;
        }

        try {
            const options: AdOptions = {
                adId: ids.interstitial,
                isTesting: this.adConfig?.testMode || false
            };

            // Register self-cleanup listener for loaded state
            const loadListener = await AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => {
                this.isInterstitialLoaded = true;
                loadListener.remove();
            });

            // Race prepareInterstitial with a 10s timeout
            const prepPromise = AdMob.prepareInterstitial(options);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Interstitial Preload Timeout')), 10000)
            );

            await Promise.race([prepPromise, timeoutPromise]);
            console.log('[AdMobService] ✅ Interstitial prepared', { adId: ids.interstitial });
        } catch (error) {
            console.error('[AdMobService] ❌ Prepare interstitial failed:', error);
            throw error;
        }
    }

    /**
     * Show interstitial ad
     * @returns true if ad was shown, false otherwise
     */
    async showInterstitial(): Promise<boolean> {
        console.log('[AdMobService] 📺 showInterstitial called');
        if (this.platform === 'web') {
            console.log('[AdMobService] Web platform, skipping show interstitial.');
            return false;
        }

        return new Promise(async (resolve, reject) => {
            const listeners: any[] = [];
            const cleanup = () => listeners.forEach(l => l.remove());

            // Dismissed
            listeners.push(await AdMob.addListener(
                InterstitialAdPluginEvents.Dismissed,
                () => {
                    console.log('[AdMob] Interstitial dismissed');
                    this.isInterstitialLoaded = false; // Reset state
                    this.prepareInterstitial().catch(() => { }); // Auto pre-load next
                    cleanup();
                    resolve(true);
                }
            ));

            // Failed
            listeners.push(await AdMob.addListener(
                InterstitialAdPluginEvents.FailedToShow,
                (error: any) => {
                    console.error('[AdMob] Interstitial failed to show:', error);
                    this.isInterstitialLoaded = false; // Reset on failure
                    cleanup();
                    reject(error);
                }
            ));

            try {
                await AdMob.showInterstitial();
                // console.log('[AdMobService] ✅ Interstitial show requested');
            } catch (error) {
                console.error('[AdMobService] ❌ Show interstitial failed:', error);
                cleanup();
                reject(error);
            }
        });
    }

    /**
     * Prepare (preload) rewarded video ad
     */
    async prepareRewardVideo(): Promise<void> {
        console.log('[AdMobService] 📺 prepareRewardVideo called');
        if (this.platform === 'web') {
            console.log('[AdMobService] Web platform, skipping prepare reward video.');
            return;
        }

        if (this.isRewardLoaded) {
            console.log('[AdMobService] Reward already loaded, skipping prepare.');
            return;
        }

        const ids = this.getAdUnitIds();
        if (!ids?.reward) {
            console.warn('[AdMobService] No reward ID configured for', this.platform);
            return;
        }

        try {
            const options: RewardAdOptions = {
                adId: ids.reward,
                isTesting: this.adConfig?.testMode || false
            };

            // Register self-cleanup listener for loaded state
            const loadListener = await AdMob.addListener(RewardAdPluginEvents.Loaded, () => {
                this.isRewardLoaded = true;
                loadListener.remove();
            });

            console.log('[AdMobService] Preparing reward ad with options:', options);
            await AdMob.prepareRewardVideoAd(options);
            console.log('[AdMobService] ✅ Reward video prepared', { adId: ids.reward });
        } catch (error) {
            console.error('[AdMobService] ❌ Prepare reward video failed:', error);
            throw error;
        }
    }

    /**
     * Show rewarded video ad
     * @returns Reward item if user completed the video, null otherwise
     */
    async showRewardVideo(): Promise<AdMobRewardItem | null> {
        if (this.platform === 'web') return null;

        return new Promise(async (resolve, reject) => {
            const listeners: any[] = [];

            const cleanup = () => {
                listeners.forEach(l => l.remove());
            };

            // 1. Reward Earned
            listeners.push(await AdMob.addListener(
                RewardAdPluginEvents.Rewarded,
                (reward: AdMobRewardItem) => {
                    console.log('[AdMob] User rewarded:', reward);
                    cleanup();
                    resolve(reward);
                }
            ));

            // 2. Ad Dismissed (Closed)
            listeners.push(await AdMob.addListener(
                RewardAdPluginEvents.Dismissed,
                () => {
                    console.log('[AdMob] Ad dismissed by user');
                    this.isRewardLoaded = false;
                    this.prepareRewardVideo().catch(() => { }); // Auto pre-load next
                    cleanup();
                    resolve(null); // Resolve with null if closed without reward
                }
            ));

            // 3. Failed to Show
            listeners.push(await AdMob.addListener(
                RewardAdPluginEvents.FailedToShow,
                (error: any) => {
                    console.error('[AdMob] Failed to show:', error);
                    this.isRewardLoaded = false;
                    cleanup();
                    reject(new Error(error.error || 'Failed to show ad'));
                }
            ));

            try {
                await AdMob.showRewardVideoAd();
                // console.log('[AdMob] Reward video requested');
            } catch (error) {
                console.error('[AdMob] Show reward video call failed:', error);
                cleanup();
                reject(error);
            }
        });
    }
}

export const adMobService = new AdMobService();
