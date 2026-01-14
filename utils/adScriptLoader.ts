const ADSENSE_PUB_ID = import.meta.env.VITE_ADSENSE_PUB_ID || "";

let isScriptLoaded = false;
let isScriptLoading = false;

export const loadAdSenseScript = (): void => {
    if (isScriptLoaded || isScriptLoading) return;

    // Check if script already exists in DOM (defensive)
    if (document.querySelector('script[src*="adsbygoogle.js"]')) {
        isScriptLoaded = true;
        return;
    }

    isScriptLoading = true;

    try {
        const script = document.createElement('script');
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUB_ID}`;

        script.onload = () => {
            isScriptLoaded = true;
            isScriptLoading = false;
            console.log("💰 AdSense Script Loaded Successfully (Singleton)");
        };

        script.onerror = (e) => {
            console.error("Failed to load AdSense script", e);
            isScriptLoading = false; // Allow retry
        };

        document.head.appendChild(script);
    } catch (e) {
        console.error("Error inserting AdSense script", e);
        isScriptLoading = false;
    }
};
