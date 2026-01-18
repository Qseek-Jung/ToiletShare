import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export const iOSDebugger: React.FC = () => {
    const [metrics, setMetrics] = useState<{
        // Scroll & Position
        windowScrollY: number;
        bodyScrollTop: number;
        docScrollTop: number;
        visualViewportOffsetTop: number;
        rootTop: number;
        bodyTop: number;

        // Heights
        windowInnerHeight: number;
        visualViewportHeight: number;
        appHeightVar: string;
        screenHeight: number;

        // Backgrounds
        htmlBg: string;
        bodyBg: string;
        rootBg: string;
        isDarkMode: boolean;

        // Safe Area
        safeAreaTop: string;
        safeAreaBottom: string;
    }>({
        windowScrollY: 0,
        bodyScrollTop: 0,
        docScrollTop: 0,
        visualViewportOffsetTop: 0,
        rootTop: 0,
        bodyTop: 0,
        windowInnerHeight: 0,
        visualViewportHeight: 0,
        appHeightVar: 'N/A',
        screenHeight: 0,
        htmlBg: '',
        bodyBg: '',
        rootBg: '',
        isDarkMode: false,
        safeAreaTop: '0px',
        safeAreaBottom: '0px'
    });

    const updateMetrics = () => {
        const root = document.getElementById('root');
        const html = document.documentElement;
        const body = document.body;

        const computedHtml = window.getComputedStyle(html);
        const computedBody = window.getComputedStyle(body);
        const computedRoot = root ? window.getComputedStyle(root) : null;

        const rootRect = root?.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();

        setMetrics({
            // Scroll & Position (이게 레이아웃 갭의 핵심!)
            windowScrollY: window.scrollY,
            bodyScrollTop: body.scrollTop,
            docScrollTop: html.scrollTop,
            visualViewportOffsetTop: window.visualViewport?.offsetTop ?? 0,
            rootTop: rootRect?.top ?? 0,
            bodyTop: bodyRect.top,

            // Heights
            windowInnerHeight: window.innerHeight,
            visualViewportHeight: window.visualViewport?.height ?? 0,
            appHeightVar: computedHtml.getPropertyValue('--app-height') || 'not set',
            screenHeight: window.screen.height,

            // Backgrounds (스플래시 흰색 진단)
            htmlBg: computedHtml.backgroundColor,
            bodyBg: computedBody.backgroundColor,
            rootBg: computedRoot?.backgroundColor ?? 'N/A',
            isDarkMode: html.classList.contains('dark'),

            // Safe Area
            safeAreaTop: computedHtml.getPropertyValue('--safe-area-inset-top') || '0px',
            safeAreaBottom: computedHtml.getPropertyValue('--safe-area-inset-bottom') ||
                computedHtml.getPropertyValue('--safe-bottom') || '0px'
        });
    };

    useEffect(() => {
        updateMetrics();
        const interval = setInterval(updateMetrics, 500); // 0.5초마다 업데이트

        window.addEventListener('resize', updateMetrics);
        window.addEventListener('scroll', updateMetrics);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateMetrics);
            window.removeEventListener('scroll', updateMetrics);
        };
    }, []);

    const hasLayoutGap = metrics.windowScrollY > 0 ||
        metrics.visualViewportOffsetTop > 0 ||
        metrics.rootTop > 0;

    return (
        <div
            className="fixed top-0 left-0 right-0 z-[99999] bg-black text-white p-2 font-mono text-[10px] border-b-2 border-red-500 select-none"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 99999,
                pointerEvents: 'auto'
            }}
        >
            <div className="flex justify-between items-center mb-2">
                <div className="font-bold text-yellow-400">🔍 iOS Layout Debugger V115</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
                {/* 레이아웃 갭 진단 */}
                <div className="col-span-2 bg-red-900/30 p-2 rounded border border-red-500/50">
                    <div className="font-bold text-red-300 mb-1">⚠️ LAYOUT GAP CHECK</div>
                    <div className="grid grid-cols-2 gap-1">
                        <div className={metrics.windowScrollY > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
                            window.scrollY: {metrics.windowScrollY}px
                        </div>
                        <div className={metrics.visualViewportOffsetTop > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
                            vvp.offsetTop: {metrics.visualViewportOffsetTop}px
                        </div>
                        <div className={metrics.rootTop !== 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
                            #root.top: {metrics.rootTop.toFixed(1)}px
                        </div>
                        <div className={metrics.bodyScrollTop > 0 ? 'text-red-400 font-bold' : 'text-green-400'}>
                            body.scrollTop: {metrics.bodyScrollTop}px
                        </div>
                    </div>
                    {hasLayoutGap && (
                        <div className="mt-1 text-red-300 font-bold text-center">
                            ❌ GAP DETECTED!
                        </div>
                    )}
                    {!hasLayoutGap && (
                        <div className="mt-1 text-green-300 font-bold text-center">
                            ✅ LAYOUT OK
                        </div>
                    )}
                </div>

                {/* 높이 정보 */}
                <div className="bg-blue-900/30 p-2 rounded border border-blue-500/50">
                    <div className="font-bold text-blue-300 mb-1">📏 Heights</div>
                    <div>inner: {metrics.windowInnerHeight}px</div>
                    <div>vvp: {metrics.visualViewportHeight}px</div>
                    <div className="text-yellow-300">--app-h: {metrics.appHeightVar}</div>
                    <div className="text-gray-400">screen: {metrics.screenHeight}px</div>
                </div>

                {/* 배경색 진단 (스플래시 흰색 문제) */}
                <div className="bg-purple-900/30 p-2 rounded border border-purple-500/50">
                    <div className="font-bold text-purple-300 mb-1">🎨 Backgrounds</div>
                    <div className="flex items-center gap-1">
                        HTML: <div className="w-4 h-4 rounded" style={{ backgroundColor: metrics.htmlBg }}></div>
                        <span className="text-[9px]">{metrics.htmlBg}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        Body: <div className="w-4 h-4 rounded" style={{ backgroundColor: metrics.bodyBg }}></div>
                        <span className="text-[9px]">{metrics.bodyBg}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        Root: <div className="w-4 h-4 rounded" style={{ backgroundColor: metrics.rootBg }}></div>
                    </div>
                    <div className="text-gray-400">Mode: {metrics.isDarkMode ? 'Dark' : 'Light'}</div>
                </div>

                {/* Safe Area */}
                <div className="col-span-2 bg-gray-800/50 p-2 rounded border border-gray-500/50">
                    <div className="font-bold text-gray-300 mb-1">📱 Safe Area</div>
                    <div className="grid grid-cols-2 gap-1">
                        <div>Top: {metrics.safeAreaTop}</div>
                        <div>Bottom: {metrics.safeAreaBottom}</div>
                    </div>
                </div>
            </div>

            <button
                onClick={updateMetrics}
                className="w-full mt-2 py-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded text-[10px] font-bold"
            >
                🔄 REFRESH
            </button>
        </div>
    );
};
