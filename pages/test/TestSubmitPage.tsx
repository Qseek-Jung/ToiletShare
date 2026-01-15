import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, ScrollText, Waves, Crosshair, Loader2, Check, Trash2, Lock, Globe, ArrowLeft } from 'lucide-react';
import { Toilet, User, UserRole, Gender } from '../types';
import { dbSupabase as db } from '../services/db_supabase';
import { Platform } from '../../platform';
const MAPS_API_KEY = Platform.getGoogleMapsApiKey();
import { getMarkerSvg, mapGoogleTypeToInternalType } from '../utils';
import { PageLayout } from '../components/PageLayout';
import { CreditModal } from '../components/CreditModal';
import { calculateDistance } from '../utils';
import DoorlockModal from '../components/DoorlockModal';
import { AlertModal } from '../components/AlertModal';
import {
    ALLOW_PRIMARY_TYPES,
    CONDITIONAL_TYPES,
    EXCLUDE_TYPES,
    EXCLUDE_KEYWORDS,
    BUILDING_SUFFIX
} from '../buildingFilters';

// --- Building Name Extraction Logic ---

const isTenantPlace = (types: string[]) => {
    return types.some(type => EXCLUDE_TYPES.includes(type));
};
const hasExcludedKeyword = (name: string) => {
    return EXCLUDE_KEYWORDS.some(keyword => name.includes(keyword));
};
const isBuildingLike = (name: string) => {
    return BUILDING_SUFFIX.some(suffix => name.endsWith(suffix));
};

const calculateScore = (place: any, distance: number) => {
    // Legacy scoring kept for type safety if referenced elsewhere, 
    // but main logic uses extractPureBuildingName now.
    let s = 0;
    if (distance < 20) s += 3;
    if (place.rating) s += 1;
    return s;
};


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


interface SubmitPageProps {
    user: User;
    editId?: string;
    myLocation: { lat: number, lng: number };
    toilets: Toilet[];
    onUserUpdate: (user: User) => void;
    onSubmitSuccess: () => void;
    onShowLogin: () => void;
    darkMode?: boolean;
}


const SubmitPage: React.FC<SubmitPageProps> = ({
    user,
    editId,
    myLocation,
    toilets,
    onUserUpdate,
    onSubmitSuccess,
    onShowLogin,
    darkMode
}) => {
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
    const [formData, setFormData] = useState<{
        name: string,
        floor: string,
        password: string,
        genderType: Gender,
        note: string,
        hasPaper: boolean,
        hasBidet: boolean,
        lat: number,
        lng: number,
        address: string,
        stallCount: number,
        type: Toilet['type']
    }>({
        name: '',
        floor: '1',
        password: '',
        genderType: Gender.UNISEX,
        note: '',
        hasPaper: false,
        hasBidet: false,
        lat: myLocation.lat,
        lng: myLocation.lng,
        address: '',
        stallCount: 1,
        type: 'user_registered'
    });
    const [originalIsPrivate, setOriginalIsPrivate] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDoorlock, setShowDoorlock] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [alertState, setAlertState] = useState<{ show: boolean, message: string, onConfirm?: () => void }>({ show: false, message: '' });
    const initialFormDataRef = useRef<any>(null);

    const pickerMapRef = useRef<HTMLDivElement>(null);
    const pickerGoogleMap = useRef<any>(null);
    const [isPickerLocating, setIsPickerLocating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Credit Modal State
    const [creditModal, setCreditModal] = useState<{ show: boolean, type: 'earn' | 'deduct', amount: number, message: string }>({ show: false, type: 'earn', amount: 0, message: '' });

    // Load existing data if editing - MUST BE BEFORE GUEST CHECK
    useEffect(() => {
        if (editId) {
            // Parse ID if it contains query params
            const cleanId = editId.split('?')[0];
            const target = toilets.find(t => t.id === cleanId);
            if (target) {
                const loadedData = {
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
                    stallCount: target.stallCount || 1,
                    type: target.type
                };
                setFormData(loadedData);
                setOriginalIsPrivate(target.isPrivate);
                // Save initial state for dirty check
                initialFormDataRef.current = loadedData;
            }
        } else {
            // Initial state for new registration
            initialFormDataRef.current = { ...formData };
        }
    }, [editId, toilets]);


    // Check for Temp Data from Photo Registration (NEW)
    useEffect(() => {
        const temp = localStorage.getItem('temp_submit_data');
        if (temp) {
            try {
                const data = JSON.parse(temp);
                console.log("📥 Loading temp submit data:", data);

                setFormData(prev => ({
                    ...prev,
                    password: data.password || prev.password,
                    genderType: (data.gender && data.gender !== 'null') ? data.gender : Gender.UNISEX,
                }));

                // Handle location
                if (data.location && data.location.lat && data.location.lng) {
                    const { lat, lng } = data.location;
                    if (prevLatRef.current !== lat) { // Simple check to avoid loops if needed, though dependency is []
                        // Trigger Geocoding if Maps available
                        if (window.google?.maps) {
                            const geocoder = new window.google.maps.Geocoder();
                            geocoder.geocode({ location: { lat, lng }, language: 'ko' }, (results: any, status: any) => {
                                if (status === 'OK' && results?.[0]) {
                                    const addr = results[0].formatted_address.replace(/^대한민국\s*/, '');
                                    setFormData(prev => ({ ...prev, lat, lng, address: addr }));
                                } else {
                                    setFormData(prev => ({ ...prev, lat, lng }));
                                }
                            });
                        } else {
                            // If maps not loaded, just set lat/lng. 
                            // The address might be empty, user can fetch it by moving pin slightly or we can rely on SubmitPage's own map init to fetch it?
                            // SubmitPage's map init fetches address ONLY if user moves pin.
                            // So best to set lat/lng here.
                            setFormData(prev => ({ ...prev, lat, lng }));
                        }
                    }
                }

                localStorage.removeItem('temp_submit_data');

            } catch (e) {
                console.error("Failed to parse temp submit data", e);
            }
        }
    }, []);

    const prevLatRef = useRef<number | null>(null); // Helper to prevent re-runs if needed, though [] deps handles it.



    const initPickerMap = useCallback(() => {
        if (!pickerMapRef.current) return;
        if (!window.google?.maps) return;

        // Use current ref or formData values for INITIAL center only.
        const map = new window.google.maps.Map(pickerMapRef.current, {
            center: { lat: formData.lat, lng: formData.lng },
            zoom: 18,
            disableDefaultUI: true,
            styles: darkMode
                ? [...DARK_MAP_STYLE, { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
        });
        pickerGoogleMap.current = map;


        map.addListener('center_changed', () => {
            const center = map.getCenter();
            if (center) {
                setFormData(prev => ({ ...prev, lat: center.lat(), lng: center.lng() }));
            }
        });

        // Pulsing Blue Dot (Custom Overlay)
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
                div.innerHTML = `
                    <div class="relative flex items-center justify-center w-8 h-8">
                        <span class="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75 animate-ping"></span>
                        <span class="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white shadow-sm"></span>
                    </div>
                `;
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

    }, [myLocation]); // Removed darkMode from deps to prevent re-init loop, handled in separate effect

    // Dark Mode Effect
    useEffect(() => {
        if (pickerGoogleMap.current) {
            pickerGoogleMap.current.setOptions({
                styles: darkMode
                    ? [...DARK_MAP_STYLE, { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                    : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
            });
        }
    }, [darkMode]);


    // Map initialization effect - Moved here to be after initPickerMap definition
    useEffect(() => {
        if (step === 'location') {
            // Force clear the ref to ensure re-initialization on the new DOM node
            pickerGoogleMap.current = null;
            // Add slight delay to ensure DOM is ready and prevent blank map issues
            setTimeout(() => {
                if (window.google?.maps) initPickerMap();
                else { const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_API_KEY}&libraries=places&language=ko&loading=async`; script.async = true; script.onload = initPickerMap; document.head.appendChild(script); }
            }, 100);
        }
    }, [step, initPickerMap]);


    if (user.role === UserRole.GUEST) {
        return (
            <PageLayout>
                <div className="h-full flex flex-col items-center justify-center p-8 bg-surface dark:bg-surface-dark">
                    <div className="w-20 h-20 bg-primary-50 dark:bg-primary-900/10 rounded-full flex items-center justify-center mb-6"><Plus className="w-10 h-10 text-primary-500" /></div>
                    <h2 className="text-xl font-bold mb-2 text-text-main dark:text-text-light">화장실을 등록하려면<br />로그인이 필요해요</h2>
                    <button onClick={onShowLogin} className="mt-8 w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/30">로그인하기</button>
                </div>
            </PageLayout>
        )
    }

    const handlePickerCurrentLocation = () => {
        if (pickerGoogleMap.current) {
            setIsPickerLocating(true);
            // Use the trusted myLocation passed from App.tsx (which handles IP fallback, cache, etc.)
            pickerGoogleMap.current.panTo(myLocation);
            // Simulate a brief interaction feedback
            setTimeout(() => setIsPickerLocating(false), 300);
        }
    };

    const handleSetLocation = () => {
        if (!window.google?.maps || !pickerGoogleMap.current) { setStep('details'); return; }
        const center = pickerGoogleMap.current.getCenter();
        const lat = center.lat();
        const lng = center.lng();

        const geocoder = new window.google.maps.Geocoder();

        // 1. Get Address via Geocoding
        geocoder.geocode({ location: { lat, lng }, language: 'ko' }, (results: any, status: any) => {
            let addr = "지도에서 선택된 위치";
            let detectedType: Toilet['type'] = 'user_registered';

            if (status === "OK" && results && results.length > 0) {
                // Priority: Street Address > Subpremise > Premise > Establishment > POI > ...
                // Avoid 'plus_code' if possible.
                const prioritizedTypes = ['street_address', 'route', 'subpremise', 'premise', 'establishment', 'point_of_interest', 'transit_station'];

                const bestResult = results.find((r: any) => r.types.some((t: string) => prioritizedTypes.includes(t)));
                const fallbackAddress = results.find((r: any) => !r.types.includes('plus_code'));

                addr = (bestResult || fallbackAddress || results[0]).formatted_address;
                addr = addr.replace(/^대한민국\s*/, '');

                // Auto Classification
                for (const result of results) {
                    if (result.types && result.types.length > 0) {
                        const mapped = mapGoogleTypeToInternalType(result.types);
                        if (mapped) {
                            detectedType = mapped;
                            break;
                        }
                    }
                }

                // 2. Search for Building Name via Places API (New)
                // Use importLibrary to load the new Places library
                window.google.maps.importLibrary("places").then((lib: any) => {
                    const { Place } = lib;
                    const request = {
                        fields: ['displayName', 'primaryType', 'types', 'businessStatus', 'location'],
                        locationRestriction: {
                            center: { lat, lng },
                            radius: 20
                        }
                    };

                    Place.searchNearby(request).then((response: any) => {
                        const placeResults = response.places;
                        let bestBuildingName = '';

                        if (placeResults && placeResults.length > 0) {
                            // 7. Final "Building Name Only" Decision Logic
                            const extractPureBuildingName = (places: any[]) => {
                                return places
                                    // 4th Filter: Business Status
                                    .filter(p => p.businessStatus === 'OPERATIONAL')
                                    .filter(p => {
                                        const pTypes = p.types || [];
                                        // 1st Filter: Type Basis
                                        // Reject if any excluded type is present
                                        if (isTenantPlace(pTypes)) return false;
                                        return true;
                                    })
                                    .filter(p => {
                                        const textName = p.displayName;
                                        if (!textName) return false;
                                        // 2nd Filter: Exclude Keywords
                                        if (hasExcludedKeyword(textName)) return false;
                                        return true;
                                    })
                                    .filter(p => {
                                        const textName = p.displayName;
                                        const pTypes = p.types || [];

                                        // 3rd Filter: Building Likeness
                                        const hasSuffix = isBuildingLike(textName);
                                        const isPremise = p.primaryType === 'premise' || pTypes.includes('premise');

                                        // Suffix Exists -> Pass
                                        // No Suffix + Premise -> Conditional Pass
                                        // No Suffix + POI -> Reject
                                        if (hasSuffix) return true;
                                        if (isPremise) return true;

                                        return false;
                                    })
                                    // Rank: Strictly by Distance (Closest Building Wins)
                                    // We've already filtered out non-buildings, so the closest one is the most likely target.
                                    .sort((a, b) => {
                                        const distA = calculateDistance(lat, lng, a.location.lat(), a.location.lng());
                                        const distB = calculateDistance(lat, lng, b.location.lat(), b.location.lng());
                                        return distA - distB;
                                    });
                            };

                            const candidates = extractPureBuildingName(placeResults);

                            // Debugging log for verification
                            // console.log("Building Candidates:", candidates.map(c => `${c.displayName} (${calculateDistance(lat, lng, c.location.lat(), c.location.lng()).toFixed(1)}m)`));

                            if (candidates.length > 0) {
                                // Pick the top one (Closest)
                                const best = candidates[0];
                                const cleanAddr = addr.replace(/\s+/g, '');
                                const cleanName = best.displayName.replace(/\s+/g, '');

                                // Prevent duplication
                                if (!cleanAddr.includes(cleanName)) {
                                    bestBuildingName = best.displayName;
                                }
                            }
                        }

                        if (bestBuildingName) {
                            addr += ` (${bestBuildingName})`;
                        }

                        setFormData(prev => ({
                            ...prev,
                            lat,
                            lng,
                            address: addr,
                            type: detectedType
                        }));
                        setStep('details');
                    }).catch((err: any) => {
                        console.error("Places Search Error:", err);
                        // Fallback if places fails
                        setFormData(prev => ({ ...prev, lat, lng, address: addr, type: detectedType }));
                        setStep('details');
                    });
                });
            } else {
                // Geocoding failed
                setFormData(prev => ({ ...prev, lat, lng, address: addr, type: detectedType }));
                setStep('details');
            }
        });
    };


    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const handleDeleteConfirm = async () => {
        if (!editId) return;

        setShowDeleteModal(false);
        setIsSubmitting(true);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));

        await db.deleteToilet(editId);

        const isPublic = !originalIsPrivate;
        if (isPublic) {
            // Deduct credits logic
            await db.updateUserCredits(user.id, -5);

            // Re-fetch user to get updated credits
            const users = await db.getUsers();
            const updatedUser = users.find(u => u.id === user.id);
            if (updatedUser) {
                onUserUpdate(updatedUser);
                onSubmitSuccess(); // Refresh map data immediately
                setCreditModal({
                    show: true,
                    type: 'deduct',
                    amount: 5,
                    message: '화장실 삭제 완료'
                });
                return; // Wait for modal close to navigate
            }
        }

        // If not public or no user update needed immediately (or error), just close
        onSubmitSuccess();
        window.location.hash = '#/';
        setIsSubmitting(false);
    };

    const handleBack = () => {
        const currentData = JSON.stringify(formData);
        const initialData = JSON.stringify(initialFormDataRef.current);

        // If data hasn't changed (or it's just initial default), go back naturally
        if (currentData === initialData) {
            window.history.back();
            return;
        }

        // If dirty, show warning
        setShowExitModal(true);
    };

    const handleSubmit = async (mode: 'private' | 'shared' | 'public_data') => {
        if (isSubmitting) return; // Prevent double submission

        const isPrivate = mode === 'private';
        const source = mode === 'public_data' ? 'admin' : 'user';

        try {
            // Default Name Logic
            let finalName = formData.name.trim();
            if (!finalName) {
                finalName = formData.password ? "미개방화장실" : "개방화장실";
            }

            setIsSubmitting(true);

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
                address: formData.address || "주소 없음",
                type: formData.type || 'user_registered',
                cleanliness: 5,
                stallCount: formData.stallCount,
                crowdLevel: 'low',
                distance: 0,
                createdBy: user.id,
                isPrivate: isPrivate,
                hasPassword: !!formData.password,
                note: formData.note,
                source: source,
                isVerified: false,
                createdAt: new Date().toISOString()
            };

            // Simulate network delay for UX
            await new Promise(resolve => setTimeout(resolve, 800));

            let result;
            if (editId) {
                result = await db.updateToilet(toiletData);
            } else {
                result = await db.addToilet(toiletData);
            }

            if (!result.success) {
                setAlertState({ show: true, message: result.message || "처리 실패" });
                setIsSubmitting(false);
                return;
            }

            const onSuccessAction = () => {
                onSubmitSuccess();
                setIsSubmitting(false);

                // Check if we came from admin page
                if (isFromAdminRef.current) {
                    // If we have a reportId, return to that specific report modal
                    if (reportIdRef.current) {
                        window.location.hash = `#/admin?openReport=${reportIdRef.current}`;
                    } else {
                        window.location.hash = '#/admin';
                    }
                } else {
                    window.location.hash = '#/';
                }
            };

            // Credit Logic
            if (editId) {
                // Check if changing from Private to Public
                if (originalIsPrivate && !isPrivate) {
                    const policy = await db.getCreditPolicy();
                    const reward = policy.toiletSubmit;
                    await db.updateUserCredits(user.id, reward);
                    // Fetch updated user
                    const users = await db.getUsers();
                    const updatedUser = users.find(u => u.id === user.id);
                    if (updatedUser) {
                        onUserUpdate(updatedUser);
                        onSubmitSuccess(); // Refresh map data immediately
                        setCreditModal({ show: true, type: 'earn', amount: reward, message: '공유하기로 변경 완료!' });
                        return;
                    }
                } else {
                    setAlertState({
                        show: true,
                        message: "수정이 완료되었습니다.",
                        onConfirm: onSuccessAction
                    });
                }
            } else {
                if (!isPrivate) {
                    const policy = await db.getCreditPolicy();
                    const reward = policy.toiletSubmit;
                    await db.updateUserCredits(user.id, reward);
                    // Fetch updated user
                    const users = await db.getUsers();
                    const updatedUser = users.find(u => u.id === user.id);
                    if (updatedUser) {
                        onUserUpdate(updatedUser);
                        onSubmitSuccess(); // Refresh map data immediately
                        setCreditModal({ show: true, type: 'earn', amount: reward, message: '화장실 등록 감사합니다!' });
                        return;
                    }
                } else {
                    setAlertState({
                        show: true,
                        message: "나만보기로 잘 저장되었어요. 🔒\n언제든 '공유하기'로 바꿀 수 있으니,\n혹시 괜찮다면 다른 분들을 위해 공유해주시면 정말 감사할 것 같아요! 😊",
                        onConfirm: onSuccessAction
                    });
                }
            }
        } catch (e) {
            console.error("Submission Error", e);
            setAlertState({ show: true, message: "오류가 발생했습니다. 다시 시도해주세요." });
            setIsSubmitting(false);
        }
    };

    if (step === 'location') {
        return (
            <div className="h-full w-full relative bg-background dark:bg-background-dark flex flex-col">
                <div className="flex-1 w-full relative">
                    <div ref={pickerMapRef} className="w-full h-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-xl"><img src="/images/pins/uni_near_pin.png" width="50" height="50" alt="pin" /></div>
                    <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-20">
                        <button onClick={handlePickerCurrentLocation} className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700">
                            {isPickerLocating ? <Loader2 className="animate-spin w-6 h-6 text-blue-500" /> : <Crosshair className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
                <div className="bg-surface dark:bg-surface-dark p-4 pb-8 rounded-t-2xl shadow-2xl space-y-3 z-20 flex justify-center"><div className="w-full max-w-md space-y-3"><button onClick={handleSetLocation} className="w-full py-4 bg-primary text-white font-bold rounded-xl text-lg shadow-lg">이 위치로 설정</button><button onClick={() => setStep('details')} className="w-full py-3 bg-background dark:bg-background-dark text-text-muted font-bold rounded-xl border border-border dark:border-border-dark">취소</button></div></div>
            </div>
        )
    }

    return (
        <PageLayout className="pb-24 p-4">
            <div className="flex items-center gap-3 mb-6">
                <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="w-6 h-6 text-text-main dark:text-text-light" />
                </button>
                <h2 className="text-2xl font-black text-text-main dark:text-text-light">{editId ? "화장실 수정" : "화장실 등록"}</h2>
            </div>
            <div className="space-y-4">
                <div className="bg-surface dark:bg-surface-dark p-5 rounded-2xl shadow-sm border border-border dark:border-border-dark">
                    <button onClick={() => setStep('location')} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-primary/20"><Crosshair className="w-4 h-4" /> {formData.address ? "위치 수정하기" : "지도에서 위치 찾기"}</button>
                </div>
                <div className="bg-surface dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-border dark:border-border-dark space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">주소</label>
                        <div className={`w-full p-3 rounded-lg text-sm border ${formData.address ? 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-main dark:text-text-light' : 'bg-background dark:bg-background-dark border-transparent text-text-muted'}`}>
                            {formData.address || "위치를 선택하면 자동 입력됩니다"}
                        </div>
                    </div>
                    <div><label className="block text-xs font-bold text-text-muted mb-1">이름</label><input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="예: 스타벅스 (미입력시 자동설정)" className="w-full p-3 bg-background dark:bg-background-dark text-text-main dark:text-text-light rounded-lg outline-none" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-muted mb-1">층수</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFormData(prev => {
                                        const newFloor = Number(prev.floor) - 1;
                                        return { ...prev, floor: String(newFloor === 0 ? -1 : newFloor) };
                                    })}
                                    className="w-10 h-10 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center text-text-muted hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <input
                                    type="number"
                                    value={formData.floor}
                                    onChange={e => setFormData({ ...formData, floor: e.target.value })}
                                    placeholder="1"
                                    className="flex-1 w-0 min-w-[3rem] p-3 bg-background dark:bg-background-dark text-text-main dark:text-text-light rounded-lg outline-none text-center font-bold no-spinner"
                                    onBlur={() => {
                                        // Auto-correct 0 to 1 if user typed 0 manually
                                        if (Number(formData.floor) === 0) setFormData(prev => ({ ...prev, floor: "1" }));
                                    }}
                                />
                                <button
                                    onClick={() => setFormData(prev => {
                                        const newFloor = Number(prev.floor) + 1;
                                        return { ...prev, floor: String(newFloor === 0 ? 1 : newFloor) };
                                    })}
                                    className="w-10 h-10 rounded-lg bg-surface dark:bg-surface-dark border border-border dark:border-border-dark flex items-center justify-center text-text-muted hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-muted mb-1">비번</label>
                            <button
                                onClick={() => setShowDoorlock(true)}
                                className={`w-full h-10 mt-[1px] rounded-lg flex items-center justify-center transition-all active:scale-95 ${formData.password ? 'bg-primary-50 border-2 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-mono text-lg tracking-widest shadow-sm' : 'bg-white dark:bg-gray-800 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-400'}`}
                                style={{ height: '42px' }}
                            >
                                {formData.password ? formData.password : <span className="text-sm font-bold flex items-center gap-2 animate-pulse"><Lock className="w-4 h-4" /> 비번 입력</span>}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-background dark:bg-background-dark p-3 rounded-lg">
                        <label className="text-xs font-bold text-text-muted">변기 개수</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setFormData(prev => ({ ...prev, stallCount: Math.max(1, prev.stallCount - 1) }))} className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark shadow flex items-center justify-center text-text-muted hover:bg-gray-100 dark:hover:bg-gray-600"><Minus className="w-4 h-4" /></button>
                            <span className="font-bold text-lg w-6 text-center text-text-main dark:text-text-light">{formData.stallCount}</span>
                            <button onClick={() => setFormData(prev => ({ ...prev, stallCount: prev.stallCount + 1 }))} className="w-8 h-8 rounded-full bg-surface dark:bg-surface-dark shadow flex items-center justify-center text-text-muted hover:bg-gray-100 dark:hover:bg-gray-600"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setFormData({ ...formData, hasPaper: !formData.hasPaper })} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${formData.hasPaper ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-muted'}`}>
                            <img src="/images/icons/tissue.png" width={45} height={45} alt="tissue" className={`object-contain ${!formData.hasPaper && 'opacity-40 grayscale'}`} />
                            <span className={`text-sm font-bold ${formData.hasPaper ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>휴지</span>
                        </button>
                        <button onClick={() => setFormData({ ...formData, hasBidet: !formData.hasBidet })} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${formData.hasBidet ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-muted'}`}>
                            <img src="/images/icons/bidet.png" width={45} height={45} alt="bidet" className={`object-contain ${!formData.hasBidet && 'opacity-40 grayscale'}`} />
                            <span className={`text-sm font-bold ${formData.hasBidet ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>비데</span>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setFormData({ ...formData, genderType: Gender.MALE })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.MALE ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>남성</button>
                        <button onClick={() => setFormData({ ...formData, genderType: Gender.FEMALE })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.FEMALE ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>여성</button>
                        <button onClick={() => setFormData({ ...formData, genderType: Gender.UNISEX })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.UNISEX ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>공용</button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-muted mb-1">참고사항 (선택)</label>
                        <textarea
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            placeholder="예: 휴지가 자주 없음, 도어락 뻑뻑함 등"
                            className="w-full p-3 bg-background dark:bg-background-dark text-text-main dark:text-text-light rounded-lg outline-none min-h-[80px] text-sm resize-none"
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
                                <button disabled={isSubmitting} onClick={() => handleSubmit('private')} className="flex-1 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors border border-gray-200 flex justify-center items-center gap-2 text-sm">
                                    {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                    수정완료
                                </button>
                                {!isFromAdminRef.current && (
                                    <button disabled={isSubmitting} onClick={handleDeleteClick} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex justify-center items-center gap-2 text-sm">
                                        <Trash2 className="w-4 h-4" />
                                        삭제하기
                                    </button>
                                )}
                            </div>
                            <button disabled={isSubmitting} onClick={() => handleSubmit('shared')} className="w-full py-4 bg-urgency text-white font-bold rounded-xl hover:bg-urgency-500 transition-colors flex justify-center items-center gap-2 text-base">
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                공유하기로 변경등록 (+5 Cr)
                            </button>
                        </div>
                    ) : (
                        // Public Toilet Edit
                        <div className="flex gap-2 mt-4">
                            <button disabled={isSubmitting} onClick={() => handleSubmit('shared')} className="flex-1 py-4 bg-urgency text-white font-bold rounded-xl hover:bg-urgency-500 transition-colors flex justify-center items-center gap-2 text-base">
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                수정완료
                            </button>
                            {!isFromAdminRef.current && (
                                <button disabled={isSubmitting} onClick={handleDeleteClick} className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex justify-center items-center gap-2 text-sm">
                                    <Trash2 className="w-4 h-4" />
                                    삭제하기 (-5 Cr)
                                </button>
                            )}
                        </div>
                    )
                ) : (
                    // CREATE MODE (Default)
                    <div className="flex gap-2 w-full max-w-sm mx-auto mt-4">
                        <button disabled={isSubmitting} onClick={() => handleSubmit('private')} className="flex-1 py-4 bg-background dark:bg-background-dark text-text-main dark:text-text-light font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-border dark:border-border-dark flex justify-center items-center gap-2 text-xs sm:text-sm">
                            {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            나만보기 (0cr)
                        </button>
                        <button disabled={isSubmitting} onClick={() => handleSubmit('shared')} className="flex-[2] py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-600 transition-colors flex justify-center items-center gap-2 text-sm sm:text-base">
                            {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            공유하기 (+5cr)
                        </button>
                        {user.role === UserRole.ADMIN && (
                            <button disabled={isSubmitting} onClick={() => handleSubmit('public_data')} className="flex-[2] py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 text-sm sm:text-base">
                                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                공공데이터
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Doorlock Modal */}
            {showDoorlock && (
                <DoorlockModal
                    initialValue={formData.password}
                    onClose={() => setShowDoorlock(false)}
                    onComplete={(pw) => {
                        setFormData({ ...formData, password: pw });
                        setShowDoorlock(false);
                    }}
                />
            )}

            {/* Exit Confirmation Modal */}
            {showExitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="text-center mb-6">
                            <p className="text-lg font-bold text-text-main dark:text-text-light whitespace-pre-wrap leading-relaxed">
                                다른분께 큰 도움을 줄 수 있어요.<br />정말 나가시겠어요?
                            </p>
                        </div>
                        <div className="flex gap-3 h-14">
                            <button
                                onClick={() => window.history.back()}
                                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                나가기
                            </button>
                            <button
                                onClick={() => setShowExitModal(false)}
                                className="flex-[2] bg-primary text-white font-bold rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary/30"
                            >
                                나머지 입력하기
                            </button>
                        </div>
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
                        <h3 className="text-xl font-bold text-center mb-3 text-gray-900 dark:text-white">정말 삭제하시겠습니까?</h3>
                        {!originalIsPrivate && (
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                                    ⚠️ 공유된 화장실을 삭제하면<br />
                                    <span className="font-bold text-red-600 dark:text-red-400">5크래딧이 차감</span>됩니다.
                                </p>
                            </div>
                        )}
                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-6">
                            삭제된 화장실은 복구할 수 없습니다.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CreditModal
                isOpen={creditModal.show}
                type={creditModal.type}
                amount={creditModal.amount}
                message={creditModal.message}
                onClose={() => {
                    setCreditModal(prev => ({ ...prev, show: false }));

                    if (isFromAdminRef.current) {
                        if (reportIdRef.current) {
                            window.location.hash = `#/admin?openReport=${reportIdRef.current}`;
                        } else {
                            window.location.hash = '#/admin';
                        }
                    } else {
                        window.location.hash = '#/';
                    }
                }}
            />

            <AlertModal
                isOpen={alertState.show}
                message={alertState.message}
                onClose={() => {
                    const callback = alertState.onConfirm;
                    setAlertState({ show: false, message: '' });
                    if (callback) callback();
                }}
            />
        </PageLayout>
    );
};

export default SubmitPage;
