import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, ScrollText, Waves, Crosshair, Loader2, Check, Trash2, Lock, Globe, X, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Toilet, User, UserRole, Gender } from '../types';
import { dbSupabase as db } from '../services/db_supabase';
import { Platform } from '../platform';
const MAPS_API_KEY = Platform.getGoogleMapsApiKey();
const KAKAO_JAVASCRIPT_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || "";
import { getMarkerSvg } from '../utils';
import { TextLayout } from '../components/TextLayout';
import { MapLayout } from '../components/MapLayout';
import { AdBanner } from '../components/AdBanner';
import DoorlockModal from '../components/DoorlockModal';
import { AlertModal } from '../components/AlertModal';

interface SubmitPageProps {
    user: User;
    editId?: string;
    myLocation: { lat: number, lng: number };
    toilets: Toilet[];
    onUserUpdate: (user: User) => void;
    onSubmitSuccess: () => void;
    onShowLogin: () => void;
    darkMode?: boolean;
    onMapModeChange?: (isOpen: boolean) => void;
}

const SubmitPage: React.FC<SubmitPageProps> = ({
    user,
    editId,
    myLocation,
    toilets,
    onUserUpdate,
    onSubmitSuccess,
    onShowLogin,
    darkMode,
    onMapModeChange
}) => {
    const { t } = useTranslation();
    // Capture isFromAdmin and reportId on mount to ensure reliable redirection
    const isFromAdminRef = useRef(window.location.hash.includes('from=admin'));
    const reportIdRef = useRef<string | null>(null);
    // Initialize ref only once
    if (reportIdRef.current === null) {
        const hash = window.location.hash || '';
        const match = hash.match(/reportId=([^&]+)/);
        reportIdRef.current = match ? match[1] : null;
    }

    const [step, setStep] = useState<'details' | 'location'>('details');
    const [formData, setFormData] = useState({ name: '', floor: '1', password: '', genderType: Gender.UNISEX, note: '', hasPaper: false, hasBidet: false, lat: myLocation.lat, lng: myLocation.lng, address: '', stallCount: 1 });
    const [originalIsPrivate, setOriginalIsPrivate] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDoorlock, setShowDoorlock] = useState(false);
    const [alertState, setAlertState] = useState<{ open: boolean, message: string, type: 'success' | 'error' | 'confirm' }>({ open: false, message: '', type: 'success' });

    const pickerMapRef = useRef<HTMLDivElement>(null);
    const pickerGoogleMap = useRef<any>(null);
    const pickerMarkerRef = useRef<any>(null);
    const pickerCircleRef = useRef<any>(null);
    const [isPickerLocating, setIsPickerLocating] = useState(false);
    const [submitState, setSubmitState] = useState<'idle' | 'processing' | 'success'>('idle');

    // Sync Map Mode with Parent
    useEffect(() => {
        onMapModeChange?.(step === 'location');
        return () => onMapModeChange?.(false);
    }, [step, onMapModeChange]);

    // Load existing data if editing - MUST BE BEFORE GUEST CHECK
    useEffect(() => {
        if (editId) {
            // Parse ID if it contains query params
            const cleanId = editId.split('?')[0];
            const target = toilets.find(t => t.id === cleanId);
            if (target) {
                setFormData({
                    name: target.name,
                    floor: target.floor.toString(),
                    password: target.password || '',
                    genderType: target.genderType,
                    note: target.note || '',
                    hasPaper: target.hasPaper,
                    hasBidet: target.hasBidet,
                    lat: target.lat,
                    lng: target.lng,
                    address: target.address,
                    stallCount: target.stallCount || 1
                });
                setOriginalIsPrivate(target.isPrivate);
            }
        }
    }, [editId, toilets]);


    // Refs to hold latest data for map init without stable callback dependencies
    const formDataRef = useRef(formData);
    const myLocationRef = useRef(myLocation);
    useEffect(() => { formDataRef.current = formData; }, [formData]);
    useEffect(() => { myLocationRef.current = myLocation; }, [myLocation]);

    const initPickerMap = useCallback(() => {
        if (!pickerMapRef.current) return;
        // Check if map is already initialized on this specific DOM element to avoid reloading
        // However, if we switched steps, the DOM element is new, so we must re-init.
        if (!window.google?.maps) return;

        console.warn("=== Map Init Debug ===");
        // console.warn("Key:", KAKAO_JAVASCRIPT_KEY ? `${KAKAO_JAVASCRIPT_KEY.substring(0, 5)}...` : "Missing (Empty String)");
        // console.warn("Origin (window.location.href):", window.location.href);


        // Simulator Default (San Francisco) Detection
        // SF: ~37.7858, -122.4064
        // If getting weird location, default to Seoul City Hall: 37.5665, 126.9780
        let targetLat = formDataRef.current.lat;
        let targetLng = formDataRef.current.lng;

        // Reset if SF or 0,0
        if ((Math.abs(targetLat - 37.7858) < 0.1 && Math.abs(targetLng + 122.4064) < 0.1) || (targetLat === 0 && targetLng === 0)) {
            console.log("📍 Detected Simulator Default Location (SF). Defaulting to Seoul City Hall.");
            targetLat = 37.5665;
            targetLng = 126.9780;
            // Update ref to avoid jump back
            myLocationRef.current = { lat: targetLat, lng: targetLng };
            // Note: We don't update formData/myLocation state immediately to avoid re-renders,
            // but the map will start here.
        }

        const map = new window.google.maps.Map(pickerMapRef.current, {
            center: { lat: targetLat, lng: targetLng },
            zoom: 18,
            disableDefaultUI: true,
            fullscreenControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            clickableIcons: false,
            styles: darkMode
                ? [
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
                    { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
                    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                ]
                : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
        });
        pickerGoogleMap.current = map;
        // Removed center_changed listener to prevent re-rendering loop. We read center directly on submit.

        const marker = new window.google.maps.Marker({ position: { lat: targetLat, lng: targetLng }, map: map, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#3B82F6", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 }, zIndex: 1 });
        pickerMarkerRef.current = marker;

        const circle = new window.google.maps.Circle({ strokeColor: "#3B82F6", strokeOpacity: 0.3, strokeWeight: 1, fillColor: "#3B82F6", fillOpacity: 0.1, map: map, center: { lat: targetLat, lng: targetLng }, radius: 30 });
        pickerCircleRef.current = circle;

        // Build 55 Polish: Inject CSS to hide Branding/Terms (aesthetic request)
        const style = document.createElement('style');
        style.innerHTML = `
            .gm-style-cc { display: none !important; }
            .gmnoprint { display: none !important; }
            a[href^="https://maps.google.com/maps"] { display: none !important; }
            .gm-style .gm-style-cc { display: none !important; }
        `;
        pickerMapRef.current?.appendChild(style);
    }, [darkMode]); // Dependencies minimized

    // Update marker when myLocation changes (without re-init map)
    useEffect(() => {
        if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setPosition(myLocation);
        }
        if (pickerCircleRef.current) {
            pickerCircleRef.current.setCenter(myLocation);
        }
    }, [myLocation]);

    // Map initialization effect - Moved here to be after initPickerMap definition
    useEffect(() => {
        if (step === 'location') {
            // Force clear the ref to ensure re-initialization on the new DOM node
            pickerGoogleMap.current = null;
            // Add slight delay to ensure DOM is ready and prevent blank map issues
            setTimeout(() => {
                if (window.google?.maps) initPickerMap();
                else { const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&language=ko`; script.async = true; script.onload = initPickerMap; document.head.appendChild(script); }

            }, 100);
        }
    }, [step, initPickerMap]);


    // NOW we can check GUEST status and return early if needed
    if (user.role === UserRole.GUEST) {
        return (
            <TextLayout>
                <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6"><Plus className="w-10 h-10 text-amber-500" /></div>
                    <h2 className="text-xl font-bold mb-2" dangerouslySetInnerHTML={{ __html: t('submit_login_required_title', '화장실을 등록하려면<br />로그인이 필요해요') }}></h2>
                    <button onClick={onShowLogin} className="mt-8 w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg">{t('submit_login_btn', '로그인하기')}</button>
                </div>
            </TextLayout>
        )
    }

    const handlePickerCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setIsPickerLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                if (pickerGoogleMap.current) {
                    pickerGoogleMap.current.panTo(pos);
                    pickerGoogleMap.current.setZoom(17);
                }
                setIsPickerLocating(false);
            },
            () => { setIsPickerLocating(false); setAlertState({ open: true, message: t('submit_location_error', "위치 정보를 가져올 수 없습니다."), type: 'error' }); },
            { enableHighAccuracy: true }
        );
    };

    const handleSetLocation = () => {
        if (!window.google?.maps || !pickerGoogleMap.current) { setStep('details'); return; }
        const center = pickerGoogleMap.current.getCenter();
        const lat = center.lat();
        const lng = center.lng();

        // 🚨 한국 내 좌표 범위 확인 (공해상/해외 방지 1차: Bounding Box)
        const isWithinKorea = lat >= 33 && lat <= 43 && lng >= 124 && lng <= 132;
        if (!isWithinKorea) {
            setAlertState({ open: true, message: t('submit_location_korea_only', "대한민국 내의 위치만 선택할 수 있습니다."), type: 'error' });
            return;
        }

        // 🚨 육지 여부 정밀 확인 (2차: PostGIS)
        // 비동기 처리가 필요하므로 함수 내부에서 step 변경을 막고 확인 후 진행
        db.checkIsOnLand(lat, lng).then(async isOnLand => {
            if (!isOnLand) {
                setAlertState({ open: true, message: t('submit_location_land_only', "바다 위나 대한민국 영토 밖에는\n등록할 수 없습니다.\n(해안가/섬 지역은 오차가 있을 수 있음)"), type: 'error' });
                return;
            }

            // Use Kakao Geocoder (Free) via Service
            const { reverseGeocodeKakao } = await import('../services/kakaoGeocoding');
            console.warn(`[SubmitPage] Requesting Geocode for: ${lat}, ${lng}`);
            const addr = await reverseGeocodeKakao(lat, lng);

            if (addr) {
                setFormData(prev => ({ ...prev, lat, lng, address: addr }));
            } else {
                setFormData(prev => ({ ...prev, lat, lng, address: t('submit_address_none', "주소 정보 없음") }));
            }
            setStep('details');
        });
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!editId) return;

        setShowDeleteModal(false);
        setSubmitState('processing');

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        await db.deleteToilet(editId);

        const isPublic = !originalIsPrivate;
        if (isPublic) {
            // Deduct credits logic
            await db.toiletShareChange(user.id, editId, 'delete_penalty');

            // Re-fetch user to get updated credits
            const users = await db.getUsers();
            const updatedUser = users.find(u => u.id === user.id);
            if (updatedUser) {
                onUserUpdate(updatedUser);
            }
            alert(t('submit_delete_success_deduct', '삭제되었습니다. 5크레딧이 차감되었습니다.'));
        } else {
            alert(t('submit_delete_success', "삭제되었습니다."));
        }

        onSubmitSuccess();
        setSubmitState('idle');
        window.location.hash = '#/';
    };

    const handleSubmit = async (isPrivate: boolean) => {
        if (submitState !== 'idle') return;

        try {
            // Processing Start
            setSubmitState('processing');
            const startTime = Date.now();

            // Default Name Logic
            let finalName = formData.name.trim();
            if (!finalName) {
                finalName = formData.password ? t('submit_default_pw_name', "미개방화장실") : t('submit_default_open_name', "개방화장실");
            }

            const toiletData: Toilet = {
                id: editId || 'user_' + Date.now(),
                name: finalName,
                floor: parseInt(formData.floor) || 1,
                password: formData.password,
                genderType: formData.genderType,
                hasPaper: formData.hasPaper,
                hasBidet: formData.hasBidet,
                lat: formData.lat || myLocation.lat,
                lng: formData.lng || myLocation.lng,
                address: formData.address || t('submit_address_none', "주소 없음"),
                type: 'user_registered',
                cleanliness: 5,
                stallCount: formData.stallCount,
                crowdLevel: 'low',
                distance: 0,
                createdBy: user.id,
                isPrivate: isPrivate,
                hasPassword: !!formData.password,
                note: formData.note
            };

            // DB Operation
            let result;
            if (editId) {
                result = await db.updateToilet(toiletData);
            } else {
                result = await db.addToilet(toiletData);
            }

            if (!result.success) {
                alert(result.message || t('submit_fail_process', "처리 실패"));
                setSubmitState('idle');
                return;
            }

            // Update user credits for sharing (Reward already handled inside db.addToilet for new ones)
            // But we need to update the local user state
            if (editId) {
                if (originalIsPrivate && !isPrivate) {
                    await db.toiletShareChange(user.id, editId, 'share_reward');
                }
            }

            // Re-fetch user to get updated credits from DB
            const users = await db.getUsers();
            const updatedUser = users.find(u => u.id === user.id);
            if (updatedUser) {
                onUserUpdate(updatedUser);
            }

            // Ensure at least 3 seconds display
            const elapsed = Date.now() - startTime;
            if (elapsed < 3000) {
                await new Promise(resolve => setTimeout(resolve, 3000 - elapsed));
            }

            setSubmitState('success');
        } catch (e) {
            console.error("Submission Error", e);
            alert(t('submit_error_general', "오류가 발생했습니다. 다시 시도해주세요."));
            setSubmitState('idle');
        }
    };

    const handleCloseAfterSuccess = () => {
        setSubmitState('idle');
        onSubmitSuccess();

        if (isFromAdminRef.current) {
            if (reportIdRef.current) {
                window.location.hash = `#/admin?openReport=${reportIdRef.current}`;
            } else {
                window.location.hash = '#/admin';
            }
        } else {
            window.location.hash = '#/';
        }
    };

    if (step === 'location') {
        return (
            <MapLayout>
                <div className="h-full w-full relative bg-surface dark:bg-surface-dark flex flex-col">
                    <div className="flex-1 w-full relative">
                        <div ref={pickerMapRef} className="w-full h-full" />

                        {/* Top Right Close Button - Enlarged touch area for iOS */}
                        <button
                            onClick={() => setStep('details')}
                            className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-20 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all"
                            style={{ touchAction: 'manipulation' }}
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-xl">
                            <img src="/images/pins/uni_near_pin.png" width="40" height="40" alt="pin" />
                        </div>
                        <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-20">
                            <button onClick={handlePickerCurrentLocation} className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center text-gray-700 dark:text-gray-200">
                                {isPickerLocating ? <Loader2 className="animate-spin w-6 h-6 text-blue-500" /> : <Crosshair className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                    {/* Adjust padding for Ad Banner logic (120px + safe area to prevent overlap) */}
                    <div className="bg-surface dark:bg-surface-dark p-4 pb-[calc(110px+env(safe-area-inset-bottom))] rounded-t-2xl shadow-2xl space-y-3 z-20 flex justify-center border-t border-border dark:border-border-dark">
                        <div className="w-full max-w-md space-y-3">
                            <button onClick={handleSetLocation} className="w-full py-4 bg-primary text-white font-bold rounded-xl text-lg shadow-lg active:scale-95 transition-transform">{t('submit_set_location', '이 위치로 설정')}</button>
                        </div>
                    </div>

                    <AlertModal
                        isOpen={alertState.open}
                        message={alertState.message}
                        type={alertState.type}
                        onClose={() => setAlertState(prev => ({ ...prev, open: false }))}
                    />
                </div>
            </MapLayout>
        )
    }

    return (
        <TextLayout className="p-0" noPadding>
            {/* Fixed Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-surface dark:bg-surface-dark border-b border-border dark:border-border-dark pt-[env(safe-area-inset-top)]">
                <div className="px-4 py-3 flex items-center gap-3 h-[60px]">
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="p-2 -ml-2 text-text-main dark:text-text-light hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    >
                        <ArrowRight className="w-6 h-6 rotate-180" />
                    </button>
                    <h2 className="text-2xl font-black dark:text-white">{editId ? t('submit_page_title_edit', "화장실 수정") : t('submit_page_title_new', "화장실 등록")}</h2>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="absolute inset-0 pt-[calc(60px+env(safe-area-inset-top))] overflow-y-auto overflow-x-hidden pb-[env(safe-area-inset-bottom)] scrollbar-hide">
                <div className="p-4 pb-64 space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                        <button onClick={() => setStep('location')} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md"><Crosshair className="w-4 h-4" /> {formData.address ? t('submit_edit_location', "위치 수정하기") : t('submit_find_location', "지도에서 위치 찾기")}</button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{t('submit_label_address', '주소')}</label>
                            <div className={`w-full p-3 rounded-lg text-sm font-medium border transition-colors ${formData.address ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-400'}`}>
                                {formData.address || t('submit_placeholder_address', "위치를 선택하면 자동 입력됩니다")}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{t('submit_label_name', '건물명 또는 위치설명')}</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder={t('submit_placeholder_name', "예: 편의점 우측끼고 돌아서 계단실 안쪽")}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-lg border border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 outline-none transition-all placeholder:text-gray-400"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{t('submit_label_floor', '층수')}</label>
                                <div className="flex items-center gap-1 w-full h-[46px] bg-gray-50 dark:bg-gray-700 rounded-lg p-1 border border-transparent transition-all">
                                    <button
                                        onClick={() => setFormData(prev => {
                                            const current = parseFloat(prev.floor || "1");
                                            // 1층에서 내리면 0.5와 0을 건너뛰고 바로 -0.5(반지하 등)로 이동
                                            const next = current === 1 ? -0.5 : current - 0.5;
                                            return { ...prev, floor: String(next) };
                                        })}
                                        className="w-10 h-full bg-white dark:bg-gray-600 rounded-md shadow-sm border border-gray-200 dark:border-gray-500 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <input
                                        type="number"
                                        value={formData.floor}
                                        onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                        placeholder="1"
                                        step="0.5"
                                        className="flex-1 h-full bg-transparent text-center font-bold text-lg text-gray-900 dark:text-white outline-none min-w-0"
                                    />
                                    <button
                                        onClick={() => setFormData(prev => {
                                            const current = parseFloat(prev.floor || "1");
                                            // -0.5층에서 올리면 0과 0.5를 건너뛰고 바로 1층으로 이동
                                            const next = current === -0.5 ? 1 : current + 0.5;
                                            return { ...prev, floor: String(next) };
                                        })}
                                        className="w-10 h-full bg-white dark:bg-gray-600 rounded-md shadow-sm border border-gray-200 dark:border-gray-500 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{t('submit_label_password', '비번')}</label>
                                <button
                                    onClick={() => setShowDoorlock(true)}
                                    className={`w-full h-10 mt-[1px] rounded-lg flex items-center justify-center transition-all active:scale-95 ${formData.password ? 'bg-primary-50 border-2 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-mono text-lg tracking-widest shadow-sm' : 'bg-white dark:bg-gray-800 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-400'}`}
                                    style={{ height: '42px' }}
                                >
                                    {formData.password ? formData.password : <span className="text-sm font-bold flex items-center gap-2 animate-pulse"><Lock className="w-4 h-4" /> {t('submit_placeholder_password', '비번 입력')}</span>}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-transparent transition-all">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('submit_label_stalls', '변기 개수')}</label>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, stallCount: Math.max(1, prev.stallCount - 1) }))}
                                    className="w-10 h-10 bg-white dark:bg-gray-600 rounded-md shadow-sm border border-gray-200 dark:border-gray-500 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold text-lg w-8 text-center text-gray-900 dark:text-white">{formData.stallCount}</span>
                                <button
                                    onClick={() => setFormData(prev => ({ ...prev, stallCount: prev.stallCount + 1 }))}
                                    className="w-10 h-10 bg-white dark:bg-gray-600 rounded-md shadow-sm border border-gray-200 dark:border-gray-500 flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setFormData({ ...formData, hasPaper: !formData.hasPaper })} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${formData.hasPaper ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-muted'}`}>
                                <img src="/images/icons/tissue.png" width={45} height={45} alt="tissue" className={`object-contain ${!formData.hasPaper && 'opacity-40 grayscale'}`} />
                                <span className={`text-sm font-bold ${formData.hasPaper ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>{formData.hasPaper ? t('submit_paper_yes', '휴지 있음') : t('submit_paper_no', '휴지 없음')}</span>
                            </button>
                            <button onClick={() => setFormData({ ...formData, hasBidet: !formData.hasBidet })} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${formData.hasBidet ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-muted'}`}>
                                <img src="/images/icons/bidet.png" width={45} height={45} alt="bidet" className={`object-contain ${!formData.hasBidet && 'opacity-40 grayscale'}`} />
                                <span className={`text-sm font-bold ${formData.hasBidet ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>{formData.hasBidet ? t('submit_bidet_yes', '비데 있음') : t('submit_bidet_no', '비데 없음')}</span>
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setFormData({ ...formData, genderType: Gender.MALE })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.MALE ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>{t('submit_gender_male', '남성')}</button>
                            <button onClick={() => setFormData({ ...formData, genderType: Gender.FEMALE })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.FEMALE ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>{t('submit_gender_female', '여성')}</button>
                            <button onClick={() => setFormData({ ...formData, genderType: Gender.UNISEX })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.UNISEX ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>{t('submit_gender_unisex', '공용')}</button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">{t('submit_label_note', '참고사항 (선택)')}</label>
                            <textarea
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                                placeholder={t('submit_placeholder_note', "예: 휴지가 자주 없음, 도어락 뻑뻑함 등")}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-lg border border-transparent focus:bg-white dark:focus:bg-gray-600 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 dark:focus:ring-primary-900 outline-none min-h-[80px] resize-none transition-all placeholder:text-gray-400"
                            />
                        </div>

                    </div>

                    {/* Button Layout Logic */}
                    {editId ? (
                        // EDIT MODE
                        originalIsPrivate ? (
                            // Private Toilet Edit
                            <div className="space-y-3 mt-4">
                                <div className="flex gap-2">
                                    <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(true)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 flex justify-center items-center gap-2 text-sm">
                                        {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                        {t('submit_btn_edit_complete', '수정완료')}
                                    </button>
                                    {!isFromAdminRef.current && (
                                        <button disabled={submitState !== 'idle'} onClick={handleDeleteClick} className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800 flex justify-center items-center gap-2 text-sm">
                                            <Trash2 className="w-4 h-4" />
                                            {t('submit_btn_delete', '삭제하기')}
                                        </button>
                                    )}
                                </div>
                                <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(false)} className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-200 transition-colors flex justify-center items-center gap-2 text-base">
                                    {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                    {t('submit_btn_share_update', '공유하기로 변경등록 (+5 Cr)')}
                                </button>
                            </div>
                        ) : (
                            // Public Toilet Edit
                            <div className="flex gap-2 mt-4">
                                <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(false)} className="flex-1 py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors flex justify-center items-center gap-2 text-base">
                                    {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    {t('submit_btn_edit_complete', '수정완료')}
                                </button>
                                {!isFromAdminRef.current && (
                                    <button disabled={submitState !== 'idle'} onClick={handleDeleteClick} className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800 flex justify-center items-center gap-2 text-sm">
                                        <Trash2 className="w-4 h-4" />
                                        {t('submit_btn_delete', '삭제하기')} (-5 Cr)
                                    </button>
                                )}
                            </div>
                        )
                    ) : (
                        // CREATE MODE (Default)
                        <div className="flex gap-2 w-full max-w-sm mx-auto mt-4 px-1">
                            <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(true)} className="flex-1 py-3 px-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 flex flex-col justify-center items-center gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
                                    <span className="text-sm sm:text-base">{t('submit_btn_private', '나만보기')}</span>
                                </div>
                                <span className="text-xs opacity-70 font-medium">(0cr)</span>
                            </button>
                            <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(false)} className="flex-[2] py-3 px-2 bg-gray-900 dark:bg-black text-white font-bold rounded-xl hover:bg-gray-800 shadow-xl shadow-gray-200 dark:shadow-none transition-colors flex flex-col justify-center items-center gap-0.5">
                                <div className="flex items-center gap-1.5">
                                    {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                    <span className="text-base sm:text-lg">{t('submit_btn_share', '공유하기')}</span>
                                </div>
                                <span className="text-xs sm:text-sm opacity-80 font-medium text-blue-200">(+5cr)</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Registration Processing/Success Modal with Ad */}
            {submitState !== 'idle' && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center space-y-3">

                        {submitState === 'processing' ? (
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary-500 rounded-full opacity-20 animate-ping"></div>
                                <div className="relative w-16 h-16 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                        )}

                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                                {submitState === 'processing'
                                    ? (editId ? t('submit_processing_edit', '수정 중입니다...') : t('submit_processing_new', '등록 중입니다...'))
                                    : (editId ? t('submit_complete_edit', '수정이 완료되었습니다!') : t('submit_complete_new', '등록이 완료되었습니다!'))
                                }
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {submitState === 'processing' ? (
                                    <span dangerouslySetInnerHTML={{ __html: t('submit_desc_processing', '잠시만 기다려주세요.<br />소중한 정보를 저장하고 있습니다. 💾') }} />
                                ) : (
                                    <span dangerouslySetInnerHTML={{ __html: t('submit_desc_complete', '<span className="text-primary-600 dark:text-primary-400 font-bold">크레딧이 성공적으로 지급되었습니다.</span><br />감사합니다! 💖') }} />
                                )}
                            </p>
                        </div>

                        {/* Persistent Ad Banner */}
                        <div className="w-full max-w-[300px] h-auto min-h-[100px] bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center relative overflow-hidden">
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-[10px] text-gray-500 dark:text-gray-400 rounded z-10">AD</span>
                            <AdBanner isInline maxHeight={260} maxRatio={3.5} className="w-full h-full" type="NATIVE_MODAL" />
                        </div>

                        {submitState === 'success' && (
                            <button
                                onClick={handleCloseAfterSuccess}
                                className="w-full py-4 bg-gray-900 dark:bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all animate-in slide-in-from-bottom-2"
                            >
                                {t('submit_btn_close', '닫기')}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl border-t-4 border-red-500">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-3 dark:text-white">{t('submit_delete_confirm_title', '정말 삭제하시겠습니까?')}</h3>
                        {!originalIsPrivate && (
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium" dangerouslySetInnerHTML={{ __html: t('submit_delete_warning', '⚠️ 공유된 화장실을 삭제하면<br /><span className="font-bold text-red-600 dark:text-red-400">5크레딧이 차감</span>됩니다.') }}>
                                </p>
                            </div>
                        )}
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                            {t('submit_delete_desc', '삭제된 화장실은 복구할 수 없습니다.')}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {t('submit_btn_cancel', '취소')}
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                            >
                                {t('submit_btn_delete', '삭제하기')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDoorlock && (
                <DoorlockModal
                    initialValue={formData.password}
                    onClose={() => setShowDoorlock(false)}
                    onComplete={(val) => {
                        setFormData(prev => ({ ...prev, password: val }));
                        setShowDoorlock(false);
                    }}
                />
            )}

            <AlertModal
                isOpen={alertState.open}
                message={alertState.message}
                type={alertState.type}
                onClose={() => setAlertState(prev => ({ ...prev, open: false }))}
            />
        </TextLayout>
    );
};

export default SubmitPage;
