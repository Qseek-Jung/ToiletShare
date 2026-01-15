import { PlatformAdapter } from './interface';

export const AndroidAdapter: PlatformAdapter = {
    type: 'android',
    getGoogleMapsApiKey: () => {
        // User-specified Production Key (OPQI) for Capacitor Android Build
        // Renamed to WEBVIEW as per user request to avoid confusion
        return import.meta.env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW ||
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY || // Fallback to injected defined key
            "";
    }
};
