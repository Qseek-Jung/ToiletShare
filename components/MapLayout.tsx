import React from 'react';

interface MapLayoutProps {
    children: React.ReactNode;
    className?: string;
}

export const MapLayout: React.FC<MapLayoutProps> = ({ children, className = '' }) => (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
        {/* Map Layer: Absolute Full - NO Safe Area padding applied to container */}
        <div className="absolute inset-0 z-0 bg-gray-100 dark:bg-gray-900">
            {children}
        </div>
    </div>
);
