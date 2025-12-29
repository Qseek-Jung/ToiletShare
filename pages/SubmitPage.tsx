import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, ScrollText, Waves, Crosshair, Loader2, Check, Trash2, Lock, Globe, X } from 'lucide-react';
import { Toilet, User, UserRole, Gender } from '../types';
import { dbSupabase as db } from '../services/db_supabase';
import { MAPS_API_KEY } from '../config';
import { getMarkerSvg } from '../utils';
import { PageLayout } from '../components/PageLayout';
import { AdBanner } from '../components/AdBanner';
import DoorlockModal from '../components/DoorlockModal';

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

    const pickerMapRef = useRef<HTMLDivElement>(null);
    const pickerGoogleMap = useRef<any>(null);
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


    const initPickerMap = useCallback(() => {
        if (!pickerMapRef.current) return;
        // Check if map is already initialized on this specific DOM element to avoid reloading
        // However, if we switched steps, the DOM element is new, so we must re-init.
        if (!window.google?.maps) return;

        const map = new window.google.maps.Map(pickerMapRef.current, { center: { lat: formData.lat, lng: formData.lng }, zoom: 18, disableDefaultUI: true });
        pickerGoogleMap.current = map;
        // Removed center_changed listener to prevent re-rendering loop. We read center directly on submit.

        new window.google.maps.Marker({ position: myLocation, map: map, icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#3B82F6", fillOpacity: 1, strokeColor: "white", strokeWeight: 2 }, zIndex: 1 });
        new window.google.maps.Circle({ strokeColor: "#3B82F6", strokeOpacity: 0.3, strokeWeight: 1, fillColor: "#3B82F6", fillOpacity: 0.1, map: map, center: myLocation, radius: 30 });
    }, [formData.lat, formData.lng, myLocation]);

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
            <PageLayout>
                <div className="h-full flex flex-col items-center justify-center p-8 bg-white">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6"><Plus className="w-10 h-10 text-amber-500" /></div>
                    <h2 className="text-xl font-bold mb-2">화장실을 등록하려면<br />로그인이 필요해요</h2>
                    <button onClick={onShowLogin} className="mt-8 w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg">로그인하기</button>
                </div>
            </PageLayout>
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
            () => { setIsPickerLocating(false); alert("위치 정보를 가져올 수 없습니다."); },
            { enableHighAccuracy: true }
        );
    };

    const handleSetLocation = () => {
        if (!window.google?.maps || !pickerGoogleMap.current) { setStep('details'); return; }
        const center = pickerGoogleMap.current.getCenter();
        const lat = center.lat();
        const lng = center.lng();

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng }, language: 'ko' }, (results: any, status: any) => {
            let addr = "지도에서 선택된 위치";
            if (status === "OK" && results && results.length > 0) {
                // Try to find a road address (street_address) first
                const roadAddress = results.find((r: any) => r.types.includes('street_address'));
                if (roadAddress) {
                    addr = roadAddress.formatted_address;
                } else {
                    addr = results[0].formatted_address;
                }
                addr = addr.replace(/^대한민국\s*/, '');
            }
            setFormData(prev => ({ ...prev, lat, lng, address: addr }));
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
            await db.updateUserCredits(user.id, -5);
            await db.logCreditTransaction(user.id, -5, 'toilet_delete_penalty', 'toilet', editId, '공유 화장실 삭제 페널티');

            // Re-fetch user to get updated credits
            const users = await db.getUsers();
            const updatedUser = users.find(u => u.id === user.id);
            if (updatedUser) {
                onUserUpdate(updatedUser);
            }
            alert(`삭제되었습니다. 5크레딧이 차감되었습니다.`);
        } else {
            alert("삭제되었습니다.");
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
                finalName = formData.password ? "미개방화장실" : "개방화장실";
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
                address: formData.address || "주소 없음",
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
                alert(result.message || "처리 실패");
                setSubmitState('idle');
                return;
            }

            // Update user credits for sharing (Reward already handled inside db.addToilet for new ones)
            // But we need to update the local user state
            if (editId) {
                if (originalIsPrivate && !isPrivate) {
                    await db.updateUserCredits(user.id, 5);
                    await db.logCreditTransaction(user.id, 5, 'toilet_share_reward', 'toilet', editId, '공유하기 변경 보상');
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
            alert("오류가 발생했습니다. 다시 시도해주세요.");
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
            <div className="h-full w-full relative bg-gray-100 flex flex-col">
                <div className="flex-1 w-full relative">
                    <div ref={pickerMapRef} className="w-full h-full" />

                    {/* Top Right Close Button */}
                    <button
                        onClick={() => setStep('details')}
                        className="absolute top-4 right-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-50 active:scale-95 transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none drop-shadow-xl"><img src={getMarkerSvg(formData.genderType, '#EF4444')} width="40" height="40" alt="pin" /></div>
                    <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-4 z-20">
                        <button onClick={handlePickerCurrentLocation} className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700">
                            {isPickerLocating ? <Loader2 className="animate-spin w-6 h-6 text-blue-500" /> : <Crosshair className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
                {/* Adjust padding for Ad Banner logic (100px + safe area) */}
                <div className="bg-white p-4 pb-[calc(100px+env(safe-area-inset-bottom))] rounded-t-2xl shadow-2xl space-y-3 z-20 flex justify-center border-t border-gray-200">
                    <div className="w-full max-w-md space-y-3">
                        <button onClick={handleSetLocation} className="w-full py-4 bg-primary text-white font-bold rounded-xl text-lg shadow-lg">이 위치로 설정</button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <PageLayout className="pb-48 p-4">
            <h2 className="text-2xl font-black mb-6 dark:text-white">{editId ? "화장실 수정" : "화장실 등록"}</h2>
            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <button onClick={() => setStep('location')} className="w-full py-4 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md"><Crosshair className="w-4 h-4" /> {formData.address ? "위치 수정하기" : "지도에서 위치 찾기"}</button>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">주소</label>
                        <div className={`w-full p-3 rounded-lg text-sm border ${formData.address ? 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white' : 'bg-gray-50 dark:bg-gray-700 border-transparent text-gray-400'}`}>
                            {formData.address || "위치를 선택하면 자동 입력됩니다"}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">건물명 또는 위치설명</label>
                        <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="예: 편의점 우측끼고 돌아서 계단실 안쪽" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">층수</label>
                            <input type="number" value={formData.floor} onChange={e => setFormData({ ...formData, floor: e.target.value })} placeholder="1" className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">비번</label>
                            <button
                                onClick={() => setShowDoorlock(true)}
                                className={`w-full h-10 mt-[1px] rounded-lg flex items-center justify-center transition-all active:scale-95 ${formData.password ? 'bg-primary-50 border-2 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300 font-mono text-lg tracking-widest shadow-sm' : 'bg-white dark:bg-gray-800 border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-400'}`}
                                style={{ height: '42px' }}
                            >
                                {formData.password ? formData.password : <span className="text-sm font-bold flex items-center gap-2 animate-pulse"><Lock className="w-4 h-4" /> 비번 입력</span>}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">변기 개수</label>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setFormData(prev => ({ ...prev, stallCount: Math.max(1, prev.stallCount - 1) }))} className="w-8 h-8 rounded-full bg-white dark:bg-gray-600 shadow flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"><Minus className="w-4 h-4" /></button>
                            <span className="font-bold text-lg w-6 text-center text-gray-900 dark:text-white">{formData.stallCount}</span>
                            <button onClick={() => setFormData(prev => ({ ...prev, stallCount: prev.stallCount + 1 }))} className="w-8 h-8 rounded-full bg-white dark:bg-gray-600 shadow flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-500"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setFormData({ ...formData, hasPaper: !formData.hasPaper })} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${formData.hasPaper ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-muted'}`}>
                            <img src="/images/icons/tissue.png" width={45} height={45} alt="tissue" className={`object-contain ${!formData.hasPaper && 'opacity-40 grayscale'}`} />
                            <span className={`text-sm font-bold ${formData.hasPaper ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>{formData.hasPaper ? '휴지 있음' : '휴지 없음'}</span>
                        </button>
                        <button onClick={() => setFormData({ ...formData, hasBidet: !formData.hasBidet })} className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 ${formData.hasBidet ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-surface dark:bg-surface-dark border-border dark:border-border-dark text-text-muted'}`}>
                            <img src="/images/icons/bidet.png" width={45} height={45} alt="bidet" className={`object-contain ${!formData.hasBidet && 'opacity-40 grayscale'}`} />
                            <span className={`text-sm font-bold ${formData.hasBidet ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>{formData.hasBidet ? '비데 있음' : '비데 없음'}</span>
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setFormData({ ...formData, genderType: Gender.MALE })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.MALE ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>남성</button>
                        <button onClick={() => setFormData({ ...formData, genderType: Gender.FEMALE })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.FEMALE ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>여성</button>
                        <button onClick={() => setFormData({ ...formData, genderType: Gender.UNISEX })} className={`flex-1 py-3 rounded-lg text-sm font-medium border ${formData.genderType === Gender.UNISEX ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800 text-primary-700 dark:text-primary-300' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark text-text-muted'}`}>공용</button>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">참고사항 (선택)</label>
                        <textarea
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            placeholder="예: 휴지가 자주 없음, 도어락 뻑뻑함 등"
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg outline-none min-h-[80px] text-sm resize-none"
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
                                    수정완료
                                </button>
                                {!isFromAdminRef.current && (
                                    <button disabled={submitState !== 'idle'} onClick={handleDeleteClick} className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800 flex justify-center items-center gap-2 text-sm">
                                        <Trash2 className="w-4 h-4" />
                                        삭제하기
                                    </button>
                                )}
                            </div>
                            <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(false)} className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-200 transition-colors flex justify-center items-center gap-2 text-base">
                                {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                                공유하기로 변경등록 (+5 Cr)
                            </button>
                        </div>
                    ) : (
                        // Public Toilet Edit
                        <div className="flex gap-2 mt-4">
                            <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(false)} className="flex-1 py-4 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-200 transition-colors flex justify-center items-center gap-2 text-base">
                                {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                                수정완료
                            </button>
                            {!isFromAdminRef.current && (
                                <button disabled={submitState !== 'idle'} onClick={handleDeleteClick} className="flex-1 py-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-100 dark:border-red-800 flex justify-center items-center gap-2 text-sm">
                                    <Trash2 className="w-4 h-4" />
                                    삭제하기 (-5 Cr)
                                </button>
                            )}
                        </div>
                    )
                ) : (
                    // CREATE MODE (Default)
                    <div className="flex gap-2 w-full max-w-sm mx-auto mt-4 px-1">
                        <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(true)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 flex justify-center items-center gap-2 text-sm">
                            {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Lock className="w-4 h-4" />}
                            나만보기 (0cr)
                        </button>
                        <button disabled={submitState !== 'idle'} onClick={() => handleSubmit(false)} className="flex-[2] py-4 bg-gray-900 dark:bg-black text-white font-bold rounded-xl hover:bg-gray-800 shadow-xl shadow-gray-200 dark:shadow-none transition-colors flex justify-center items-center gap-2 text-base">
                            {submitState === 'processing' ? <Loader2 className="animate-spin w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            공유하기 (+5cr)
                        </button>
                    </div>
                )}
            </div>

            {/* Registration Processing/Success Modal with Ad */}
            {submitState !== 'idle' && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-8 shadow-2xl flex flex-col items-center text-center space-y-6">

                        {submitState === 'processing' ? (
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary-500 rounded-full opacity-20 animate-ping"></div>
                                <div className="relative w-20 h-20 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                    <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
                                </div>
                            </div>
                        ) : (
                            <div className="w-20 h-20 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-in zoom-in duration-300">
                                <Check className="w-10 h-10 text-green-500" />
                            </div>
                        )}

                        <div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">
                                {submitState === 'processing'
                                    ? (editId ? '수정 중입니다...' : '등록 중입니다...')
                                    : (editId ? '수정이 완료되었습니다!' : '등록이 완료되었습니다!')
                                }
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                {submitState === 'processing' ? (
                                    <>잠시만 기다려주세요.<br />소중한 정보를 저장하고 있습니다. 💾</>
                                ) : (
                                    <><span className="text-primary-600 dark:text-primary-400 font-bold">크레딧이 성공적으로 지급되었습니다.</span><br />감사합니다! 💖</>
                                )}
                            </p>
                        </div>

                        {/* Persistent Ad Banner */}
                        <div className="w-full max-w-[300px] h-auto min-h-[120px] bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center relative overflow-hidden">
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 text-[10px] text-gray-500 dark:text-gray-400 rounded z-10">AD</span>
                            <AdBanner isInline maxHeight={250} maxRatio={3.5} className="w-full h-full" />
                        </div>

                        {submitState === 'success' && (
                            <button
                                onClick={handleCloseAfterSuccess}
                                className="w-full py-4 bg-gray-900 dark:bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all animate-in slide-in-from-bottom-2"
                            >
                                닫기
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
                        <h3 className="text-xl font-bold text-center mb-3 dark:text-white">정말 삭제하시겠습니까?</h3>
                        {!originalIsPrivate && (
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                                    ⚠️ 공유된 화장실을 삭제하면<br />
                                    <span className="font-bold text-red-600 dark:text-red-400">5크레딧이 차감</span>됩니다.
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
        </PageLayout>
    );
};

export default SubmitPage;
