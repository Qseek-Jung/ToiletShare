/**
 * iOS Viewport Management - Build 114
 * 
 * Strategy:
 * - Use visualViewport.height as primary source (more reliable than window.innerHeight on iOS)
 * - Dynamically update --app-height when viewport changes
 * - Force iOS to recalculate viewport after keyboard dismissal
 */

export const lockViewportHeight = () => {
    const getViewportHeight = () => {
        // Prefer visualViewport (iOS 13+) over window.innerHeight
        return window.visualViewport?.height ?? window.innerHeight;
    };

    const updateAppHeight = () => {
        const h = getViewportHeight();
        document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
        console.log(`[VIEWPORT] Updated --app-height to ${Math.round(h)}px | innerHeight: ${window.innerHeight}px | visualViewport: ${window.visualViewport?.height}px`);
        return h;
    };

    // Initial setup
    console.log('[VIEWPORT] lockViewportHeight initialized');
    updateAppHeight();

    // Handle visualViewport resize (iOS keyboard, orientation, etc)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            console.log('[VIEWPORT] visualViewport resize event');
            updateAppHeight();
        });
    }

    // Fallback to window resize for older browsers
    window.addEventListener('resize', () => {
        console.log('[VIEWPORT] window resize event');
        updateAppHeight();
    });

    // Scroll guard: prevent iOS from shifting the container
    window.addEventListener('scroll', () => {
        if (window.scrollY !== 0) {
            console.warn(`[VIEWPORT] ⚠️ Scroll detected! scrollY: ${window.scrollY}px - Resetting to 0`);
            window.scrollTo(0, 0);
        }
    }, { passive: false });

    // Orientation change: Force immediate update
    window.addEventListener('orientationchange', () => {
        console.log('[VIEWPORT] Orientation change detected');
        setTimeout(() => {
            updateAppHeight();
            resetViewport();
        }, 100);
    });

    // Initial scroll reset
    window.scrollTo(0, 0);
};

/**
 * Force viewport recalculation for iOS stability
 * This function forces iOS to re-evaluate the viewport size by temporarily
 * modifying the viewport meta tag and triggering a resize event.
 */
export const resetViewport = () => {
    // 1. Force Scroll Reset
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    // 2. Force iOS to recalculate viewport by manipulating meta tag
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const content = viewport.getAttribute('content');
        // Temporarily change and revert to trigger recalculation
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0');

        // Force reflow
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        document.body.offsetHeight;

        // Restore original
        if (content) {
            viewport.setAttribute('content', content);
        }
    }

    // 3. Update app height based on current viewport
    const h = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);

    // 4. Dispatch resize event to wake up any lazy listeners
    window.dispatchEvent(new Event('resize'));
};
