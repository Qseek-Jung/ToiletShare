
import React from 'react';
import { REGION_BOUNDS } from '../../../utils/regionBounds';

interface RegionSelectorProps {
    selectedRegion: string;
    onRegionChange: (regionKey: string) => void;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({ selectedRegion, onRegionChange }) => {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
                1. 작업 대상 지역 선택
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
                {Object.entries(REGION_BOUNDS).filter(([key]) => key === 'National').map(([key, bound]) => (
                    <button
                        key={key}
                        onClick={() => onRegionChange(key)}
                        className={`
                            px-6 py-2 rounded-lg text-sm font-bold transition-all border-2
                            ${selectedRegion === key
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100 hover:border-blue-200'
                            }
                        `}
                    >
                        {bound.name}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {Object.entries(REGION_BOUNDS).filter(([key]) => key !== 'National').map(([key, bound]) => (
                    <button
                        key={key}
                        onClick={() => onRegionChange(key)}
                        className={`
                            px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${selectedRegion === key
                                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }
                        `}
                    >
                        {bound.name}
                    </button>
                ))}
            </div>
            {selectedRegion && (
                <p className="mt-2 text-xs text-blue-600 font-medium">
                    * 선택된 지역: {REGION_BOUNDS[selectedRegion].name} (이 범위를 벗어나면 오류로 감지합니다)
                </p>
            )}
        </div>
    );
};
