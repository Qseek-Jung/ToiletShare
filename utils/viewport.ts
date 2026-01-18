/**
 * iOS Viewport Management - Build 114
 * 
 * Strategy:
 * - Use visualViewport.height as primary source (more reliable than window.innerHeight on iOS)
 * - Dynamically update --app-height when viewport changes
 * - Force iOS to recalculate viewport after keyboard dismissal
 */

let keyboardWasOpen = false;

export function lockViewportHeight() {
    console.log('[VIEWPORT] lockViewportHeight initialized');

    // 현재 Visual Viewport 높이 기준으로 고정
    const updateHeight = () => {
        const innerH = window.innerHeight;
        // iOS에서 keyboard가 열려있으면 visualViewport.height가 줄어듬
        const visualH = window.visualViewport?.height ?? innerH;

        // iOS keyboard detection: visualViewport가 innerHeight보다 작으면 키보드가 열린 상태
        const keyboardIsOpen = visualH < innerH - 5; // 5px threshold for detection

        console.log(`[VIEWPORT] Keyboard state: ${keyboardIsOpen ? 'OPEN' : 'CLOSED'} | visualH=${visualH} innerH=${innerH} diff=${innerH - visualH}`);

        // Keyboard state change detection
        if (keyboardWasOpen && !keyboardIsOpen) {
            // Keyboard just closed! Force viewport reset
            console.log('[VIEWPORT] ⚠️ Keyboard closed detected! Triggering resetViewport()');
            setTimeout(() => {
                resetViewport();
                // Force another reset after iOS animation completes
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    document.documentElement.scrollTop = 0;
                    document.body.scrollTop = 0;
                }, 300);
            }, 100);
        }
        keyboardWasOpen = keyboardIsOpen;

        document.documentElement.style.setProperty('--app-height', `${visualH}px`);
        console.log(`[VIEWPORT] Updated --app-height to ${visualH}px | innerHeight: ${innerH}px | visualViewport: ${window.visualViewport?.height}px`);
        return visualH; // Return the calculated height
    };

    // Initial setup
    updateHeight();

    // Handle visualViewport resize (iOS keyboard, orientation, etc)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            console.log('[VIEWPORT] visualViewport resize event');
            updateHeight();
        });
    }

    // Fallback to window resize for older browsers
    window.addEventListener('resize', () => {
        console.log('[VIEWPORT] window resize event');
        updateHeight();
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
        console.log('[VIEWPORT] orientationchange event');
        setTimeout(() => {
            console.log('[VIEWPORT] Delayed update after orientationchange');
            updateHeight();
        }, 300);
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
