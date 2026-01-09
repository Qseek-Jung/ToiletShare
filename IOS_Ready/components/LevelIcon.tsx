import React from 'react';
import { useTranslation } from 'react-i18next';

interface LevelIconProps {
    level: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showLabel?: boolean;
    className?: string;
}

export const LevelIcon: React.FC<LevelIconProps> = ({ level, size = 'md', showLabel = false, className = '' }) => {
    const { t } = useTranslation();
    let iconSrc;
    let label;
    let colorClass;

    switch (level) {
        case 6: // Bidet
            iconSrc = "/images/levels/level_6.png";
            colorClass = "text-sky-500";
            label = t('level_bidet', "비데");
            break;
        case 5: // Wet Tissue
            iconSrc = "/images/levels/level_5.png";
            colorClass = "text-blue-400";
            label = t('level_wet_tissue', "물티슈");
            break;
        case 4: // Box Tissue
            iconSrc = "/images/levels/level_4.png";
            colorClass = "text-purple-400";
            label = t('level_box_tissue', "각티슈");
            break;
        case 3: // Roll Tissue
            iconSrc = "/images/levels/level_3.png";
            colorClass = "text-gray-900 dark:text-gray-100";
            label = t('level_roll_tissue', "두루마리");
            break;
        case 2: // Newspaper
            iconSrc = "/images/levels/level_2.png";
            colorClass = "text-gray-500";
            label = t('level_newspaper', "신문지");
            break;
        case 1: // Straw
            iconSrc = "/images/levels/level_1.png";
            colorClass = "text-yellow-600";
            label = t('level_straw', "지푸라기");
            break;
        case 0: // Hand
        default:
            iconSrc = "/images/levels/level_0.png";
            colorClass = "text-amber-700";
            label = t('level_hand', "맨손");
            break;
    }

    const sizeClasses = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-10 h-10",
        xl: "w-24 h-24"
    };

    const iconSize = sizeClasses[size];

    // Always use PNG images as requested, resizing via class names
    return (
        <div className={`flex items-center gap-2 ${className}`} title={`레벨 ${level}: ${label}`}>
            <img src={iconSrc} alt={label} className={`object-contain ${iconSize}`} />
            {showLabel && <span className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'} ${colorClass}`}>{label} (Lv. {level})</span>}
        </div>
    );
};
