/**
 * Lock viewport height to prevent iOS Safari dynamic resizing
 * 
 * Strategy:
 * - Use visualViewport.height (more accurate than window.innerHeight)
 * - Filter out small changes (keyboard, temporary UI)
 * - Multi-phase initialization for iOS stabilization
 */
export const lockViewportHeight = () => {
    let maxH = 0;
    let lastW = window.innerWidth;

    const getH = () => window.visualViewport?.height ?? window.innerHeight;

    const set = (h: number) => {
        if (h > maxH) maxH = h;
        document.documentElement.style.setProperty('--app-height', `${Math.round(maxH)}px`);
    };

    const init = () => {
        const h = getH();
        if (h > maxH) {
            maxH = h;
            set(maxH);
        }
    };

    // Multi-phase initialization: iOS stabilizes viewport height asynchronously
    init();
    requestAnimationFrame(init);
    setTimeout(init, 50);
    setTimeout(init, 200); // Late catch for safe-area insets

    // Handle resize events with filtering
    const onResize = () => {
        const h = getH();
        const w = window.innerWidth;
        const isOrientationChange = Math.abs(w - lastW) > 50;

        if (isOrientationChange) {
            maxH = h; // Reset latch on rotation
            lastW = w;
            set(maxH);
            resetViewport();
        } else if (h > maxH + 5) {
            // Expansion detected (e.g. status bar hidden or safe area resolved)
            maxH = h;
            set(maxH);
        }
        // Shrinks (h < maxH) are ignored (keyboard/temp UI)
    };

    // Scroll guard: prevent iOS from shifting the container up/down
    window.addEventListener('scroll', (e) => {
        if (window.scrollY !== 0) {
            window.scrollTo(0, 0);
        }
    }, { passive: false });

    // Orientation change: Force update with delay
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            const h = getH();
            maxH = h;
            set(maxH);
        }, 150);
    });

    // Listen to both visualViewport and window resize
    window.visualViewport?.addEventListener('resize', onResize);
    window.addEventListener('resize', onResize);

    // Initial scroll reset
    window.scrollTo(0, 0);
};

/**
 * Force scroll reset and layout recalculation for iOS stability
 */
export const resetViewport = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    // Force browser to recalculate fixed layouts
    const root = document.getElementById('root');
    if (root) {
        root.style.transform = 'translateZ(0)'; // force layer promotion
    }
    document.body.style.display = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    document.body.offsetHeight; // trigger reflow
    document.body.style.display = '';
};

