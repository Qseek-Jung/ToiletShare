/**
 * Lock viewport height to prevent iOS Safari dynamic resizing
 * 
 * Strategy:
 * - Use visualViewport.height (more accurate than window.innerHeight)
 * - Filter out small changes (keyboard, temporary UI)
 * - Multi-phase initialization for iOS stabilization
 */
export const lockViewportHeight = () => {
    let base = 0;

    const getH = () => window.visualViewport?.height ?? window.innerHeight;

    const set = (h: number) => {
        document.documentElement.style.setProperty('--app-height', `${Math.round(h)}px`);
    };

    const init = () => {
        base = getH();
        set(base);
    };

    // Multi-phase initialization: iOS stabilizes viewport height asynchronously
    init();                        // Immediate
    requestAnimationFrame(init);   // Next frame
    setTimeout(init, 50);          // 50ms delay for late updates

    // Handle resize events with filtering
    const onResize = () => {
        const h = getH();
        // Only update on significant changes (rotation, window resize)
        // Ignore small changes (keyboard: ~60-100px, iOS UI: ~40-50px)
        if (Math.abs(h - base) > 80) {
            base = h;
            set(base);
        }
    };

    // Orientation change: Force update with delay
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            base = getH();
            set(base);
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
    window.scrollTo(0, 0);
    // Force browser to recalculate fixed layouts
    document.body.style.display = 'none';
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    document.body.offsetHeight; // trigger reflow
    document.body.style.display = '';
};

