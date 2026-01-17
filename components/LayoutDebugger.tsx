import React, { useState, useEffect } from 'react';

interface LayoutMetrics {
    pageWrapper: {
        paddingTop: string;
        paddingBottom: string;
        marginTop: string;
        marginBottom: string;
        height: string;
        position: string;
    };
    textLayout: {
        paddingTop: string;
        paddingBottom: string;
        marginTop: string;
        marginBottom: string;
        height: string;
        scrollTop: string;
    };
    appRoot: {
        height: string;
        paddingTop: string;
        paddingBottom: string;
    };
    safeAreaInsets: {
        top: string;
        bottom: string;
    };
}

export const LayoutDebugger: React.FC = () => {
    const [metrics, setMetrics] = useState<LayoutMetrics | null>(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const updateMetrics = () => {
            // App Root
            const appRoot = document.querySelector<HTMLElement>('[class*="h-full"][class*="flex-col"]');

            // Page Wrapper (flex-1)
            const pageWrapper = document.querySelector<HTMLElement>('[class*="flex-1"][class*="w-full"]');

            // TextLayout (scroll container)
            const textLayout = document.querySelector<HTMLElement>('[class*="overflow-y-auto"][class*="max-w-md"]');

            // Get computed safe area
            const computedStyle = window.getComputedStyle(document.documentElement);
            const safeTop = computedStyle.getPropertyValue('--safe-area-inset-top') ||
                getComputedStyle(document.body).getPropertyValue('env(safe-area-inset-top)') || '0px';
            const safeBottom = computedStyle.getPropertyValue('--safe-area-inset-bottom') ||
                getComputedStyle(document.body).getPropertyValue('env(safe-area-inset-bottom)') || '0px';

            if (appRoot && pageWrapper) {
                const appStyle = window.getComputedStyle(appRoot);
                const wrapperStyle = window.getComputedStyle(pageWrapper);
                const layoutStyle = textLayout ? window.getComputedStyle(textLayout) : null;

                setMetrics({
                    pageWrapper: {
                        paddingTop: wrapperStyle.paddingTop,
                        paddingBottom: wrapperStyle.paddingBottom,
                        marginTop: wrapperStyle.marginTop,
                        marginBottom: wrapperStyle.marginBottom,
                        height: wrapperStyle.height,
                        position: wrapperStyle.position,
                    },
                    textLayout: layoutStyle ? {
                        paddingTop: layoutStyle.paddingTop,
                        paddingBottom: layoutStyle.paddingBottom,
                        marginTop: layoutStyle.marginTop,
                        marginBottom: layoutStyle.marginBottom,
                        height: layoutStyle.height,
                        scrollTop: textLayout?.scrollTop + 'px' || '0px',
                    } : {
                        paddingTop: 'N/A',
                        paddingBottom: 'N/A',
                        marginTop: 'N/A',
                        marginBottom: 'N/A',
                        height: 'N/A',
                        scrollTop: 'N/A',
                    },
                    appRoot: {
                        height: appStyle.height,
                        paddingTop: appStyle.paddingTop,
                        paddingBottom: appStyle.paddingBottom,
                    },
                    safeAreaInsets: {
                        top: safeTop,
                        bottom: safeBottom,
                    },
                });
            }
        };

        updateMetrics();
        const interval = setInterval(updateMetrics, 500);
        return () => clearInterval(interval);
    }, []);

    if (!isVisible || !metrics) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 text-white text-[10px] font-mono p-2 max-h-[200px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 border-b border-white/20 pb-1">
                <div className="font-bold text-yellow-400">📐 LAYOUT DEBUG</div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-red-400 hover:text-red-300 px-2 py-1 rounded bg-white/10"
                >
                    ✕
                </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
                {/* Safe Area */}
                <div className="bg-purple-900/30 p-1 rounded">
                    <div className="text-purple-300 font-bold mb-1">SAFE AREA</div>
                    <div>Top: <span className="text-green-400">{metrics.safeAreaInsets.top}</span></div>
                    <div>Bottom: <span className="text-green-400">{metrics.safeAreaInsets.bottom}</span></div>
                </div>

                {/* App Root */}
                <div className="bg-blue-900/30 p-1 rounded">
                    <div className="text-blue-300 font-bold mb-1">APP ROOT</div>
                    <div>Height: <span className="text-green-400">{metrics.appRoot.height}</span></div>
                    <div>PT: <span className="text-yellow-400">{metrics.appRoot.paddingTop}</span></div>
                    <div>PB: <span className="text-yellow-400">{metrics.appRoot.paddingBottom}</span></div>
                </div>

                {/* Page Wrapper */}
                <div className="bg-red-900/30 p-1 rounded">
                    <div className="text-red-300 font-bold mb-1">PAGE WRAPPER</div>
                    <div>Pos: <span className="text-cyan-400">{metrics.pageWrapper.position}</span></div>
                    <div>H: <span className="text-green-400">{metrics.pageWrapper.height}</span></div>
                    <div>PT: <span className="text-yellow-400">{metrics.pageWrapper.paddingTop}</span></div>
                    <div>PB: <span className="text-yellow-400">{metrics.pageWrapper.paddingBottom}</span></div>
                    <div>MT: <span className="text-orange-400">{metrics.pageWrapper.marginTop}</span></div>
                    <div>MB: <span className="text-orange-400">{metrics.pageWrapper.marginBottom}</span></div>
                </div>

                {/* TextLayout */}
                <div className="bg-green-900/30 p-1 rounded">
                    <div className="text-green-300 font-bold mb-1">TEXT LAYOUT</div>
                    <div>H: <span className="text-green-400">{metrics.textLayout.height}</span></div>
                    <div>PT: <span className="text-yellow-400">{metrics.textLayout.paddingTop}</span></div>
                    <div>PB: <span className="text-yellow-400">{metrics.textLayout.paddingBottom}</span></div>
                    <div>Scroll: <span className="text-pink-400">{metrics.textLayout.scrollTop}</span></div>
                </div>
            </div>

            <div className="mt-2 text-center text-[9px] text-gray-400">
                PT=PaddingTop | PB=PaddingBottom | MT=MarginTop | MB=MarginBottom
            </div>
        </div>
    );
};
