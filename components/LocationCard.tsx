import React from 'react';
import { MapPin, Footprints, Copy, Navigation, ExternalLink } from 'lucide-react';
import { formatDistance } from '../utils';
import { Toilet } from '../types';

interface LocationCardProps {
    toilet: Toilet;
    distance: number;
    walkingTime: number;
    onShowMap: () => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ toilet, distance, walkingTime, onShowMap }) => {
    const handleCopyAddress = () => {
        navigator.clipboard.writeText(toilet.address);
        alert('주소가 복사되었습니다.');
    };

    const openExternalMap = (type: 'kakao' | 'naver') => {
        if (type === 'kakao') {
            window.open(`https://map.kakao.com/link/to/${toilet.name},${toilet.lat},${toilet.lng}`, '_blank');
        } else {
            window.open(`https://map.naver.com/v5/directions/-/-/${toilet.lng},${toilet.lat},${toilet.name}/-/transit?c=15,0,0,0,dh`, '_blank');
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden relative group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>

            <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-2 text-gray-500 text-xs font-bold mb-1">
                            <MapPin className="w-3 h-3" />
                            <span>현재 위치에서의 거리</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-gray-900 tracking-tight">
                                {distance ? formatDistance(distance) : '???'}
                            </span>
                            <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1">
                                <Footprints className="w-3 h-3" />
                                {walkingTime ? `도보 ${walkingTime}분` : '계산중...'}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onShowMap}
                        className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-md transition-all active:scale-95 flex flex-col items-center gap-1"
                    >
                        <Navigation className="w-5 h-5" />
                        <span className="text-[10px] font-bold">지도보기</span>
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="flex-1 text-sm text-gray-600 truncate font-medium">{toilet.address}</div>
                    <button onClick={handleCopyAddress} className="text-gray-400 hover:text-gray-600 p-1">
                        <Copy className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => openExternalMap('kakao')}
                        className="flex-1 py-2.5 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" /> 카카오맵
                    </button>
                    <button
                        onClick={() => openExternalMap('naver')}
                        className="flex-1 py-2.5 bg-[#03C75A] hover:bg-[#02B351] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                        <ExternalLink className="w-3 h-3" /> 네이버지도
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LocationCard;
