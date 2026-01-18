import React from 'react';

interface TextLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const TextLayout: React.FC<TextLayoutProps> = ({ children, className = '' }) => (
    <div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex justify-center overflow-visible">
        {/* Centralized Safe Area Handling:
            - pt-[env(safe-area-inset-top)]: Avoids clock area
            - pb-[env(safe-area-inset-bottom)]: Avoids home indicator
        */}
        <div
            className={`w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-y-auto no-scrollbar shadow-2xl pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] ${className}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
        >
            {children}
        </div>
    </div>
);
