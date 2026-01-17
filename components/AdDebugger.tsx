import React, { useState, useEffect } from 'react';

/**
 * AdDebugger: Intercepts console logs related to ads and video playback
 * to help diagnose why MP4 ads are not playing on iOS.
 */
export const AdDebugger: React.FC = () => {
    const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'error' | 'warn'; time: string }[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const addLog = (msg: any, type: 'info' | 'error' | 'warn') => {
            const strMsg = typeof msg === 'string' ? msg : JSON.stringify(msg);
            // Only capture ad/video related logs
            if (
                strMsg.toLowerCase().includes('ad') ||
                strMsg.toLowerCase().includes('video') ||
                strMsg.toLowerCase().includes('mp4') ||
                strMsg.toLowerCase().includes('youtube') ||
                strMsg.toLowerCase().includes('playback')
            ) {
                setLogs(prev => [{
                    msg: strMsg,
                    type,
                    time: new Date().toLocaleTimeString()
                }, ...prev].slice(0, 50));
            }
        };

        console.log = (...args) => {
            addLog(args.join(' '), 'info');
            originalLog.apply(console, args);
        };
        console.error = (...args) => {
            addLog(args.join(' '), 'error');
            originalError.apply(console, args);
        };
        console.warn = (...args) => {
            addLog(args.join(' '), 'warn');
            originalWarn.apply(console, args);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    if (!isVisible) return (
        <button
            onClick={() => setIsVisible(true)}
            className="fixed top-20 right-2 z-[9999] bg-red-600 text-white text-[10px] p-2 rounded-full opacity-50"
        >
            AD LOGS
        </button>
    );

    return (
        <div className="fixed top-20 left-2 right-2 h-[200px] z-[9999] bg-black/90 border border-red-500 rounded-lg overflow-hidden flex flex-col font-mono text-[10px]">
            <div className="bg-red-900/50 p-2 flex justify-between items-center border-b border-red-500/30">
                <span className="font-bold text-red-100">📺 AD DEBUGGER</span>
                <button onClick={() => setIsVisible(false)} className="text-white px-2">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {logs.length === 0 ? (
                    <div className="text-gray-500 italic">No ad logs captured yet...</div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className={`border-b border-white/5 pb-1 ${log.type === 'error' ? 'text-red-400' :
                                log.type === 'warn' ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                            <span className="opacity-50 mr-1">[{log.time}]</span>
                            {log.msg}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
