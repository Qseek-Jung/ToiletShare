import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Toilet } from '../types';

// Store links (Placeholders - Update these with actual links after registration)
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.toiletshare.app';
const APP_STORE_URL = 'https://apps.apple.com/app/id6740177708';
const WEB_LANDING_URL = 'https://toiletshare.pages.dev';

export const shareService = {
    /**
     * Get the appropriate store URL based on the current platform or target OS
     */
    getStoreUrl() {
        const platform = Capacitor.getPlatform();
        if (platform === 'ios') return APP_STORE_URL;
        if (platform === 'android') return PLAY_STORE_URL;
        return WEB_LANDING_URL;
    },

    /**
     * Share the App (General Recommendation)
     */
    async shareApp(userId: string) {
        const refCode = btoa(userId);
        const shareUrl = `${WEB_LANDING_URL}/?ref=${refCode}`;

        const title = '대똥단결 - 급똥으로 대동단결';
        const text = '내 주변 무료 개방 화장실 찾기! 지금 바로 확인해보세요.';

        await this.performShare({ title, text, url: shareUrl });
    },

    /**
     * Share a specific Toilet detail
     */
    async shareToilet(toilet: Toilet, userId: string) {
        const refCode = btoa(userId);
        // Using hash to deep link to the specific toilet
        const shareUrl = `${WEB_LANDING_URL}/?ref=${refCode}#/toilet/${toilet.id}`;

        const title = `화장실 공유: ${toilet.name}`;
        const text = `${toilet.name} 화장실 정보를 확인해보세요!\n${toilet.address}`;

        await this.performShare({ title, text, url: shareUrl });
    },

    /**
     * Core sharing logic using Capacitor Share plugin
     */
    async performShare(options: { title: string, text: string, url: string }) {
        try {
            if (Capacitor.isNativePlatform()) {
                await Share.share({
                    title: options.title,
                    text: options.text,
                    url: options.url,
                    dialogTitle: '주변에 공유하기',
                });
            } else {
                // Web fallback
                if (navigator.share) {
                    await navigator.share(options);
                } else {
                    // Clipboard fallback
                    await navigator.clipboard.writeText(options.url);
                    alert('공유 링크가 클립보드에 복사되었습니다.');
                }
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    }
};
