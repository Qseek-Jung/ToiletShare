import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Trash2, Check, Star, MapPin, X, Crosshair, Loader2, Minus, Plus, ScrollText, Waves } from 'lucide-react';
import { Toilet, Gender, Review } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';

interface AdminToiletDetailProps {
    toilet: Toilet;
    onBack: () => void;
    onSave: (toilet: Toilet) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export const AdminToiletDetail: React.FC<AdminToiletDetailProps> = ({ toilet, onBack, onSave, onDelete }) => {
    const [formData, setFormData] = useState<Toilet>({ ...toilet });
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [showLocationPicker, setShowLocationPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [loadingReviews, setLoadingReviews] = useState(false);

    // Map states for location picker modal
    const pickerMapRef = useRef<any>(null);
    const pickerMarkerRef = useRef<any>(null);
    const pickerMapContainerRef = useRef<HTMLDivElement>(null);
    const [isPickerLocating, setIsPickerLocating] = useState(false);

    // Load reviews for this toilet
    useEffect(() => {
        setFormData({ ...toilet });
        const loadReviews = async () => {
            setLoadingReviews(true);
            const toiletReviews = await db.getReviews(toilet.id);
            setReviews(toiletReviews);
            setLoadingReviews(false);
        };
        loadReviews();
    }, [toilet.id]);

    // Initialize location picker map when modal opens
    useEffect(() => {
        if (!showLocationPicker || !pickerMapContainerRef.current || !window.google) return;

        // Initialize map
        const map = new window.google.maps.Map(pickerMapContainerRef.current, {
            center: { lat: formData.lat, lng: formData.lng },
            zoom: 17,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
        });
        pickerMapRef.current = map;

        // Add center marker (fixed in center)
        const marker = new window.google.maps.Marker({
            position: map.getCenter(),
            map: map,
            icon: {
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeColor: 'white',
                strokeWeight: 2,
            },
        });
        pickerMarkerRef.current = marker;

        // Update marker position when map moves
        map.addListener('center_changed', () => {
            if (pickerMarkerRef.current) {
                pickerMarkerRef.current.setPosition(map.getCenter());
            }
        });

        return () => {
            if (pickerMarkerRef.current) pickerMarkerRef.current.setMap(null);
        };
    }, [showLocationPicker]);

    const handlePickerCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setIsPickerLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
                if (pickerMapRef.current) {
                    pickerMapRef.current.panTo(pos);
                    pickerMapRef.current.setZoom(17);
                }
                setIsPickerLocating(false);
            },
            () => { setIsPickerLocating(false); alert("위치 정보를 가져올 수 없습니다."); },
            { enableHighAccuracy: true }
        );
    };

    const handleSetLocation = () => {
        if (!window.google?.maps || !pickerMapRef.current) {
            setShowLocationPicker(false);
            return;
        }
        const center = pickerMapRef.current.getCenter();
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
            setShowLocationPicker(false);
        });
    };

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            await onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteReview = async (reviewId: string) => {
        if (confirm('이 리뷰를 삭제하시겠습니까?')) {
            await db.deleteReview(reviewId);
            setReviews(prev => prev.filter(r => r.id !== reviewId));
            alert('리뷰가 삭제되었습니다.');
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete(formData.id);
            setShowDeleteModal(false);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-20 max-w-2xl mx-auto shadow-xl bg-white min-h-full">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowRight className="w-6 h-6 rotate-180 text-gray-600" />
                    </button>
                    <h3 className="font-bold text-lg text-gray-900">관리자용 화장실 상세</h3>
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Location & Basic Info */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">등록자 (ID)</label>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm border border-gray-200 text-gray-700 font-mono">
                            {(formData.createdBy === 'admin' || !formData.createdBy) ? (
                                <span className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                                    관리자
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                                    {formData.creatorEmail || '이메일 정보 없음'} <span className="text-xs text-gray-400">({formData.createdBy})</span>
                                </span>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">주소</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={formData.address}
                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                className="flex-1 p-3 bg-gray-50 rounded-lg outline-none text-sm border border-gray-200 focus:border-blue-500 transition-colors"
                            />
                            <button
                                onClick={() => setShowLocationPicker(true)}
                                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-bold shrink-0"
                            >
                                <MapPin className="w-4 h-4" />
                                위치 선택
                            </button>
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                            좌표: {formData.lat.toFixed(6)}, {formData.lng.toFixed(6)}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">이름</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            placeholder="화장실 이름"
                            className="w-full p-3 bg-gray-50 rounded-lg outline-none text-sm border border-gray-200 focus:border-blue-500 transition-colors"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">층수</label>
                            <input
                                type="number"
                                value={formData.floor || ''}
                                onChange={e => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                                placeholder="1"
                                className="w-full p-3 bg-gray-50 rounded-lg outline-none text-sm border border-gray-200 focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">비밀번호</label>
                            <input
                                type="text"
                                value={formData.password || ''}
                                onChange={e => setFormData({ ...formData, password: e.target.value, hasPassword: !!e.target.value })}
                                placeholder="입력시 폐쇄형으로 전환"
                                className="w-full p-3 bg-gray-50 rounded-lg outline-none text-sm border border-gray-200 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Stall Count */}
                    <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <label className="text-xs font-bold text-gray-500">변기 개수</label>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, stallCount: Math.max(0, (prev.stallCount || 0) - 1) }))}
                                className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-bold text-lg w-6 text-center">{formData.stallCount || 0}</span>
                            <button
                                onClick={() => setFormData(prev => ({ ...prev, stallCount: (prev.stallCount || 0) + 1 }))}
                                className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Facilities Toggles */}
                    <div className="flex gap-3">
                        <button
                            onClick={() => setFormData({ ...formData, hasPaper: !formData.hasPaper })}
                            className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${formData.hasPaper ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <ScrollText className="w-6 h-6" />
                            <span className="text-sm font-bold">휴지 {formData.hasPaper ? '있음' : '없음'}</span>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, hasBidet: !formData.hasBidet })}
                            className={`flex-1 py-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${formData.hasBidet ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Waves className="w-6 h-6" />
                            <span className="text-sm font-bold">비데 {formData.hasBidet ? '있음' : '없음'}</span>
                        </button>
                    </div>

                    {/* Gender Toggles */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFormData({ ...formData, genderType: Gender.MALE })}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${formData.genderType === Gender.MALE ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            남성용
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, genderType: Gender.FEMALE })}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${formData.genderType === Gender.FEMALE ? 'bg-red-500 text-white border-red-500' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            여성용
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, genderType: Gender.UNISEX })}
                            className={`flex-1 py-3 rounded-lg text-sm font-bold border transition-all ${formData.genderType === Gender.UNISEX ? 'bg-purple-600 text-white border-purple-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            공용
                        </button>
                    </div>

                    {/* Note */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">참고사항</label>
                        <textarea
                            value={formData.note || ''}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                            placeholder="예: 휴지가 자주 없음, 도어락 뻑뻑함 등"
                            className="w-full p-3 bg-gray-50 rounded-lg outline-none min-h-[80px] text-sm resize-none border border-gray-200 focus:border-blue-500 transition-colors"
                        />
                    </div>

                    {/* Admin Specific: Private Toggle */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <label className="text-sm font-bold text-gray-700">비공개 설정 (나만 보기)</label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isPrivate ? 'bg-blue-600' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isPrivate ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                            리뷰 목록
                        </h4>
                        <span className="text-xs text-gray-500">{reviews.length}개</span>
                    </div>

                    {loadingReviews ? (
                        <div className="text-center py-8 text-gray-400 text-sm">리뷰를 불러오는 중...</div>
                    ) : reviews.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {reviews.map((review) => (
                                <div key={review.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-bold text-gray-800">{review.userName}</span>
                                            <div className="flex items-center gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3 h-3 ${i < review.rating ? 'text-amber-500 fill-amber-500' : 'text-gray-300'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{review.content}</p>
                                        <span className="text-xs text-gray-400 mt-1 block">
                                            {new Date(review.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteReview(review.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                        title="리뷰 삭제"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400 text-sm">
                            아직 리뷰가 없습니다.
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex justify-center items-center gap-2 text-base disabled:opacity-70"
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                        {isSaving ? '저장 중...' : '수정하기'}
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        disabled={isSaving || isDeleting}
                        className="flex-1 py-4 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex justify-center items-center gap-2 text-base"
                    >
                        <Trash2 className="w-5 h-5" />
                        삭제하기
                    </button>
                </div>
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="font-bold text-lg">위치 선택</h3>
                            <button onClick={() => setShowLocationPicker(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="relative">
                            <div
                                ref={pickerMapContainerRef}
                                className="w-full h-96"
                                style={{ minHeight: '400px' }}
                            />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none">
                                <MapPin className="w-10 h-10 text-blue-600 drop-shadow-lg" />
                            </div>
                            <button
                                onClick={handlePickerCurrentLocation}
                                disabled={isPickerLocating}
                                className="absolute bottom-4 right-4 p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                                {isPickerLocating ? (
                                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                                ) : (
                                    <Crosshair className="w-6 h-6 text-blue-600" />
                                )}
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <p className="text-sm text-gray-600">
                                지도를 움직여서 원하는 위치에 핀을 맞춰주세요.
                            </p>
                            <button
                                onClick={handleSetLocation}
                                className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                이 위치로 설정
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border-t-4 border-red-500">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-3">정말 삭제하시겠습니까?</h3>
                        <p className="text-gray-500 text-sm text-center mb-6">
                            삭제된 화장실은 복구할 수 없습니다.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
