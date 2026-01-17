import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AdDebugLog {
    timestamp: string;
    type: 'info' | 'error' | 'warning';
    message: string;
}

export const AdDebugger: React.FC = () => {
    const [logs, setLogs] = useState<AdDebugLog[]>([]);
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        // Intercept console methods
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        const addLog = (type: 'info' | 'error' | 'warning', ...args: any[]) => {
            const message = args.map(arg =>
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' ');

            // Filter for ad-related logs
            if (message.toLowerCase().includes('ad') ||
                message.toLowerCase().includes('video') ||
                message.toLowerCase().includes('youtube') ||
                message.toLowerCase().includes('mp4')) {
                setLogs(prev => [...prev.slice(-9), {
                    timestamp: new Date().toLocaleTimeString(),
                    type,
                    message
                }]);
            }
        };

        console.log = (...args) => {
            originalLog(...args);
            addLog('info', ...args);
        };

        console.error = (...args) => {
            originalError(...args);
            addLog('error', ...args);
        };

        console.warn = (...args) => {
            originalWarn(...args);
            addLog('warning', ...args);
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
            console.warn = originalWarn;
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed top-20 right-4 w-80 max-h-96 bg-black/90 backdrop-blur-md text-white rounded-lg shadow-2xl z-[9999] overflow-hidden border border-white/20">
            <div className="flex items-center justify-between p-3 bg-red-600/90 border-b border-white/20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <span className="text-sm font-bold">Ad Debug</span>
                </div>
                <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="overflow-y-auto max-h-80 p-2 space-y-1">
                {logs.length === 0 ? (
                    <div className="text-white/40 text-xs text-center py-4">
                        광고 관련 로그 대기 중...
                    </div>
                ) : (
                    logs.map((log, idx) => (
                        <div
                            key={idx}
                            className={`text-xs p-2 rounded border-l-2 ${log.type === 'error' ? 'bg-red-500/20 border-red-500' :
                                    log.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500' :
                                        'bg-blue-500/20 border-blue-500'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-white/60 font-mono">{log.timestamp}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.type === 'error' ? 'bg-red-500' :
                                        log.type === 'warning' ? 'bg-yellow-500' :
                                            'bg-blue-500'
                                    }`}>
                                    {log.type.toUpperCase()}
                                </span>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-[11px] text-white/90">
                                {log.message}
                            </pre>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
