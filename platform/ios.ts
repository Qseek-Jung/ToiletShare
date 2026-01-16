import { PlatformAdapter } from './interface';

export const IOSAdapter: PlatformAdapter = {
    type: 'ios',
    getGoogleMapsApiKey: () => {
        // iOS WebView also uses the Production/WebView key (OPQI) as requested
        return import.meta.env.VITE_GOOGLE_MAPS_API_KEY_IOS ||
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW ||
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
            "";
    }
};
