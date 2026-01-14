import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Navigation, MapPin, ExternalLink } from 'lucide-react';
import { Toilet } from '../types';
import { formatDistance, getMarkerImage, calculateDistance } from '../utils';
const MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

interface NavigationModalProps {
    toilet: Toilet;
    myLocation: { lat: number, lng: number };
    onClose: () => void;
    userRole?: any; // To determine marker type
}

const NavigationModal: React.FC<NavigationModalProps> = ({ toilet, myLocation, onClose, userRole }) => {
    const { t } = useTranslation();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const [distance, setDistance] = useState<number>(0);
    const [walkingTime, setWalkingTime] = useState<number>(0);

    // Initial calculation
    useEffect(() => {
        const d = calculateDistance(myLocation.lat, myLocation.lng, toilet.lat, toilet.lng);
        setDistance(d);
        setWalkingTime(Math.ceil(d / 67));
    }, [myLocation, toilet]);

    useEffect(() => {
        const initMap = () => {
            if (!mapRef.current || !window.google?.maps) return;

            // Calculate bounds to fit both points
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(myLocation);
            bounds.extend({ lat: toilet.lat, lng: toilet.lng });

            const map = new window.google.maps.Map(mapRef.current, {
                center: myLocation, // Will be overridden by fitBounds
                zoom: 15,
                disableDefaultUI: true,
            });
            mapInstance.current = map;

            // Fit bounds with padding
            map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });

            // 1. My Location Marker (Pulsing Dot)
            new window.google.maps.Marker({
                position: myLocation,
                map: map,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 8,
                    fillColor: "#3B82F6",
                    fillOpacity: 1,
                    strokeColor: "#FFFFFF",
                    strokeWeight: 2,
                },
                zIndex: 2,
                title: t('my_location', '내 위치')
            });

            // 2. Toilet Marker
            const markerImg = getMarkerImage(toilet, userRole, true);
            new window.google.maps.Marker({
                position: { lat: toilet.lat, lng: toilet.lng },
                map: map,
                icon: {
                    url: markerImg,
                    scaledSize: new window.google.maps.Size(40, 52),
                    anchor: new window.google.maps.Point(20, 52)
                },
                zIndex: 1,
                title: toilet.name
            });

            // 3. Draw Polyling (Simple Line)
            const path = new window.google.maps.Polyline({
                path: [myLocation, { lat: toilet.lat, lng: toilet.lng }],
                geodesic: true,
                strokeColor: '#3B82F6',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                icons: [{
                    icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2 },
                    offset: '50%'
                }]
            });
            path.setMap(map);
        };

        // Check if API loaded
        if (window.google?.maps) {
            initMap();
        } else {
            // Very simple fallback if not loaded (Should be loaded by App or DetailPage)
            const script = document.createElement("script");
            script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&loading=async`;
            script.async = true;
            script.onload = initMap;
            document.head.appendChild(script);
        }
    }, [myLocation, toilet]);

    const openExternalMap = (type: 'kakao' | 'naver') => {
        if (type === 'kakao') {
            window.open(`https://map.kakao.com/link/to/${toilet.name},${toilet.lat},${toilet.lng}`, '_blank');
        } else {
            window.open(`https://map.naver.com/v5/directions/-/-/${toilet.lng},${toilet.lat},${toilet.name}/-/transit?c=15,0,0,0,dh`, '_blank');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white">
            {/* Header */}
            <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-blue-500" />
                    {t('nav_directions', '오는 길')}
                </h2>
                <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
                    <X className="w-6 h-6" />
                </button>
            </div>

            {/* Map Area */}
            <div className="flex-1 relative bg-gray-100">
                <div ref={mapRef} className="w-full h-full" />

                {/* Distance Overlay */}
                <div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
                    <div className="inline-block bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-white/50">
                        <div className="flex items-center gap-3">
                            <div className="text-xl font-black text-gray-900">{formatDistance(distance)}</div>
                            <div className="w-px h-4 bg-gray-300"></div>
                            <div className="text-sm font-bold text-gray-600">{t('walking_time', { time: walkingTime, defaultValue: '도보 {{time}}분' })}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 bg-white border-t border-gray-100 pb-8">
                <div className="text-center mb-4 text-sm text-gray-500 font-medium">{toilet.address}</div>
                <div className="flex gap-3">
                    <button
                        onClick={() => openExternalMap('kakao')}
                        className="flex-1 py-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <ExternalLink className="w-5 h-5" /> {t('map_kakao', '카카오맵')}
                    </button>
                    <button
                        onClick={() => openExternalMap('naver')}
                        className="flex-1 py-3 bg-[#03C75A] hover:bg-[#02B351] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                        <ExternalLink className="w-5 h-5" /> {t('map_naver', '네이버지도')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NavigationModal;
