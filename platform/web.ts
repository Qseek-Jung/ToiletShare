import { PlatformAdapter } from './interface';

export const WebAdapter: PlatformAdapter = {
    type: 'web',
    getGoogleMapsApiKey: () => {
        // Web/Localhost uses the Local Test Key (GKOm4)
        return import.meta.env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST ||
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
            "";
    }
};
