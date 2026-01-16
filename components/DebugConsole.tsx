import React, { useEffect, useState } from 'react';

const logs: string[] = [];
let notifyUpdate: (() => void) | null = null;

// INSTALL HOOKS IMMEDIATELY (Module Scope)
if (typeof window !== 'undefined') {
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args: any[]) => {
        originalLog(...args);
        const logText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

        // STRICT FILTERING
        if (logText.includes('loadData Check')) return;
        if (logText.includes('Valid cache found')) return;
        if (logText.includes('Location cached')) return;
        if (logText.includes('AdMob mock')) return;
        if (logText.includes('[App] Checking notices')) return; // Filter notice checks

        const entry = `[LOG] ${logText}|#0f0`;
        logs.unshift(entry);
        if (logs.length > 50) logs.pop();
        if (notifyUpdate) notifyUpdate();
    };

    console.error = (...args: any[]) => {
        originalError(...args);
        const logText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

        const entry = `[ERR] ${logText}|#ff5555`;
        logs.unshift(entry);
        if (logs.length > 50) logs.pop();
        if (notifyUpdate) notifyUpdate();
    };

    window.onerror = (message, source, lineno, colno, error) => {
        const entry = `[window.onerror] ${message} at ${source}:${lineno}|#ff5555`;
        logs.unshift(entry);
        if (notifyUpdate) notifyUpdate();
    };
}

const DebugConsole: React.FC = () => {
    const [_, forceUpdate] = useState(0);
    const [isVisible, setIsVisible] = useState(false); // Default Hidden

    useEffect(() => {
        notifyUpdate = () => forceUpdate(n => n + 1);
        return () => { notifyUpdate = null; };
    }, []);

    if (!isVisible) return <button onClick={() => setIsVisible(true)} style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999, opacity: 0.3, fontSize: '10px' }}>Debug</button>;

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '300px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#0f0',
            fontSize: '12px',
            overflowY: 'scroll',
            zIndex: 9999,
            pointerEvents: 'none', // Allow clicking through if needed, but we might want to scroll
            padding: '10px'
        }}>
            <div style={{ pointerEvents: 'auto', marginBottom: '5px' }}>
                <button onClick={() => setIsVisible(false)}>Hide</button>
                <button onClick={() => { logs.length = 0; forceUpdate(n => n + 1); }}>Clear</button>
            </div>
            {logs.map((log, i) => {
                const [text, color] = log.split('|');
                return (
                    <div key={i} style={{ borderBottom: '1px solid #333', padding: '2px', color: color || '#0f0' }}>
                        {text}
                    </div>
                );
            })}
        </div>
    );
};

export default DebugConsole;
