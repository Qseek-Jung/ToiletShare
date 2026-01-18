import React, { useState, useEffect, useRef } from 'react';
import { X, Move } from 'lucide-react';

export const LayoutSniffer: React.FC = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [metrics, setMetrics] = useState({
        innerHeight: 0,
        screenHeight: 0,
        safeBottom: '0px',
        appHeightVar: 'unset',
        rootHeight: 0
    });

    const [position, setPosition] = useState({ x: 20, y: 100 });
    const isDragging = useRef(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const updateMetrics = () => {
        const root = document.getElementById('root');
        const computedStyle = getComputedStyle(document.documentElement);

        // Strategy: Create a temporary element to measure env() if needed, 
        // but often we can just read it from a padded element
        const bodyStyle = getComputedStyle(document.body);

        setMetrics({
            innerHeight: window.innerHeight,
            screenHeight: window.screen.height,
            safeBottom: computedStyle.getPropertyValue('--safe-bottom') || 'N/A (Check #root padding)',
            appHeightVar: computedStyle.getPropertyValue('--app-height') || 'not set',
            rootHeight: root?.offsetHeight || 0
        });
    };

    useEffect(() => {
        if (!isVisible) return;

        updateMetrics();
        window.addEventListener('resize', updateMetrics);
        const interval = setInterval(updateMetrics, 1000); // Poll for late syncs

        return () => {
            window.removeEventListener('resize', updateMetrics);
            clearInterval(interval);
        };
    }, [isVisible]);

    const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
        isDragging.current = true;
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        dragOffset.current = {
            x: clientX - position.x,
            y: clientY - position.y
        };
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent | TouchEvent) => {
            if (!isDragging.current) return;
            const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
            const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

            setPosition({
                x: clientX - dragOffset.current.x,
                y: clientY - dragOffset.current.y
            });
        };

        const onMouseUp = () => {
            isDragging.current = false;
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onMouseMove);
        window.addEventListener('touchend', onMouseUp);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onMouseMove);
            window.removeEventListener('touchend', onMouseUp);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <div
            style={{
                left: position.x,
                top: position.y,
                transform: 'translate3d(0,0,0)'
            }}
            className="fixed z-[9999] w-72 bg-black/90 text-green-400 p-4 rounded-xl border-2 border-green-500/50 shadow-2xl font-mono text-[10px] backdrop-blur-md select-none"
        >
            <div
                className="flex justify-between items-center mb-2 pb-2 border-b border-green-500/20 cursor-move active:cursor-grabbing"
                onMouseDown={onMouseDown}
                onTouchStart={onMouseDown}
            >
                <div className="flex items-center gap-1">
                    <Move className="w-3 h-3" />
                    <span className="font-bold">LAYOUT SNIFFER (V114)</span>
                </div>
                <button onClick={() => setIsVisible(false)} className="text-white bg-red-500/20 p-1 rounded hover:bg-red-500/40 transition-colors">
                    <X className="w-3 h-3" />
                </button>
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between">
                    <span>window.innerHeight:</span>
                    <span className="text-white font-bold">{metrics.innerHeight}px</span>
                </div>
                <div className="flex justify-between">
                    <span>window.screen.height:</span>
                    <span className="text-white font-bold">{metrics.screenHeight}px</span>
                </div>
                <div className="flex justify-between text-yellow-400">
                    <span>DIFFERENCE:</span>
                    <span className="font-black">{metrics.screenHeight - metrics.innerHeight}px</span>
                </div>
                <div className="h-px bg-green-500/20 my-1" />
                <div className="flex justify-between">
                    <span>#root height:</span>
                    <span className="text-white font-bold">{metrics.rootHeight}px</span>
                </div>
                <div className="flex justify-between">
                    <span>--app-height:</span>
                    <span className="text-blue-400 font-bold">{metrics.appHeightVar}</span>
                </div>
                <div className="h-px bg-green-500/20 my-1" />
                <p className="text-[9px] text-green-500/60 leading-tight">
                    * If root height &lt; screen height, background sync must fill body/html to prevent white gaps.
                </p>
                <div className="flex justify-between text-pink-400">
                    <span>gap theory:</span>
                    <span className="font-bold">
                        {metrics.screenHeight - metrics.rootHeight > 0 ? 'Short Root Detected!' : 'Root Covers Screen'}
                    </span>
                </div>
            </div>

            <button
                onClick={updateMetrics}
                className="w-full mt-3 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded text-[9px] font-bold transition-all uppercase"
            >
                Manual Refresh
            </button>
        </div>
    );
};
