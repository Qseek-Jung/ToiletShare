export interface PlatformAdapter {
    /**
     * Returns the appropriate Google Maps API Key for the current environment.
     * Note: Capacitor WebViews (Android/iOS) typically need the Browser (Web) Key,
     * not the Native SDK Key, unless using the Native Maps Plugin.
     */
    getGoogleMapsApiKey(): string;

    /**
     * Type of the current platform
     */
    readonly type: 'web' | 'android' | 'ios';
}
