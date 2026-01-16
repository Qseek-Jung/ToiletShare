import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, List, Check, ScrollText, Waves, Star, Crosshair, MapPin } from 'lucide-react';
import { Toilet, User, UserRole } from '../types';
import { Platform } from '../platform';
const MAPS_API_KEY = Platform.getGoogleMapsApiKey();
import { getToiletColor, getMarkerSvg, formatDistance, getMarkerImage, calculateDistance } from '../utils';
import { MapLayout } from '../components/MapLayout';
import { AdBanner } from '../components/AdBanner';
import { dbSupabase } from '../services/db_supabase';
import { adMobService } from '../services/admob';

// import { GoogleAd } from '../components/GoogleAd';
// import AdErrorBoundary from '../components/AdErrorBoundary';

const DARK_MAP_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
    { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
    { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];
interface HomePageProps {
    user: User;
    myLocation: { lat: number, lng: number };
    filteredToilets: Toilet[];
    onToiletClick: (t: Toilet) => void;
    onFetchNewArea?: (lat: number, lng: number, radiusKm: number) => Promise<void>;
    initialMapState?: { center: { lat: number, lng: number }, zoom: number } | null;
    onMapChange?: (state: { center: { lat: number, lng: number }, zoom: number }) => void;
    darkMode?: boolean;

    onLoginRequired: () => void;
    showList: boolean;
    onToggleList: (show: boolean) => void;
    targetToiletId?: string | null;  // New Prop
    onRefreshLocation?: () => Promise<void>; // Force high accuracy refresh
}

const HomePage: React.FC<HomePageProps> = (props) => {
    const { t } = useTranslation();
    const { user, myLocation, filteredToilets, onToiletClick, onFetchNewArea, initialMapState, onMapChange, darkMode, onLoginRequired, showList, onToggleList, targetToiletId, onRefreshLocation } = props;
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const myLocationOverlayRef = useRef<any>(null);
    const lastFetchRef = useRef<{ lat: number, lng: number, zoom: number }>({ lat: 0, lng: 0, zoom: 15 });
    const isFirstLoad = useRef(true);
    const hasPannedToInitialLocation = useRef(!!initialMapState);
    const hasHandledTargetToilet = useRef(false); // Ref to prevent re-centering on every render

    // UI State
    // const [showList, setShowList] = useState(false); // Moved to App.tsx for persistence

    const [showSearchButton, setShowSearchButton] = useState(false);

    const [searchQuery, setSearchQuery] = useState("");


    // Filter and Sort State
    const [filters, setFilters] = useState({
        hasPaper: false,
        hasBidet: false,
        minRating: false
    });
    const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance');

    // Memoize displayToilets to prevent unnecessary re-renders of markers
    const displayToilets = React.useMemo(() => {
        return filteredToilets
            .filter(t => {
                // 1. Gender Filtering (Strict)
                if (user.role === UserRole.GUEST) return true;
                if (user.role === UserRole.ADMIN || user.role === UserRole.VIP) return true;
                if (t.createdBy === user.id) return true;
                if (user.gender === 'MALE') return t.genderType === 'MALE' || t.genderType === 'UNISEX';
                if (user.gender === 'FEMALE') return t.genderType === 'FEMALE' || t.genderType === 'UNISEX';
                return true;
            })
            .filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.address.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .filter(t => {
                if (filters.hasPaper && !t.hasPaper) return false;
                if (filters.hasBidet && !t.hasBidet) return false;
                if (filters.minRating && (t.ratingAvg || 0) < 3) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'distance') {
                    return (a.distance || 0) - (b.distance || 0);
                } else {
                    return (b.ratingAvg || 0) - (a.ratingAvg || 0);
                }
            });
    }, [filteredToilets, user.role, user.gender, searchQuery, filters, sortBy]);

    // Handle Deep Link / Target Toilet ID
    useEffect(() => {
        if (!targetToiletId || !mapInstance.current || filteredToilets.length === 0) return;

        // Find the target toilet
        const target = filteredToilets.find(t => t.id === targetToiletId);

        if (target) {
            console.log("🎯 Deep Link: Centering on toilet:", target.name, target.lat, target.lng);

            // Pan to target
            mapInstance.current.setCenter({ lat: target.lat, lng: target.lng });
            mapInstance.current.setZoom(18); // Close zoom for detail
        }
    }, [targetToiletId, filteredToilets]); // Keep dependencies as is

    // ... (Map Init) ...
    useEffect(() => {
        const initMap = () => {
            if (!mapContainerRef.current) {
                setTimeout(initMap, 100);
                return;
            }

            // Check if Google Maps is loaded
            if (!window.google?.maps || !window.google.maps.Map) {
                setTimeout(initMap, 200);
                return;
            }

            if (mapInstance.current) return;

            try {
                const map = new window.google.maps.Map(mapContainerRef.current, {
                    center: initialMapState?.center || myLocation,
                    zoom: initialMapState?.zoom || 16,
                    disableDefaultUI: true,
                    styles: darkMode
                        ? [...DARK_MAP_STYLE, { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                        : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                });

                mapInstance.current = map;

                // Initialize lastFetchRef
                if (isFirstLoad.current) {
                    if (initialMapState) {
                        lastFetchRef.current = {
                            lat: initialMapState.center.lat,
                            lng: initialMapState.center.lng,
                            zoom: initialMapState.zoom
                        };
                    } else {
                        lastFetchRef.current = { lat: myLocation.lat, lng: myLocation.lng, zoom: 16 };
                        onFetchNewArea?.(myLocation.lat, myLocation.lng, 2);
                    }
                    isFirstLoad.current = false;
                }

                // Map Move Listener
                map.addListener('idle', () => {
                    const center = map.getCenter();
                    const zoom = map.getZoom();
                    if (!center || !zoom) return;

                    let radius = 2;
                    if (zoom <= 14) radius = 5;
                    if (zoom <= 12) radius = 10;
                    if (zoom <= 11) radius = 15;
                    if (zoom <= 10) radius = 20;
                    if (zoom <= 9) radius = 30;
                    if (zoom <= 8) radius = 50;

                    const dist = calculateDistance(
                        center.lat(),
                        center.lng(),
                        lastFetchRef.current.lat,
                        lastFetchRef.current.lng
                    );

                    const isMoved = dist > 0.5;
                    const isZoomedOut = zoom < lastFetchRef.current.zoom;

                    if (isMoved || isZoomedOut) {
                        setShowSearchButton(true);
                    }

                    if (onMapChange) {
                        onMapChange({ center: { lat: center.lat(), lng: center.lng() }, zoom });
                    }
                });

                // Custom Overlay
                class LocationOverlay extends window.google.maps.OverlayView {
                    position: { lat: number, lng: number };
                    div: HTMLDivElement | null;
                    constructor(position: { lat: number, lng: number }) {
                        super();
                        this.position = position;
                        this.div = null;
                    }
                    onAdd() {
                        const div = document.createElement('div');
                        div.style.position = 'absolute';
                        div.style.cursor = 'pointer';
                        div.innerHTML = `<div class="relative flex items-center justify-center w-8 h-8"><span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span><span class="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow-sm"></span></div>`;
                        this.div = div;
                        const panes = this.getPanes();
                        panes?.overlayMouseTarget.appendChild(div);
                    }
                    draw() {
                        const overlayProjection = this.getProjection();
                        if (!overlayProjection || !this.div) return;
                        const point = overlayProjection.fromLatLngToDivPixel(new window.google.maps.LatLng(this.position));
                        if (point) {
                            this.div.style.left = (point.x - 16) + 'px';
                            this.div.style.top = (point.y - 16) + 'px';
                        }
                    }
                    onRemove() {
                        if (this.div) {
                            (this.div.parentNode as HTMLElement).removeChild(this.div);
                            this.div = null;
                        }
                    }
                    setPosition(position: { lat: number, lng: number }) {
                        this.position = position;
                        this.draw();
                    }
                }

                const overlay = new LocationOverlay(myLocation);
                overlay.setMap(map);
                myLocationOverlayRef.current = overlay;

                // Force resize
                setTimeout(() => {
                    window.google.maps.event.trigger(map, 'resize');
                    updateMarkers(displayToilets);
                }, 200);

            } catch (e) {
                console.error("Map initialization error:", e);
                setTimeout(initMap, 500);
            }
        };

        const timer = setTimeout(initMap, 100);
        return () => clearTimeout(timer);
    }, []);

    // Dark Mode Effect
    useEffect(() => {
        if (mapInstance.current) {
            mapInstance.current.setOptions({
                styles: darkMode
                    ? [...DARK_MAP_STYLE, { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                    : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
            });
            // Force resize trigger in case layout shifted due to CSS changes
            setTimeout(() => {
                window.google.maps.event.trigger(mapInstance.current, 'resize');
            }, 100);
        }
    }, [darkMode]);

    // Pan to User Location Effect
    useEffect(() => {
        if (!hasPannedToInitialLocation.current && mapInstance.current) {
            mapInstance.current.panTo(myLocation);
            hasPannedToInitialLocation.current = true;
        }
        if (myLocationOverlayRef.current) {
            myLocationOverlayRef.current.setPosition(myLocation);
        }
    }, [myLocation]);

    // Unified Click Handler
    const handleToiletSelect = async (toilet: Toilet) => {
        if (!toilet.isPrivate) {
            const adShown = await adMobService.showInterstitial();
            if (adShown) console.log('Public Toilet Interstitial Shown');
        }

        window.location.hash = `#/toilet/${toilet.id}`;

        if (user.role === UserRole.GUEST) {
            const isAdminCreated = toilet.createdBy === 'admin' || toilet.source === 'admin' || !toilet.createdBy;
            const isOpen = !toilet.hasPassword;
            if (isAdminCreated && isOpen) {
                onToiletClick(toilet);
            } else {
                onLoginRequired();
            }
        } else {
            onToiletClick(toilet);
        }
    };

    // Marker Update Effect
    useEffect(() => {
        updateMarkers(displayToilets);
    }, [displayToilets, user.role]);

    // --- Optimized Marker Update (Diffing) ---
    const updateMarkers = (newToilets: Toilet[]) => {
        if (!mapInstance.current) return;

        // 1. Identify which markers to remove
        const newToiletIds = new Set(newToilets.map(t => t.id));
        const markersToKeep: any[] = [];

        markersRef.current.forEach(marker => {
            const toiletId = (marker as any).toiletId;
            if (newToiletIds.has(toiletId)) {
                markersToKeep.push(marker);
            } else {
                marker.setMap(null);
            }
        });

        // 2. Identify which toilets need new markers
        const existingToiletIds = new Set(markersRef.current.map(m => (m as any).toiletId));
        const toiletsToAdd = newToilets.filter(t => !existingToiletIds.has(t.id));

        // 3. Create new markers
        toiletsToAdd.forEach(t => {
            const isNearest = filteredToilets.length > 0 && t.id === filteredToilets[0].id;
            const markerIcon = getMarkerImage(t, user.role, isNearest);

            const marker = new window.google.maps.Marker({
                position: { lat: t.lat, lng: t.lng },
                map: mapInstance.current,
                icon: {
                    url: markerIcon,
                    scaledSize: new window.google.maps.Size(40, 58), // Increased size (Build 54 refinement)
                    anchor: new window.google.maps.Point(20, 58) // Tip of the pin
                },
                optimized: true,
                zIndex: isNearest ? 100 : 10
            });

            (marker as any).toiletId = t.id;

            marker.addListener('click', () => {
                onToiletClick(t);
            });

            markersToKeep.push(marker);
        });

        markersRef.current = markersToKeep;
    }

    return (
        <MapLayout>
            <div className="w-full h-full relative overflow-hidden">
                <div ref={mapContainerRef} className="w-full h-full" />

                {/* Center Map Marker (Fixed Reference) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-10 pointer-events-none drop-shadow-md">
                    <MapPin className="w-10 h-10 text-gray-700 fill-white" strokeWidth={2.5} />
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-black/30 rounded-full blur-[2px]"></div>
                </div>

                {/* Top Search Bar */}
                <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center px-4 pt-[max(2px,env(safe-area-inset-top))] gap-[5px]">
                    {/* ... (Existing Search Bar Content) ... */}
                    <div className={`w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 flex items-center p-3 gap-3 ${showList ? 'ring-2 ring-primary' : ''}`}>
                        <Search className="w-5 h-5 text-gray-400 shrink-0" />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onFocus={() => onToggleList(true)} placeholder={t('search_placeholder', '화장실 검색')} className="flex-1 bg-transparent outline-none text-sm min-w-0 dark:text-white dark:placeholder-gray-400" />
                        <button onClick={() => onToggleList(!showList)} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">{showList ? <X className="w-4 h-4" /> : <List className="w-4 h-4" />}</button>
                    </div>

                    {/* Nearest Toilet Card (only when list is closed) */}
                    {!showList && filteredToilets.length > 0 && (
                        <div
                            onClick={() => handleToiletSelect(filteredToilets[0])}
                            className="w-full max-w-md bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border-2 border-red-500 flex items-center gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all animate-in slide-in-from-top-2"
                        >
                            <div className="w-14 h-14 shrink-0">
                                <img
                                    src={
                                        filteredToilets[0].genderType === 'MALE' ? '/images/icons/Man_boxicon.png' :
                                            filteredToilets[0].genderType === 'FEMALE' ? '/images/icons/Woman_boxicon.png' :
                                                '/images/icons/uni_boxicon.png'
                                    }
                                    alt="toilet icon"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-red-500 font-bold mb-0.5">
                                    {calculateDistance(myLocation.lat, myLocation.lng, lastFetchRef.current.lat, lastFetchRef.current.lng) > 1.0
                                        ? t('nearest_center', '지도 중앙에서 가장 가까운 화장실')
                                        : t('nearest_user', '가장 가까운 화장실')}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white truncate text-lg">{filteredToilets[0].name}</h3>
                                <div className="text-xs text-gray-500 truncate">{filteredToilets[0].address}</div>
                            </div>
                            <div className="text-base font-black text-red-500 shrink-0">
                                {formatDistance(filteredToilets[0].distance || 0)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Here Button (Overlay) */}
                {showSearchButton && !showList && (
                    <div className="absolute bottom-56 left-1/2 transform -translate-x-1/2 z-20">
                        <button
                            onClick={() => {
                                if (!mapInstance.current || !onFetchNewArea) return;
                                const center = mapInstance.current.getCenter();
                                const zoom = mapInstance.current.getZoom();

                                // Dynamic Radius based on Zoom
                                let radius = 2;
                                if (zoom <= 14) radius = 5;
                                if (zoom <= 12) radius = 10;
                                if (zoom <= 11) radius = 15;
                                if (zoom <= 10) radius = 20;
                                if (zoom <= 9) radius = 30;
                                if (zoom <= 8) radius = 50;

                                const lat = center.lat();
                                const lng = center.lng();

                                setShowSearchButton(false);
                                lastFetchRef.current = { lat, lng, zoom };

                                onFetchNewArea(lat, lng, radius);
                            }}
                            className="bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 animate-bounce-small hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            <Search className="w-4 h-4" />
                            {t('search_this_area', '이 지역 검색')}
                        </button>
                    </div>
                )}

                {/* List View Modal (Overlay) */}
                {showList && (
                    <div className="absolute top-[72px] left-0 right-0 bottom-0 z-10 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm flex justify-center">
                        <div className="w-full max-w-md bg-white dark:bg-gray-800 h-full rounded-t-2xl shadow-xl border-t border-gray-100 dark:border-gray-700 flex flex-col overflow-hidden">

                            {/* Fixed Native Ad Area (Top of List) */}
                            <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shrink-0 overflow-hidden pt-2">
                                <div className="w-full h-[80px] flex items-center justify-center relative px-4">
                                    <AdBanner isInline maxHeight={80} minRatio={4.0} className="w-full h-full rounded-lg" type="NATIVE_LIST" />
                                    <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-300 font-bold -z-10 tracking-widest uppercase">Sponsored</span>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto pb-24 relative">
                                {/* Filter and Sort Section */}
                                <div className="sticky top-0 bg-white dark:bg-gray-800 p-3 border-b dark:border-gray-700 z-10 shadow-sm">
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                        {/* Sort Dropdown (Simulated with button for compactness) */}
                                        <button
                                            onClick={() => setSortBy(sortBy === 'distance' ? 'rating' : 'distance')}
                                            className="shrink-0 px-3 py-2 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white flex items-center gap-1 whitespace-nowrap"
                                        >
                                            {sortBy === 'distance' ? t('sort_distance', '📍 거리순') : t('sort_rating', '⭐ 별점순')}
                                        </button>
                                        <div className="w-[1px] h-8 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0"></div>

                                        {/* Filters (Horizontal Scroll Chips) */}
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, hasPaper: !prev.hasPaper }))}
                                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${filters.hasPaper
                                                ? 'bg-primary-50 border-primary-100 text-primary-700 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-300'
                                                : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            <img src="/images/icons/tissue.png" width={16} height={16} alt="tissue" className={filters.hasPaper ? "" : "grayscale opacity-50"} />
                                            {t('filter_paper', '화장지')}
                                        </button>
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, hasBidet: !prev.hasBidet }))}
                                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${filters.hasBidet
                                                ? 'bg-primary-50 border-primary-100 text-primary-700 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-300'
                                                : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            <img src="/images/icons/bidet.png" width={16} height={16} alt="bidet" className={filters.hasBidet ? "" : "grayscale opacity-50"} />
                                            {t('filter_bidet', '비데')}
                                        </button>
                                        <button
                                            onClick={() => setFilters(prev => ({ ...prev, minRating: !prev.minRating }))}
                                            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${filters.minRating
                                                ? 'bg-primary-50 border-primary-100 text-primary-700 dark:bg-primary-900/40 dark:border-primary-800 dark:text-primary-300'
                                                : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            <Star className={`w-3.5 h-3.5 ${filters.minRating ? "fill-primary-700 text-primary-700" : "text-gray-400"}`} />
                                            {t('filter_score_3plus', '3점+')}
                                        </button>
                                    </div>
                                </div>





                                {/* List */}
                                <div className="p-4 space-y-3">
                                    {displayToilets.length === 0 ? (
                                        <div className="text-center py-10 text-gray-400">
                                            {t('no_toilets_found', '조건에 맞는 화장실이 없습니다.')}
                                        </div>
                                    ) : (
                                        displayToilets.map((toilet, i) => (
                                            <React.Fragment key={toilet.id}>
                                                {/* ... Toilet Item ... */}
                                                <div
                                                    onClick={() => handleToiletSelect(toilet)}
                                                    className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    {/* ... Content ... */}
                                                    <div className="shrink-0 self-center">
                                                        <img
                                                            src={getMarkerImage(toilet, user.role, i === 0 && sortBy === 'distance')}
                                                            alt="pin"
                                                            className="w-[65px] h-[65px] object-contain drop-shadow-sm"
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${toilet.type === 'public' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                {toilet.type === 'public' ? t('toilet_type_public', '공공') : toilet.type === 'commercial' ? t('toilet_type_commercial', '상가') : t('toilet_type_other', '기타')}
                                                            </span>
                                                            <h3 className="font-bold text-gray-900 dark:text-white">{toilet.name}</h3>
                                                        </div>
                                                        <div className="text-sm text-gray-500 mb-2">{toilet.address} {toilet.floor}층</div>
                                                        <div className="flex items-center gap-3 text-xs text-gray-400">
                                                            <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {toilet.ratingAvg ? toilet.ratingAvg.toFixed(1) : '0.0'} ({toilet.reviewCount})</span>
                                                            <span>|</span>
                                                            <span>{formatDistance(toilet.distance || 0)}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Current Location Button */}
                <div className="absolute bottom-56 right-4 z-20">
                    <button
                        onClick={async () => {
                            if (onRefreshLocation) {
                                await onRefreshLocation();
                            }
                            if (mapInstance.current && myLocation.lat !== 0) {
                                mapInstance.current.panTo(myLocation);
                                mapInstance.current.setZoom(17);
                            }
                        }}
                        className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95"
                    >
                        <Crosshair className="w-6 h-6" />
                    </button>
                </div>

            </div >
        </MapLayout>
    );
};

export default HomePage;
