import {
    AdMob,
    BannerAdSize,
    BannerAdPosition,
    AdMobRewardItem,
    RewardAdPluginEvents,
    InterstitialAdPluginEvents
} from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Configuration: Test IDs vs Production IDs
const IS_DEV = import.meta.env.DEV; // Vite env

const AD_IDS = {
    // App ID: ca-app-pub-8142649369272916~9342907044 (Prod) / ca-app-pub-3940256099942544~3347511713 (Test)
    BANNER: {
        test: 'ca-app-pub-3940256099942544/6300978111',
        prod: 'ca-app-pub-8142649369272916/4467321983'
    },
    INTERSTITIAL: {
        test: 'ca-app-pub-3940256099942544/1033173712',
        prod: 'ca-app-pub-8142649369272916/1434782775'
    },
    REWARD: {
        test: 'ca-app-pub-3940256099942544/5224354917',
        prod: 'ca-app-pub-8142649369272916/7157882747'
    }
};

class AdMobService {
    private initPromise: Promise<void> | null = null;
    isInitialized = false;

    async initialize(isTesting?: boolean) {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                await AdMob.initialize({
                    initializeForTesting: isTesting ?? IS_DEV,
                });
                this.isInitialized = true;
                console.log('AdMob initialized (Testing:', isTesting ?? IS_DEV, ')');
            } catch (e) {
                console.error('AdMob init failed', e);
            }
        })();
        return this.initPromise;
    }

    // --- Banner ---
    async showBanner(position: BannerAdPosition, options?: { margin?: number, isTesting?: boolean }) {
        const useTest = options?.isTesting ?? IS_DEV;
        await this.initialize(useTest);
        try {
            await AdMob.showBanner({
                adId: useTest ? AD_IDS.BANNER.test : AD_IDS.BANNER.prod,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: position,
                margin: options?.margin || 0,
                isTesting: useTest
            });
        } catch (e) {
            console.error('Show Banner failed', e);
        }
    }

    async showBottomBanner(isTesting?: boolean) {
        await this.showBanner(BannerAdPosition.BOTTOM_CENTER, { isTesting });
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

    // --- Interstitial ---
    async prepareInterstitial(isTesting?: boolean) {
        const useTest = isTesting ?? IS_DEV;
        try {
            await AdMob.prepareInterstitial({
                adId: useTest ? AD_IDS.INTERSTITIAL.test : AD_IDS.INTERSTITIAL.prod,
                isTesting: useTest
            });
        } catch (e) {
            console.error('Prepare Interstitial failed', e);
        }
    }

    async showInterstitial(isTesting?: boolean): Promise<boolean> {
        const useTest = isTesting ?? IS_DEV;

        // Web Environment Fallback
        if (Capacitor.getPlatform() === 'web') {
            console.log('🌐 Web Simulation: Interstitial (Testing:', useTest, ')');
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert(`[Web Test] 전면 광고 표시됨 (모드: ${useTest ? '테스트' : '운영'})`);
            return true;
        }

        return new Promise(async (resolve) => {
            const listener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
                listener.remove();
                resolve(true);
            });

            try {
                await this.initialize(useTest);
                await this.prepareInterstitial(useTest);
                await AdMob.showInterstitial();
            } catch (e) {
                console.error('Show Interstitial failed', e);
                listener.remove();
                resolve(false);
            }
        });
    }

    // --- Reward ---
    async prepareRewardVideo(isTesting?: boolean) {
        const useTest = isTesting ?? IS_DEV;
        try {
            await AdMob.prepareRewardVideoAd({
                adId: useTest ? AD_IDS.REWARD.test : AD_IDS.REWARD.prod,
            });
        } catch (e) {
            console.error('Prepare Reward failed', e);
        }
    }

    async showRewardVideo(isTesting?: boolean): Promise<AdMobRewardItem | null> {
        const useTest = isTesting ?? IS_DEV;

        // Web Environment Fallback
        if (Capacitor.getPlatform() === 'web') {
            console.log('🌐 Web Simulation: Reward Video (Testing:', useTest, ')');
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (confirm(`[Web Test] 광고 시청을 완료하겠습니까? (모드: ${useTest ? '테스트' : '운영'})`)) {
                return { type: 'coin', amount: 10 };
            }
            return null;
        }

        return new Promise(async (resolve) => {
            let rewardedItem: AdMobRewardItem | null = null;

            const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (item) => {
                rewardedItem = item;
            });

            const dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                rewardListener.remove();
                dismissListener.remove();
                resolve(rewardedItem);
            });

            try {
                await this.initialize(useTest);
                await this.prepareRewardVideo(useTest);
                await AdMob.showRewardVideoAd();
            } catch (e) {
                console.error('Show Reward failed', e);
                rewardListener.remove();
                dismissListener.remove();
                resolve(null);
            }
        });
    }
}

export const adMobService = new AdMobService();
