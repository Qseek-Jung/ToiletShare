import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Footprints } from 'lucide-react';
import { formatDistance } from '../utils';

interface DistanceDisplayProps {
    distance: number;
    walkingTime: number;
}

const DistanceDisplay: React.FC<DistanceDisplayProps> = ({ distance, walkingTime }) => {
    const { t } = useTranslation();
    return (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg shadow-blue-200">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 opacity-90">
                    <MapPin className="w-5 h-5" />
                    <span className="text-sm font-medium">{t('distance_from_current', '현 위치에서의 거리')}</span>
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{formatDistance(distance)}</span>
                </div>

                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">
                    <Footprints className="w-4 h-4" />
                    <span className="text-sm font-bold">{t('walking_time_approx', { time: walkingTime, defaultValue: '도보 약 {{time}}분' })}</span>
                </div>
            </div>
        </div>
    );
};

export default DistanceDisplay;
