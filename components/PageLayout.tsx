import React from 'react';

interface PageLayoutProps {
    children: React.ReactNode;
    className?: string;
}

<div className="w-full h-full bg-gray-50 dark:bg-gray-900 flex justify-center overflow-hidden">
    <div className={`w-full max-w-md bg-white dark:bg-gray-800 h-full overflow-y-auto no-scrollbar shadow-2xl pt-[env(safe-area-inset-top)] ${className}`} style={{ WebkitOverflowScrolling: 'touch' }}>
        {children}
    </div>
</div>
);
