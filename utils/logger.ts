/**
 * Custom Logger Utility
 * Filters console logs to only show messages related to background colors.
 * Helps prevent log spam and clipboard issues.
 */

// Save original console methods
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

// Keywords to filter for (allow list)
const ALLOWED_KEYWORDS = [
    'background',
    'bg',
    '배경',
    '색상',
    'color',
    'viewport',
    'safe-bottom'
];

// Check if filtering is enabled (can be toggled via env or runtime flag)
const isFilteringEnabled = true;

const shouldLog = (args: any[]): boolean => {
    if (!isFilteringEnabled) return true;

    // Convert args to string and check for keywords
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ').toLowerCase();

    return ALLOWED_KEYWORDS.some(keyword => message.includes(keyword));
};

export const logger = {
    log: (...args: any[]) => {
        if (shouldLog(args)) {
            originalLog(...args);
        }
    },
    info: (...args: any[]) => {
        if (shouldLog(args)) {
            originalInfo(...args);
        }
    },
    warn: (...args: any[]) => {
        // Warnings are often important, maybe keep them or apply same filter?
        // User asked to filter "logs" which usually implies console.log
        // Let's keep warn/error visible for safety, or strictly follow "only background logs"
        // User said "배경색 관련된 로그만... 불러지게"
        // We will filter typical logs, but might keep errors. 
        // For now, let's filter 'log' and 'info', keep 'warn' and 'error' to avoid missing crashes.
        originalWarn(...args);
    },
    error: (...args: any[]) => {
        originalError(...args);
    },

    // Method to patch the global console
    init: () => {
        console.log = logger.log;
        console.info = logger.info;
        // console.warn = logger.warn; // Uncomment to filter warnings too
        // console.error = logger.error; // Uncomment to filter errors too
        originalLog('🔇 Console Log Filtering Enabled: Showing only background-related logs.');
    }
};
