import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { MAPS_API_KEY } from '../config';

interface GoogleMapsContextType {
    isLoaded: boolean;
    loadError: Error | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
    isLoaded: false,
    loadError: null,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
    children: ReactNode;
}

const LIBRARIES: ("marker" | "geometry")[] = ["marker", "geometry"];

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [loadError, setLoadError] = useState<Error | null>(null);

    useEffect(() => {
        // If already loaded globally
        if (window.google?.maps) {
            setIsLoaded(true);
            return;
        }

        // Check if script is already present but maybe loading
        const existingScript = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
        if (existingScript) {
            // Poll for completion
            const interval = setInterval(() => {
                if (window.google?.maps) {
                    clearInterval(interval);
                    setIsLoaded(true);
                }
            }, 100);
            return () => clearInterval(interval);
        }

        // Load Script
        const script = document.createElement('script');
        // Add callback query param to ensure we know exactly when it's done
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&loading=async&libraries=${LIBRARIES.join(',')}&language=ko`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            // Sometimes window.google.maps isn't immediately available even after onload for async scripts if callback isn't used strictly
            // But with loading=async, we usually wait for the promise or callback. 
            // Simplest robust way: poll briefly or wait.
            // Actually, for google maps specifically, it's safer to check existence.
            if (window.google?.maps) {
                setIsLoaded(true);
            } else {
                // Fallback polling
                const check = setInterval(() => {
                    if (window.google?.maps) {
                        clearInterval(check);
                        setIsLoaded(true);
                    }
                }, 50);
            }
        };

        script.onerror = (e) => {
            setLoadError(new Error("Failed to load Google Maps script"));
            console.error("Google Maps Load Error:", e);
        };

        document.head.appendChild(script);

    }, []);

    return (
        <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
            {children}
        </GoogleMapsContext.Provider>
    );
};
