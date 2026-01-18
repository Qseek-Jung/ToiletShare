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
    console.log('[VIEWPORT] 🔧 resetViewport() called');
    console.log(`[VIEWPORT] Current state BEFORE reset: innerH=${window.innerHeight} visualH=${window.visualViewport?.height}`);

    // 1. Force Scroll Reset (Multiple methods)
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;

    // 2. AGGRESSIVE: Force iOS to recalculate viewport by meta tag manipulation
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
        const originalContent = viewport.getAttribute('content');
        console.log('[VIEWPORT] Temporarily removing viewport meta...');

        // STEP 1: Remove viewport meta completely
        viewport.setAttribute('content', '');
        document.body.offsetHeight; // Force reflow

        // STEP 2: Set to minimal scale
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0');
        document.body.offsetHeight; // Force reflow

        // STEP 3: Restore original
        if (originalContent) {
            viewport.setAttribute('content', originalContent);
        }
        document.body.offsetHeight; // Force reflow
    }

    // 3. Force window resize event to trigger height recalculation
    window.dispatchEvent(new Event('resize'));

    // 4. Update --app-height to full viewport
    const finalHeight = window.visualViewport?.height ?? window.innerHeight;
    document.documentElement.style.setProperty('--app-height', `${finalHeight}px`);

    console.log(`[VIEWPORT] State AFTER reset: innerH=${window.innerHeight} visualH=${window.visualViewport?.height} --app-height=${finalHeight}px`);
    console.log('[VIEWPORT] ✅ resetViewport() complete');
};
