import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    AdMobRewardItem,
    AdMobError,
    RewardAdOptions,
    AdLoadInfo,
    RewardAdPluginEvents
} from '@capacitor-community/admob';
import { dbSupabase } from './db_supabase';
import { Capacitor } from '@capacitor/core';

// Dev mode check for Vite
const IS_DEV = import.meta.env.DEV;

// Google Test IDs (Fallback)
const TEST_IDS = {
    BANNER: 'ca-app-pub-3940256099942544/6300978111',
    INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
    REWARD: 'ca-app-pub-3940256099942544/5224354917',
    REWARD_INTERSTITIAL: 'ca-app-pub-3940256099942544/5354046379',
    APP_OPEN: 'ca-app-pub-3940256099942544/3419835294',
    NATIVE: 'ca-app-pub-3940256099942544/2247696110' // Standard Native Advanced Video
};

class AdMobService {
    private isInitialized = false;
    private initPromise: Promise<void> | null = null;

    async initialize(isTesting?: boolean) {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                // Initialize checks config but we can also force testing via arg
                await AdMob.initialize({
                    initializeForTesting: isTesting ?? IS_DEV,
                });
                this.isInitialized = true;
                console.log('AdMob initialized');
            } catch (e) {
                console.error('AdMob init failed', e);
            }
        })();
        return this.initPromise;
    }

    private async getAdId(type: 'banner' | 'interstitial' | 'reward' | 'rewardInterstitial' | 'appOpen' | 'native'): Promise<{ id: string, isTest: boolean }> {
        const config = await dbSupabase.getAdConfig();
        const isTest = config.testMode;

        let id = '';
        if (isTest) {
            switch (type) {
                case 'banner': id = TEST_IDS.BANNER; break;
                case 'interstitial': id = TEST_IDS.INTERSTITIAL; break;
                case 'reward': id = TEST_IDS.REWARD; break;
                case 'rewardInterstitial': id = TEST_IDS.REWARD_INTERSTITIAL; break;
                case 'appOpen': id = TEST_IDS.APP_OPEN; break;
                case 'native': id = TEST_IDS.NATIVE; break;
            }
        } else {
            // Production: Use configured ID, default to empty string if missing
            id = config.adMobIds?.[type] || '';
        }

        return { id, isTest };
    }

    // --- Banner ---
    async showBanner(position: BannerAdPosition, options?: { margin?: number }) {
        try {
            const { id, isTest } = await this.getAdId('banner');
            if (!id) return; // No ID, do nothing

            await this.initialize(isTest);
            await AdMob.showBanner({
                adId: id,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: position,
                margin: options?.margin || 0,
                isTesting: isTest,
                npa: true
            });
        } catch (e) {
            console.error('Show Banner failed', e);
        }
    }

    async showBottomBanner() {
        try {
            const { id, isTest } = await this.getAdId('banner');
            if (!id) return;

            await this.initialize(isTest);
            await AdMob.showBanner({
                adId: id,
                adSize: BannerAdSize.LARGE_BANNER, // Increased size for better visibility
                position: BannerAdPosition.BOTTOM_CENTER,
                margin: 0, // No gap - attach directly to bottom nav
                isTesting: isTest,
                npa: true
            });
        } catch (e) {
            console.error('Show Bottom Banner failed', e);
        }
    }

    async hideBanner() {
        try {
            await AdMob.hideBanner();
        } catch (e) { /* ignore */ }
    }

    async removeBanner() {
        try {
            await AdMob.removeBanner();
        } catch (e) { /* ignore */ }
    }

    // --- Interstitial (Global Page Transitions, etc) ---
    async prepareInterstitial() {
        try {
            const { id, isTest } = await this.getAdId('interstitial');
            if (!id) return;

            await this.initialize(isTest);
            await AdMob.prepareInterstitial({
                adId: id,
                isTesting: isTest,
                npa: true
            });
        } catch (e) {
            console.error("Prepare Interstitial Failed", e);
        }
    }

    async showInterstitial(): Promise<boolean> {
        try {
            const { id, isTest } = await this.getAdId('interstitial');
            if (!id) return false; // Graceful fallback

            await this.initialize(isTest);
            // Prepare logic usually handles loading. 
            // Ideally we prepare ahead, but for simplicity we try to load/show.
            // But Capacitor AdMob usually recommends prepare -> show.
            // We'll call prepare just in case it wasn't preloaded, but usually should call prepareInterstitial ahead.
            // For "on click" robust flow:
            await AdMob.prepareInterstitial({ adId: id, isTesting: isTest });
            await AdMob.showInterstitial();
            return true;
        } catch (e) {
            console.error("Show Interstitial Failed", e);
            return false;
        }
    }

    // --- Reward (Long form, e.g. Free Charge) ---
    async prepareRewardVideo() {
        // Implementation for prepare if needed independently
        // Currently showRewardVideo handles prepare+show
    }

    async showRewardVideo(): Promise<AdMobRewardItem | null> {
        try {
            const { id, isTest } = await this.getAdId('reward');
            if (!id) return null;

            // Web Environment Fallback
            if (Capacitor.getPlatform() === 'web') {
                console.log('🌐 Web Simulation: Reward Video (Testing Check:', isTest, ')');
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (confirm(`[Web Test] 광고 시청을 완료하겠습니까? (모드: ${isTest ? '테스트' : '운영'})`)) {
                    return { type: 'coin', amount: 10 };
                }
                return null;
            }

            return new Promise(async (resolve) => {
                let rewardedItem: AdMobRewardItem | null = null;
                let rewardListener: any;
                let dismissListener: any;

                // Set up listeners BEFORE showing
                rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (item) => {
                    rewardedItem = item;
                });

                dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                    if (rewardListener) rewardListener.remove();
                    if (dismissListener) dismissListener.remove();
                    resolve(rewardedItem);
                });

                try {
                    await this.initialize(isTest);
                    await AdMob.prepareRewardVideoAd({
                        adId: id,
                        isTesting: isTest,
                        npa: true
                    });
                    await AdMob.showRewardVideoAd();
                } catch (e) {
                    console.error('Show Reward failed', e);
                    if (rewardListener) rewardListener.remove();
                    if (dismissListener) dismissListener.remove();
                    resolve(null);
                }
            });
        } catch (e) {
            console.error(e);
            return null;
        }
    }
}

export const adMobService = new AdMobService();
