import React, { useEffect, useState } from 'react';

const DebugConsole: React.FC = () => {
    const [logs, setLogs] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Override console.log
        const originalLog = console.log;
        console.log = (...args) => {
            originalLog(...args);
            const logText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');

            // FILTERING RULES
            if (logText.includes('loadData Check')) return; // Ignore noise
            if (logText.includes('Valid cache found')) return;

            setLogs(prev => [`[LOG] ${logText}`, ...prev].slice(0, 50));
        };

        // Override console.error
        const originalError = console.error;
        console.error = (...args) => {
            originalError(...args);
            const logText = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            setLogs(prev => [`[ERR] ${logText}`, ...prev].slice(0, 50));
        };

        // Global error handler
        window.onerror = (message, source, lineno, colno, error) => {
            setLogs(prev => [`[window.onerror] ${message} at ${source}:${lineno}`, ...prev].slice(0, 50));
        };

        return () => {
            console.log = originalLog;
            console.error = originalError;
        };
    }, []);

    if (!isVisible) return <button onClick={() => setIsVisible(true)} style={{ position: 'fixed', bottom: 10, right: 10, zIndex: 9999 }}>Show Debug</button>;

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
                <button onClick={() => setLogs([])}>Clear</button>
            </div>
            {logs.map((log, i) => (
                <div key={i} style={{ borderBottom: '1px solid #333', padding: '2px' }}>
                    {log}
                </div>
            ))}
        </div>
    );
};

export default DebugConsole;
