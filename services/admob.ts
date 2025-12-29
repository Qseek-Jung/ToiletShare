import { AdMob, BannerAdSize, BannerAdPosition, AdMobRewardItem, RewardAdPluginEvents, AdMobError, AdOptions, AdLoadInfo, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
// import { isPlatform } from '@ionic/react'; 

// Configuration: Test IDs vs Production IDs
const IS_DEV = import.meta.env.DEV; // Vite env

const AD_IDS = {
    // App ID: ca-app-pub-8142649369272916~9342907044 (Prod) / ca-app-pub-3940256099942544~3347511713 (Test)
    // Note: App ID is usually set in AndroidManifest.xml

    BANNER: IS_DEV ? 'ca-app-pub-3940256099942544/6300978111' : 'ca-app-pub-8142649369272916/4467321983',
    INTERSTITIAL: IS_DEV ? 'ca-app-pub-3940256099942544/1033173712' : 'ca-app-pub-8142649369272916/1434782775',
    REWARD: IS_DEV ? 'ca-app-pub-3940256099942544/5224354917' : 'ca-app-pub-8142649369272916/7157882747',
    REWARD_INTERSTITIAL: IS_DEV ? 'ca-app-pub-3940256099942544/5354046379' : 'ca-app-pub-8142649369272916/9256821724',
    NATIVE: IS_DEV ? 'ca-app-pub-3940256099942544/2247696110' : 'ca-app-pub-8142649369272916/9257432472',
};

class AdMobService {
    private initPromise: Promise<void> | null = null;
    isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;
        if (this.initPromise) return this.initPromise;

        this.initPromise = (async () => {
            try {
                await AdMob.initialize({
                    initializeForTesting: IS_DEV,
                });
                this.isInitialized = true;
                console.log('AdMob initialized');
            } catch (e) {
                console.error('AdMob init failed', e);
            }
        })();
        return this.initPromise;
    }


    // --- Banner ---
    async showBanner(position: BannerAdPosition, options?: { margin?: number }) {
        await this.initialize();
        try {
            await AdMob.showBanner({
                adId: AD_IDS.BANNER,
                adSize: BannerAdSize.ADAPTIVE_BANNER,
                position: position,
                margin: options?.margin || 0,
                // isTesting: IS_DEV
            });
        } catch (e) {
            console.error('Show Banner failed', e);
        }
    }

    async showBottomBanner() {
        await this.showBanner(BannerAdPosition.BOTTOM_CENTER);
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


    // --- Interstitial (General / Navigation) ---
    async prepareInterstitial() {
        try {
            await AdMob.prepareInterstitial({
                adId: AD_IDS.INTERSTITIAL,
                // isTesting: IS_DEV
            });
        } catch (e) {
            console.error('Prepare Interstitial failed', e);
        }
    }

    async showInterstitial(): Promise<boolean> {
        return new Promise(async (resolve) => {
            let dismissed = false;

            const listener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
                listener.remove();
                dismissed = true;
                resolve(true);
            });

            // Web Environment Fallback (Simulation)
            if (Capacitor.getPlatform() === 'web') {
                console.log('🌐 Web Environment detected: Simulating Interstitial...');
                await new Promise(resolve => setTimeout(resolve, 1500));

                alert("웹 개발 환경 테스트: 전면 광고(Interstitial)가 표시되었습니다.\n(확인을 누르면 광고가 닫힙니다)");
                resolve(true);
                return;
            }

            try {
                // Ensure loaded
                await this.initialize();
                await this.prepareInterstitial();
                await AdMob.showInterstitial();
            } catch (e) {
                console.error('Show Interstitial failed', e);
                listener.remove(); // Clean up if show failed
                resolve(false);
            }
        });
    }

    // --- Reward (Credit Charge) ---
    async prepareRewardVideo() {
        try {
            await AdMob.prepareRewardVideoAd({
                adId: AD_IDS.REWARD,
            });
        } catch (e) {
            console.error('Prepare Reward failed', e);
        }
    }

    async showRewardVideo(): Promise<AdMobRewardItem | null> {
        return new Promise(async (resolve) => {
            let rewardedItem: AdMobRewardItem | null = null;

            const onReward = (item: AdMobRewardItem) => {
                rewardedItem = item;
            };

            // Web Environment Fallback (Simulation)
            if (Capacitor.getPlatform() === 'web') {
                console.log('🌐 Web Environment detected: Simulating Ad Reward...');

                // Simulate ad preparation interaction
                await new Promise(resolve => setTimeout(resolve, 1500));

                // Simulate Reward
                const mockItem: AdMobRewardItem = { type: 'coin', amount: 10 };

                if (confirm("웹 개발 환경 테스트: 광고 시청을 완료하시겠습니까?\n(확인 = 보상지급, 취소 = 실패)")) {
                    resolve(mockItem);
                } else {
                    resolve(null);
                }
                return;
            }

            // Listener for Reward
            const listener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, onReward);
            const dismissListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
                listener.remove();
                dismissListener.remove();
                resolve(rewardedItem);
            });

            try {
                await this.initialize();
                await this.prepareRewardVideo();
                await AdMob.showRewardVideoAd();
            } catch (e) {
                console.error('Show Reward failed', e);
                listener.remove();
                dismissListener.remove();
                resolve(null);
            }
        });
    }
}

export const adMobService = new AdMobService();
