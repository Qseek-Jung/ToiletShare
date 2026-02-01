import React from 'react';

interface TextLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const TextLayout: React.FC<TextLayoutProps & { noPadding?: boolean }> = ({ children, className = '', noPadding = false }) => (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Centralized Safe Area Handling:
            - If noPadding is false (default): Application applies standard safe-area padding.
            - If noPadding is true: Child component handles padding/structure (e.g. for sticky headers).
        */}
        <div
            className={`relative w-full max-w-md mx-auto bg-white dark:bg-gray-800 h-full overflow-y-auto no-scrollbar shadow-2xl ${noPadding ? '' : 'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]'
                } ${className}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
            ref={(el) => {
                if (el) {
                    console.log(`[SCROLL_DEBUG] TextLayout Mounted: h=${el.clientHeight}, scrollH=${el.scrollHeight}, overflow=${window.getComputedStyle(el).overflowY}`);
                    // Only attach scroll listener if overflow is expected here
                    if (!noPadding) {
                        el.addEventListener('scroll', () => console.log(`[SCROLL_DEBUG] TextLayout Scrolled: ${el.scrollTop}`));
                    }
                }
            }}
        >
            {children}
        </div>
    </div>
);
