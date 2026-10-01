import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zh from './locales/zh.json';
import zhTW from './locales/zh-TW.json';

export const SUPPORTED_LANGUAGES = ['ko', 'en', 'ja', 'zh', 'zh-TW'] as const;

// Map a device/browser locale to one of our translations.
// Traditional Chinese regions -> zh-TW, other Chinese -> zh (Simplified),
// everything else -> its base language. Unsupported languages fall back to English.
const toSupportedLanguage = (lng: string): string => {
    const lower = (lng || '').toLowerCase();
    if (lower.startsWith('zh')) {
        return /(-tw|-hk|-mo|-hant)/.test(lower) ? 'zh-TW' : 'zh';
    }
    return lower.split('-')[0];
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ko: { translation: ko },
            en: { translation: en },
            ja: { translation: ja },
            zh: { translation: zh },
            'zh-TW': { translation: zhTW },
        },
        supportedLngs: [...SUPPORTED_LANGUAGES],
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            convertDetectedLanguage: toSupportedLanguage,
        },
    });

export default i18n;
