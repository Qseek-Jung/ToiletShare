import React, { useState, useEffect, useRef } from 'react';

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
    const [position, setPosition] = useState({ x: 10, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateMetrics = () => {
            const appRoot = document.querySelector<HTMLElement>('[class*="h-full"][class*="flex-col"]');
            const pageWrapper = document.querySelector<HTMLElement>('[class*="flex-1"][class*="w-full"]');
            const textLayout = document.querySelector<HTMLElement>('[class*="overflow-y-auto"][class*="max-w-md"]');

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

    // Drag handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        });
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        const touch = e.touches[0];
        setIsDragging(true);
        setDragOffset({
            x: touch.clientX - position.x,
            y: touch.clientY - position.y,
        });
    };

    useEffect(() => {
        const handleMove = (clientX: number, clientY: number) => {
            if (isDragging) {
                setPosition({
                    x: clientX - dragOffset.x,
                    y: clientY - dragOffset.y,
                });
            }
        };

        const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        };

        const handleEnd = () => setIsDragging(false);

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleTouchMove);
            document.addEventListener('touchend', handleEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, dragOffset]);

    if (!isVisible || !metrics) return null;

    return (
        <div
            ref={panelRef}
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 9999,
                touchAction: 'none',
            }}
            className="bg-black/95 text-white text-[9px] font-mono rounded-lg shadow-2xl border border-white/20"
        >
            {/* Draggable Header */}
            <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="flex justify-between items-center px-2 py-1 border-b border-white/20 cursor-move bg-white/5 rounded-t-lg"
            >
                <div className="font-bold text-yellow-400 text-[10px]">📐 LAYOUT</div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-900/30 text-[10px]"
                >
                    ✕
                </button>
            </div>

            {/* Content - Compact 2x2 Grid */}
            <div className="p-2 grid grid-cols-2 gap-1.5" style={{ width: '280px' }}>
                {/* Safe Area */}
                <div className="bg-purple-900/30 p-1 rounded">
                    <div className="text-purple-300 font-bold mb-0.5 text-[8px]">SAFE AREA</div>
                    <div className="text-[8px]">T: <span className="text-green-400">{metrics.safeAreaInsets.top}</span></div>
                    <div className="text-[8px]">B: <span className="text-green-400">{metrics.safeAreaInsets.bottom}</span></div>
                </div>

                {/* App Root */}
                <div className="bg-blue-900/30 p-1 rounded">
                    <div className="text-blue-300 font-bold mb-0.5 text-[8px]">APP ROOT</div>
                    <div className="text-[8px]">H: <span className="text-green-400">{metrics.appRoot.height}</span></div>
                    <div className="text-[8px]">PT: <span className="text-yellow-400">{metrics.appRoot.paddingTop}</span></div>
                </div>

                {/* Page Wrapper */}
                <div className="bg-red-900/30 p-1 rounded">
                    <div className="text-red-300 font-bold mb-0.5 text-[8px]">PAGE WRAP</div>
                    <div className="text-[8px]">H: <span className="text-green-400">{metrics.pageWrapper.height}</span></div>
                    <div className="text-[8px]">PT: <span className="text-yellow-400">{metrics.pageWrapper.paddingTop}</span></div>
                    <div className="text-[8px]">MT: <span className="text-orange-400">{metrics.pageWrapper.marginTop}</span></div>
                </div>

                {/* TextLayout */}
                <div className="bg-green-900/30 p-1 rounded">
                    <div className="text-green-300 font-bold mb-0.5 text-[8px]">TEXT LAYOUT</div>
                    <div className="text-[8px]">H: <span className="text-green-400">{metrics.textLayout.height}</span></div>
                    <div className="text-[8px]">PT: <span className="text-yellow-400">{metrics.textLayout.paddingTop}</span></div>
                    <div className="text-[8px]">Scr: <span className="text-pink-400">{metrics.textLayout.scrollTop}</span></div>
                </div>
            </div>
        </div>
    );
};
