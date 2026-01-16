// Mock implementation to remove dependency on @capacitor-community/admob

export enum BannerAdPosition {
    TOP_CENTER = 'TOP_CENTER',
    BOTTOM_CENTER = 'BOTTOM_CENTER',
    CENTER = 'CENTER',
    TOP_LEFT = 'TOP_LEFT',
    TOP_RIGHT = 'TOP_RIGHT',
    BOTTOM_LEFT = 'BOTTOM_LEFT',
    BOTTOM_RIGHT = 'BOTTOM_RIGHT'
}

export interface AdMobRewardItem {
    type: string;
    amount: number;
}

class AdMobService {
    async initialize(isTesting?: boolean) { console.log('AdMob mock init'); }
    async showBanner(position: BannerAdPosition, options?: { margin?: number }) { console.log('AdMob mock showBanner'); }
    async showBottomBanner() { console.log('AdMob mock showBottomBanner'); }
    async hideBanner() { console.log('AdMob mock hideBanner'); }
    async removeBanner() { console.log('AdMob mock removeBanner'); }
    async prepareInterstitial() { console.log('AdMob mock prepareInterstitial'); }
    async showInterstitial(): Promise<boolean> { console.log('AdMob mock showInterstitial'); return false; }
    async prepareRewardVideo() { console.log('AdMob mock prepareRewardVideo'); }
    async showRewardVideo(): Promise<AdMobRewardItem | null> { console.log('AdMob mock showRewardVideo'); return null; }
}

export const adMobService = new AdMobService();
