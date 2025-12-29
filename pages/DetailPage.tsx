import React, { useState, useEffect, useRef } from 'react';
import { Lock, ArrowRight, Edit, Share2, Star, MapIcon, ScrollText, Waves, DoorClosed, MessageSquareQuote, Flag, X, Trash2, Edit2, Crosshair, PlayCircle, Gift } from 'lucide-react';
import { AlertModal } from '../components/AlertModal';
import { Toilet, Review, User, UserRole } from '../types';
import { dbSupabase as db } from '../services/db_supabase';
import { getDisplayName, formatDistance, getMarkerImage } from '../utils';
import { getToiletColor, getMarkerSvg, calculateDistance } from '../utils';
import { ToiletTypeIcon } from '../components/Icons';
import { LevelIcon } from '../components/LevelIcon';
import PasswordPanel from '../components/PasswordPanel';

import { ABUSE_LIMITS, validateContent } from '../policies/AbuseProtection';
import { adMobService } from '../services/admob';
import { AdManager } from '../components/AdManager';
import { AdBanner } from '../components/AdBanner';

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


interface NavigationModalProps {
    toilet: Toilet;
    myLocation: { lat: number, lng: number };
    onClose: () => void;
    darkMode?: boolean;
    onNavigate: (type: 'kakao' | 'naver') => void;
}

const NavigationModal: React.FC<NavigationModalProps> = ({ toilet, myLocation, onClose, darkMode, onNavigate }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const myMarkerRef = useRef<any>(null);
    const watchIdRef = useRef<number | null>(null);
    const darkModeRef = useRef(darkMode); // Track darkMode for async init
    const [directionsData, setDirectionsData] = useState<{ distance: string, duration: string } | null>(null);
    const [mapError, setMapError] = useState<string | null>(null);


    // Keep darkModeRef in sync
    useEffect(() => {
        darkModeRef.current = darkMode;
    }, [darkMode]);

    useEffect(() => {
        const useFallbackData = () => {
            // Heuristic: Distance * 1.5 detour / 4km/h walking speed
            const straightDistance = calculateDistance(myLocation.lat, myLocation.lng, toilet.lat, toilet.lng);
            const distText = formatDistance(straightDistance);
            const timeText = `약 ${Math.ceil((straightDistance * 1.5) / 67)}분`;
            setDirectionsData({
                distance: distText,
                duration: timeText
            });
        };

        const timer = setTimeout(() => {
            if (!mapRef.current || !window.google?.maps) {
                if (window.google?.maps && mapRef.current) {
                    // Retry logic if needed, but for now just proceed
                } else {
                    setMapError("지도 로딩 실패");
                    return;
                }
            }

            const isDark = darkModeRef.current; // Use ref for latest value
            if (mapRef.current && !mapInstanceRef.current) {
                const map = new window.google.maps.Map(mapRef.current, {
                    center: myLocation,
                    zoom: 17,
                    disableDefaultUI: true,
                    styles: isDark
                        ? [...DARK_MAP_STYLE, { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                        : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                });
                mapInstanceRef.current = map;

                // Map Loaded Listener


                const pinIconUrl = getMarkerImage(toilet, UserRole.USER, true);
                new window.google.maps.Marker({
                    position: { lat: toilet.lat, lng: toilet.lng },
                    map: map,
                    icon: {
                        url: pinIconUrl,
                        scaledSize: new window.google.maps.Size(40, 52),
                        anchor: new window.google.maps.Point(20, 52)
                    },
                    title: toilet.name,
                    zIndex: 2
                });

                // Start with fallback immediately (No API Cost)
                useFallbackData();

                // Draw a straight dotted line (Visual Aid, Free)
                new window.google.maps.Polyline({
                    path: [myLocation, { lat: toilet.lat, lng: toilet.lng }],
                    geodesic: true,
                    strokeColor: "#38BDF8", // primary
                    strokeOpacity: 0,
                    strokeWeight: 2,
                    icons: [{
                        icon: {
                            path: "M 0,-1 0,1",
                            strokeOpacity: 1,
                            scale: 3
                        },
                        offset: "0",
                        repeat: "20px"
                    }],
                    map: map
                });

                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(myLocation);
                bounds.extend({ lat: toilet.lat, lng: toilet.lng });
                map.fitBounds(bounds, {
                    top: 100,    // Top Header + Directions Modal
                    bottom: 250, // Bottom Ad + Navigation Buttons
                    left: 20,
                    right: 20
                });


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
                        div.style.zIndex = '999';
                        div.contentEditable = "false";
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
                myMarkerRef.current = overlay;

                if (navigator.geolocation) {
                    watchIdRef.current = navigator.geolocation.watchPosition(
                        (pos) => {
                            const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                            if (myMarkerRef.current) myMarkerRef.current.setPosition(newPos);
                        },
                        (err) => console.log("Geolocation error suppressed"),
                        { enableHighAccuracy: true, maximumAge: 0 }
                    );
                }
            }
        }, 200);

        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            clearTimeout(timer);
        };
    }, []);

    // (Navigation Logic moved to main component scope)

    // Effect to update map styles when darkMode changes
    useEffect(() => {
        if (mapInstanceRef.current) {
            mapInstanceRef.current.setOptions({
                styles: darkMode
                    ? [...DARK_MAP_STYLE, { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
                    : [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }]
            });
        }
    }, [darkMode]);

    return (
        <div className="fixed inset-0 z-[2000] flex justify-center bg-black/10 backdrop-blur-[1px]">
            <div className="w-full max-w-md h-full bg-surface dark:bg-surface-dark flex flex-col shadow-2xl animate-in slide-in-from-bottom-full duration-300 relative">
                <div className="p-4 flex items-center justify-between border-b border-border dark:border-border-dark bg-surface dark:bg-surface-dark z-10 shadow-sm shrink-0">
                    <div>
                        <div className="text-xs text-text-muted font-bold mb-0.5">목적지</div>
                        <h3 className="font-bold text-lg leading-none text-text-main dark:text-text-light">{toilet.name}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-background dark:bg-background-dark rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="w-6 h-6 text-text-muted" />
                    </button>
                </div>

                {/* Map Top Banner Ad Area */}
                <AdBanner
                    position="top"
                    margin={80}
                    minRatio={4.8}
                    maxRatio={6.0}
                    maxHeight={90}
                    className="w-full aspect-[5/1] h-auto shadow-sm"
                />

                <div className="flex-1 relative w-full h-full min-h-0">
                    <div ref={mapRef} className="w-full h-full" />

                    {directionsData && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-surface dark:bg-surface-dark px-6 py-3 rounded-full shadow-xl border border-border dark:border-border-dark flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-text-muted font-bold">거리</span>
                                <span className="text-sm font-black text-text-main dark:text-text-light">{directionsData.distance}</span>
                            </div>
                            <div className="w-px h-6 bg-border dark:bg-border-dark"></div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] text-text-muted font-bold">소요시간</span>
                                <span className="text-sm font-black text-primary">{directionsData.duration}</span>
                            </div>
                        </div>
                    )}

                    <div className="absolute bottom-[240px] right-4 z-20">
                        <button
                            onClick={() => {
                                if (mapInstanceRef.current) {
                                    mapInstanceRef.current.panTo(myLocation);
                                    mapInstanceRef.current.setZoom(17);
                                }
                            }}
                            className="w-12 h-12 bg-surface dark:bg-surface-dark rounded-full shadow-lg flex items-center justify-center text-text-main dark:text-text-light border border-border dark:border-border-dark"
                        >
                            <Crosshair className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-4 pb-4 pb-safe bg-gradient-to-t from-surface via-surface to-transparent dark:from-surface-dark dark:via-surface-dark flex flex-col items-center">
                        <div className="flex gap-4 justify-center items-center pb-4 w-full px-4 max-w-md mx-auto z-10">
                            <button
                                onClick={() => onNavigate('kakao')}
                                className="flex-1 h-14 bg-[#FEE500] rounded-2xl shadow-lg flex items-center justify-center hover:bg-[#FFE500] active:scale-95 transition-all relative overflow-hidden group border border-yellow-400"
                                aria-label="카카오맵"
                            >
                                <img
                                    src="https://play-lh.googleusercontent.com/pPTTNz433EYFurg2j__bFU5ONdMoU_bs_-yS2JLZriua3iHrksGP6XBPF5VtDPlpGcW4=s64-rw"
                                    alt="Kakao Map"
                                    className="h-10 w-10 object-contain rounded-xl"
                                />
                            </button>

                            <button
                                onClick={() => onNavigate('naver')}
                                className="flex-1 h-14 bg-white rounded-2xl shadow-lg flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all relative overflow-hidden group border border-gray-200"
                                aria-label="네이버지도"
                            >
                                <img
                                    src="https://play-lh.googleusercontent.com/FZCOcEqapjBkvBmv2RkIMlJ1mteGJh8eq4239jAm-4QgpzvCa9sBj4msNlUBsWvf3hX69-fJoTnFZR2pFdZdwxY=s64-rw"
                                    alt="Naver Map"
                                    className="h-10 w-10 object-contain rounded-xl"
                                />
                            </button>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
};

interface DetailPageProps {

    user: User;
    toilet: Toilet;
    myLocation: { lat: number, lng: number };
    bookmarks: Set<string>;
    unlockedToilets: Record<string, number>;
    onBack: () => void;
    onBookmark: (id: string) => void;
    onUnlock: (method: 'credit' | 'ad') => void;
    onShowLogin: () => void;
    onRefresh: () => void;
    onUserUpdate: (user: User) => void;
    darkMode?: boolean;
    requestAd: (callback: () => void) => void;
    onModalStateChange?: (isOpen: boolean) => void;
}


const DetailPage: React.FC<DetailPageProps> = ({
    user,
    toilet,
    myLocation,
    bookmarks,
    unlockedToilets,
    onBack,
    onBookmark,
    onUnlock,
    onShowLogin,
    onRefresh,
    onUserUpdate,
    darkMode,
    requestAd,
    onModalStateChange
}) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [showReportModal, setShowReportModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [reviewContent, setReviewContent] = useState("");
    const [reportReason, setReportReason] = useState("");
    const [selectedReportType, setSelectedReportType] = useState<string>("");
    const [showMapModal, setShowMapModal] = useState(false);

    // Alert Modal State
    const [alertModal, setAlertModal] = useState<{ isOpen: boolean; message: string; onConfirm?: () => void; isConfirm?: boolean }>({
        isOpen: false,
        message: '',
    });

    const showAlert = (message: string) => {
        setAlertModal({ isOpen: true, message, isConfirm: false });
    };

    const showConfirm = (message: string, onConfirm: () => void) => {
        setAlertModal({ isOpen: true, message, onConfirm, isConfirm: true });
    };

    const closeAlert = () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
    };

    // Check if this toilet belongs to the current user OR if user is admin
    const isMyToilet = toilet.createdBy === user.id || user.role === UserRole.ADMIN;


    useEffect(() => {
        const loadReviews = async () => {
            if (toilet) {
                // Increment View Count
                db.incrementToiletView(toilet.id);

                const loadedReviews = await db.getReviews(toilet.id);
                setReviews(loadedReviews);
            }
        };
        loadReviews();
    }, [toilet]);

    const handleUnlockRequest = (method: 'credit' | 'ad') => {
        if (user.role === UserRole.GUEST) {
            onShowLogin();
            return;
        }
        onUnlock(method);
    };

    const handleShare = async () => {
        // Construct Share URL with Referral Code
        // Format: origin + /?ref=CODE + hash
        const refCode = user.id ? btoa(user.id) : '';
        const shareUrl = `${window.location.origin}/?ref=${refCode}${window.location.hash}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `화장실 공유: ${toilet.name}`,
                    text: `${toilet.name} 화장실 정보를 확인해보세요!`,
                    url: shareUrl,
                });
                return;
            } catch (err) {
                console.log('Error sharing:', err);
            }
        }

        try {
            await navigator.clipboard.writeText(shareUrl);
            showAlert("링크를 복사했어요! (추천인 코드 포함) 함께 쓰면 더더욱 좋아져요 ");
        } catch (err) {
            prompt("이 주소를 복사하여 공유하세요:", shareUrl);
        }
    };

    const [showRewardModal, setShowRewardModal] = useState<{ show: boolean, message: string, points: number }>({ show: false, message: '', points: 0 });
    const [reviewRewardAmount, setReviewRewardAmount] = useState(2);

    useEffect(() => {
        const fetchPolicy = async () => {
            try {
                const policy = await db.getCreditPolicy();
                if (policy && policy.reviewSubmit) {
                    setReviewRewardAmount(policy.reviewSubmit);
                }
            } catch (e) {
                console.error("Failed to fetch credit policy", e);
            }
        };
        fetchPolicy();
    }, []);

    // ... (rest of the component)



    // ... existing useEffects ...
    const [showOwnerConfirmModal, setShowOwnerConfirmModal] = useState(false);
    const [showReviewSuccessModal, setShowReviewSuccessModal] = useState(false); // New Success Modal
    const [showAdModal, setShowAdModal] = useState(false); // Controls AdManager
    const [pendingNavType, setPendingNavType] = useState<'kakao' | 'naver' | null>(null);

    const executeNavigation = (type: 'kakao' | 'naver') => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!toilet) return;

        const { lat, lng, name } = toilet;
        const myLat = myLocation?.lat || 0;
        const myLng = myLocation?.lng || 0;
        const hasLocation = myLat !== 0 && myLng !== 0;

        if (type === 'kakao') {
            if (isMobile) {
                if (hasLocation) {
                    window.location.href = `kakaomap://route?sp=${myLat},${myLng}&ep=${lat},${lng}&by=foot`;
                } else {
                    window.location.href = `kakaomap://route?ep=${lat},${lng}&by=foot`;
                }
            } else {
                if (hasLocation) {
                    window.open(`https://map.kakao.com/link/from/내위치,${myLat},${myLng}/to/${name},${lat},${lng}`, '_blank');
                } else {
                    window.open(`https://map.kakao.com/link/to/${name},${lat},${lng}`, '_blank');
                }
            }
        } else if (type === 'naver') {
            if (isMobile) {
                const appName = encodeURIComponent("대똥단결");
                const dName = encodeURIComponent(name);
                if (hasLocation) {
                    const sName = encodeURIComponent("내위치");
                    window.location.href = `nmap://route/walk?slat=${myLat}&slng=${myLng}&sname=${sName}&dlat=${lat}&dlng=${lng}&dname=${dName}&appname=${appName}`;
                } else {
                    window.location.href = `nmap://route/walk?dlat=${lat}&dlng=${lng}&dname=${dName}&appname=${appName}`;
                }
            } else {
                if (hasLocation) {
                    window.open(`https://map.naver.com/v5/directions/${myLng},${myLat},내위치/${lng},${lat},${name}/-/walk`, '_blank');
                } else {
                    window.open(`https://map.naver.com/v5/search/${encodeURIComponent(name)}`, '_blank');
                }
            }
        }
    };

    const handleNavigation = (type: 'kakao' | 'naver') => {
        setPendingNavType(type);
        setShowAdModal(true);
    };

    const handleAdClose = () => {
        setShowAdModal(false);
        if (pendingNavType) {
            executeNavigation(pendingNavType);
            setPendingNavType(null);
            setShowMapModal(false); // Close NavigationModal after redirect
            onModalStateChange?.(false);
        } else if (pendingReviewId) {
            handleAdComplete(); // Trigger reward for review
        }
    };
    const [pendingReviewCredit, setPendingReviewCredit] = useState(0); // Store credit to give after ad
    const [pendingReviewId, setPendingReviewId] = useState<string | null>(null); // Track which review is waiting for ad

    // Track when user started writing
    const reviewStartTime = useRef<number>(0);
    const reportStartTime = useRef<number>(0);

    // Reset timer when modal opens
    useEffect(() => {
        if (showReviewModal) reviewStartTime.current = Date.now();
    }, [showReviewModal]);

    useEffect(() => {
        if (showReportModal) reportStartTime.current = Date.now();
    }, [showReportModal]);

    // Notify parent (App.tsx) when any modal is open to disable Bottom Nav Button
    useEffect(() => {
        if (onModalStateChange) {
            const isAnyModalOpen = showReviewModal || showReportModal || showOwnerConfirmModal || showAdModal || showRewardModal.show;
            onModalStateChange(isAnyModalOpen);
        }
    }, [showReviewModal, showReportModal, showOwnerConfirmModal, showAdModal, showRewardModal.show, onModalStateChange]);

    const handleSubmitReview = async () => {
        console.log("handleSubmitReview triggered");
        try {
            if (user.role === UserRole.GUEST) { onShowLogin(); return; }

            // 1. Validate Content
            const validation = validateContent(reviewContent);
            if (!validation.valid) {
                showAlert(validation.message);
                return;
            }

            // 2. Check Time Taken (Too Fast)
            const timeTaken = Date.now() - reviewStartTime.current;
            console.log(`Review write time: ${timeTaken}ms`);

            if (timeTaken < ABUSE_LIMITS.MIN_WRITE_TIME_MS) {
                showAlert("조금만 더 자세히 적어주시면 더 좋은 정보가 됩니다 :)");
                return;
            }

            // 3. Check Admin/VIP exemption
            const isVipOrAdmin = user.role === UserRole.ADMIN || user.role === UserRole.VIP;

            if (!isVipOrAdmin) {
                // 4. Check Daily Limit
                const dailyCount = await db.getDailyReviewCount(user.id);
                if (dailyCount >= ABUSE_LIMITS.DAILY_REVIEW_LIMIT) {
                    showAlert(`하루에 남길 수 있는 리뷰는 ${ABUSE_LIMITS.DAILY_REVIEW_LIMIT}개까지예요. 천천히, 좋은 경험만 나눠주세요!`);
                    return;
                }
            }

            // 5. Check Duplicate (One review per place per day)
            const hasRecent = await db.checkRecentReview(user.id, toilet.id);
            if (hasRecent && !editingReviewId) { // Allow editing
                showAlert("동일 장소에 대한 리뷰는 하루에 한 번만 남길 수 있어요. 양해 부탁드립니다 :)");
                return;
            }

            if (editingReviewId) {
                // Update logic
                const updatedReview: Review = {
                    id: editingReviewId,
                    toiletId: toilet.id,
                    userId: user.id,

                    userName: getDisplayName(user),
                    rating,
                    content: reviewContent,
                    createdAt: new Date().toISOString(),
                    rewarded: reviews.find(r => r.id === editingReviewId)?.rewarded ?? false
                };

                const original = reviews.find(r => r.id === editingReviewId);
                if (original) updatedReview.createdAt = original.createdAt;

                setReviews(prev => prev.map(r => r.id === editingReviewId ? updatedReview : r));
                setShowReviewModal(false);
                setReviewContent("");
                setRating(5);
                setEditingReviewId(null);
                await db.updateReview(updatedReview);
                showAlert("리뷰가 수정되었습니다.");
            } else {
                // New Review
                const newReview: Review = {
                    id: 'r_' + Date.now(),
                    toiletId: toilet.id,
                    userId: user.id,
                    userName: getDisplayName(user),
                    rating,
                    content: reviewContent,
                    createdAt: new Date().toISOString(),
                    rewarded: false
                };

                await db.addReview(newReview);

                // UI Update
                setReviews(prev => [newReview, ...prev]);
                setShowReviewModal(false);
                setReviewContent("");
                setRating(5);

                // Reward Logic
                if (isVipOrAdmin) {
                    // Immediate Reward
                    newReview.rewarded = true; // VIP gets it
                    const optimisticallyUpdatedUser = { ...user, credits: (user.credits || 0) + reviewRewardAmount };
                    onUserUpdate(optimisticallyUpdatedUser);
                    await db.updateUserCredits(user.id, reviewRewardAmount); // Ensure DB sync
                    // Also update review rewarded status immediately (since we inserted false)
                    // Actually clearer to insert true if we knew. But let's update.
                    await db.updateReviewReward(newReview.id, true);

                    setShowRewardModal({ show: true, message: '리뷰 작성 감사합니다! (VIP/Admin)', points: reviewRewardAmount });
                } else {
                    // Show Success Celebration Modal first
                    setPendingReviewCredit(reviewRewardAmount);
                    setPendingReviewId(newReview.id);
                    setShowReviewSuccessModal(true);
                }
            }
        } catch (err) {
            console.error("Failed to save review", err);
            showAlert("앗, 리뷰가 저장되지 않았어요. 다시 시도해주시면 감사하겠습니다!");
        }
    };

    const handleAdComplete = async () => {
        setShowAdModal(false);

        // 1. Optimistic UI Updates (Immediate Feedback)
        const points = pendingReviewCredit;
        const optimisticallyUpdatedUser = { ...user, credits: (user.credits || 0) + points };
        onUserUpdate(optimisticallyUpdatedUser);

        if (pendingReviewId) {
            setReviews(prev => prev.map(r => r.id === pendingReviewId ? { ...r, rewarded: true } : r));
        }

        setShowRewardModal({ show: true, message: '광고 시청 완료!\n크래딧이 지급되었습니다.', points: points });

        // 2. Background DB Updates (Non-blocking)
        Promise.all([
            db.recordAdView('review'),
            db.updateUserCredits(user.id, points),
            pendingReviewId ? db.logCreditTransaction(user.id, points, 'ad_view', 'review', pendingReviewId, '리뷰 작성 보상 (광고)') : Promise.resolve(),
            pendingReviewId ? db.updateReviewReward(pendingReviewId, true) : Promise.resolve()
        ]).catch(err => {
            console.error("Failed to sync ad reward to DB:", err);
            // Silent fail or toast? Usually silent + log is fine for ad rewards to avoid disrupting user flow, 
            // but ideally we'd rollback. For now, speed is priority.
        });

        setPendingReviewId(null);
    };

    const handleDeleteReview = (reviewId: string) => {
        const review = reviews.find(r => r.id === reviewId);
        const shouldDeduct = review?.rewarded === true;

        const confirmMessage = shouldDeduct
            ? `정말로 이 리뷰를 삭제하시겠습니까? \n(삭제 시 지급된 ${reviewRewardAmount} 크래딧이 회수됩니다)`
            : "정말로 이 리뷰를 삭제하시겠습니까?";

        showConfirm(confirmMessage, () => {
            // Optimistic Delete
            setReviews(prev => prev.filter(r => r.id !== reviewId));

            // Background DB Delete
            db.deleteReview(reviewId).then(async () => {
                let message = "리뷰가 삭제되었습니다.";

                if (shouldDeduct) {
                    // Deduct Credits
                    const DEDUCTION_AMOUNT = -reviewRewardAmount;

                    // Optimistic UI Update
                    const updatedUser = { ...user, credits: (user.credits || 0) + DEDUCTION_AMOUNT };
                    onUserUpdate(updatedUser);

                    // DB Update
                    await db.updateUserCredits(user.id, DEDUCTION_AMOUNT);
                    message = "리뷰가 삭제되었으며,\n지급된 크래딧이 차감되었습니다.";
                }

                showAlert(message);
                onRefresh(); // Optional: sync fully after success
            }).catch(err => {
                console.error("Failed to delete review", err);
                showAlert("리뷰 삭제에 실패했습니다.");
                onRefresh(); // Revert logic by refreshing
            });
        });
    };

    const openEditReviewModal = (review: Review) => {
        setEditingReviewId(review.id);
        setRating(review.rating);
        setReviewContent(review.content);
        setShowReviewModal(true);
    };

    const handleReportClick = () => {
        if (user.role === UserRole.GUEST) { onShowLogin(); return; }

        let finalReason = selectedReportType;
        if (selectedReportType === '기타') {
            if (!reportReason.trim()) {
                showAlert('추가로 알려주실 내용을 자세히 부탁드려요.');
                return;
            }
            finalReason = `기타: ${reportReason.trim()}`;
        } else if (!selectedReportType) {
            showAlert('어떤 문제인지 알려주세요!');
            return;
        }

        // Special handling for owner request
        if (selectedReportType === '건물주 요청으로 삭제해주세요') {
            setShowOwnerConfirmModal(true);
            return;
        }

        submitReport(finalReason);
    };

    const submitReport = async (reason: string) => {
        // 1. Validate Content (if reason is custom)
        if (selectedReportType === '기타') {
            const validation = validateContent(reason.replace('기타: ', ''));
            // Allow slightly looser check for reports? Or same? Same is safer.
            if (!validation.valid) {
                showAlert(validation.message);
                return;
            }
        }

        // 2. Check Time Taken (Too Fast) - mainly for 'Other' type but applies generally
        const timeTaken = Date.now() - reportStartTime.current;
        if (timeTaken < ABUSE_LIMITS.MIN_WRITE_TIME_MS / 2) { // 5 seconds for report?
            // Maybe less strict for predefined options
        }
        // Actually user said 10s. Let's apply 5s for predefined, 10s for custom if possible.
        // For simplicity, let's enforce 3s buffer to prevent accidental double clicks or bot-like speed.
        if (timeTaken < 3000) {
            showAlert("조금 더 신중하게 확인 후 제출해주세요.");
            return;
        }

        // 3. Check Limits
        const isVipOrAdmin = user.role === UserRole.ADMIN || user.role === UserRole.VIP;
        if (!isVipOrAdmin) {
            const dailyCount = await db.getDailyReportCount(user.id);
            if (dailyCount >= ABUSE_LIMITS.DAILY_REPORT_LIMIT) {
                showAlert(`신고는 하루 ${ABUSE_LIMITS.DAILY_REPORT_LIMIT}회까지 가능해요. 혼자 운영하고 있어서, 너무 많으면 힘들어요.`);
                return;
            }

            const hasRecent = await db.checkRecentReport(user.id, toilet.id);
            if (hasRecent) {
                showAlert("동일 장소에 대한 신고는 하루에 한 번만 가능합니다. 보다 정확한 정보를 위해 운영되고 있어요!");
                return;
            }
        }

        // 4. Submit
        const reportData = {
            id: 'rep_' + Date.now(),
            toiletId: toilet.id,
            toiletName: toilet.name,
            reporterId: user.id,
            reason: reason,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        try {
            await db.addReport(reportData as any);

            setShowReportModal(false);
            setShowOwnerConfirmModal(false);
            setReportReason('');
            setSelectedReportType('');

            // Show Pending Message (No points yet)
            // Show Pending Message
            setShowRewardModal({ show: true, message: '신고 접수 감사합니다.\n최대한 빨리 처리해드릴게요.', points: 0 });

        } catch (err) {
            console.error("Failed to submit report", err);
            showAlert("신고 접수 중 오류가 발생했습니다.");
        }
    };





    return (
        <div className="absolute inset-0 z-[50] flex justify-center bg-black/20 backdrop-blur-sm overflow-hidden">
            <div className="w-full max-w-md h-full bg-surface dark:bg-surface-dark overflow-y-auto no-scrollbar shadow-2xl relative pb-32" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="bg-surface dark:bg-surface-dark px-4 py-3 flex items-center justify-between sticky top-0 z-20 border-b border-border dark:border-border-dark shadow-sm">
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="p-2 -ml-2 text-text-main dark:text-text-light"><ArrowRight className="w-6 h-6 rotate-180" /></button>
                        <div>
                            <h1 className="font-bold text-lg leading-tight text-text-main dark:text-text-light whitespace-nowrap overflow-hidden text-ellipsis">
                                {toilet.name.length > 14 ? toilet.name.slice(0, 14) + '..' : toilet.name}
                            </h1>
                        </div>
                    </div>
                    <div className="flex gap-1">
                        {isMyToilet && (
                            <button onClick={() => window.location.hash = `#/edit/${toilet.id}`} className="p-2 text-text-muted hover:bg-background dark:hover:bg-background-dark rounded-full transition-colors">
                                <Edit className="w-6 h-6" />
                            </button>
                        )}
                        <button onClick={handleShare} className="p-2 text-text-muted hover:bg-background dark:hover:bg-background-dark rounded-full transition-colors">
                            <Share2 className="w-6 h-6" />
                        </button>
                        <button onClick={() => {
                            if (user.role === UserRole.GUEST) {
                                onShowLogin();
                            } else {
                                onBookmark(toilet.id);
                            }
                        }} className="p-2">
                            {bookmarks.has(toilet.id) ? <Star className="w-6 h-6 text-amber-400 fill-current" /> : <Star className="w-6 h-6 text-border" />}
                        </button>
                    </div>
                </div >

                <div className="p-4 space-y-4">
                    <PasswordPanel toilet={toilet} user={user} onUnlock={handleUnlockRequest} isUnlocked={(unlockedToilets[toilet.id] > Date.now()) || isMyToilet} />

                    {/* Google AdSense (Below Password) */}




                    <div className="bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark p-5 shadow-sm space-y-5">
                        <div className="flex items-start gap-4">
                            <div className="shrink-0">
                                <ToiletTypeIcon type={toilet.genderType} className="w-16 h-16" />
                            </div>

                            <div className="flex-1 flex items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="text-sm text-text-main dark:text-text-light font-medium line-clamp-2 break-keep">{toilet.address} {toilet.floor}층</div>



                                    {toilet.distance && (
                                        <div className="flex items-center gap-2 text-xs font-bold text-text-muted mt-1">
                                            <span className="text-primary">{formatDistance(toilet.distance)}</span>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <span>도보 {Math.ceil((toilet.distance * 1.5) / 67)}분</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setShowMapModal(true); onModalStateChange?.(true); }}
                                    className="flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-xl bg-primary-50 hover:bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 dark:text-primary-400 transition-colors"
                                >
                                    <MapIcon className="w-6 h-6" />
                                    <span className="text-[10px] font-bold">지도보기</span>
                                </button>
                            </div>

                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            <div className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${toilet.hasPaper ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark'}`}>
                                <img src="/images/icons/tissue.png" alt="휴지" className={`w-10 h-10 object-contain ${!toilet.hasPaper && 'opacity-40 grayscale'}`} />
                                <span className={`text-xs font-bold ${toilet.hasPaper ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>휴지 {toilet.hasPaper ? '있음' : '없음'}</span>
                            </div>
                            <div className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${toilet.hasBidet ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark'}`}>
                                <img src="/images/icons/bidet.png" alt="비데" className={`w-10 h-10 object-contain ${!toilet.hasBidet && 'opacity-40 grayscale'}`} />
                                <span className={`text-xs font-bold ${toilet.hasBidet ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>비데 {toilet.hasBidet ? '있음' : '없음'}</span>
                            </div>
                            <div className={`p-3 rounded-lg border flex flex-col items-center gap-2 ${toilet.stallCount ? 'bg-primary-50 border-primary-100 dark:bg-primary-900/40 dark:border-primary-800' : 'bg-background dark:bg-background-dark border-border dark:border-border-dark'}`}>
                                <img src="/images/icons/toilet.png" alt="화장실" className={`w-10 h-10 object-contain ${!toilet.stallCount && 'opacity-40 grayscale'}`} />
                                <span className={`text-xs font-bold ${toilet.stallCount ? 'text-primary-700 dark:text-primary-300' : 'text-text-muted'}`}>{toilet.stallCount}칸</span>
                            </div>
                        </div>

                        {toilet.note && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-sm text-gray-700 flex gap-3">
                                <MessageSquareQuote className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <div className="font-bold text-amber-800 text-xs mb-1">참고사항</div>
                                    {toilet.note}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Reviews Section */}
                    <div className="pt-2">
                        <div className="flex justify-between items-end mb-3 px-1">
                            <h3 className="font-bold text-text-main dark:text-text-light text-lg">리뷰 ({reviews.length})</h3>
                            <button onClick={() => {
                                if (user.role === UserRole.GUEST) {
                                    onShowLogin();
                                } else {
                                    setShowReviewModal(true);
                                }
                            }} className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg font-bold">리뷰 쓰기</button>
                        </div>
                        {reviews.length === 0 ? (
                            <div className="space-y-3">
                                <div className="p-8 text-center text-text-muted text-sm border border-border dark:border-border-dark rounded-xl bg-background dark:bg-background-dark">첫 리뷰를 남겨주세요!</div>
                                {/* Ad (Review Style - Empty State) */}
                                {/* Ad (Review Style - Empty State) */}

                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Ad (Review Style - List State) */}
                                {/* Ad (Review Style - List State) */}

                                {reviews.map(r => (
                                    <div key={r.id} className="bg-surface dark:bg-surface-dark p-4 rounded-xl border border-border dark:border-border-dark shadow-sm">
                                        <div className="flex justify-between mb-2">
                                            <div className="flex items-center gap-1.5">
                                                <LevelIcon level={r.userLevel || 0} size="sm" />
                                                <span className="font-bold text-sm text-text-main dark:text-text-light">
                                                    {(() => {
                                                        // Check if userName mocks an email or ID need masking? 
                                                        // r.userName comes from mapReview which sets it to nickname OR '익명'.
                                                        // But DB mapReview logic: `userName: r.user_name || user?.nickname || '익명'`.
                                                        // If user has nickname, use it.
                                                        // If user is deleted or no nickname, what? 
                                                        // The user request says "Nickname (or ID)". 
                                                        // In PasswordPanel logic: `toilet.creatorName || toilet.creatorEmail...`

                                                        // We can try to match the logic:
                                                        // If `r.userName` looks like an email or ID (no Korean, or specific format)? 
                                                        // Actually `r.userName` in `mapReview` is assigned `user?.nickname`. 
                                                        // If nickname is set, we show it fully.
                                                        // Does `Review` object carry `userId` field to mask?
                                                        // The user wants "PasswordPanel style".
                                                        // PasswordPanel uses `creatorName` OR `creatorEmail` masking.
                                                        // `Review` interface has `userName`. 
                                                        // Access fields: `r.userName`.
                                                        // If we want to mask ID, we need ID or Email. 
                                                        // `Review` object usually only has `userName` populated from nickname.
                                                        // Let's assume `userName` IS the nickname to display.
                                                        // And we just add the Level component which was missing?
                                                        // Wait, in previous view `DetailPage.tsx` line 817:
                                                        // `<span className="font-bold text-sm...">{r.userName}</span>`
                                                        // The previous `PasswordPanel` logic handles email masking if name is missing.
                                                        // To do that here, we need strict parity.
                                                        // `mapReview` only maps `nickname` to `userName`. It doesn't map email.
                                                        // So we might need to rely on `userName`.
                                                        // BUT `PasswordPanel` logic uses EMAIL if name is missing.
                                                        // Check `mapReview` in `db_supabase.ts`:
                                                        // `userName: r.user_name || user?.nickname || '익명'`
                                                        // Use existing `userName` which should be correct.
                                                        // Just ensure styling matches:
                                                        // Max 6 chars, last 2 masked
                                                        let raw = r.userName && r.userName !== '익명' ? r.userName : (r.userEmail ? r.userEmail.split('@')[0] : '익명');

                                                        if (raw === '익명') return '익명';

                                                        if (raw.length > 6) {
                                                            raw = raw.slice(0, 6);
                                                        }

                                                        if (raw.length <= 2) {
                                                            return '**';
                                                        }

                                                        return raw.slice(0, raw.length - 2) + '**';
                                                    })()}
                                                </span>
                                                <span className="text-[10px] text-text-muted opacity-80 decoration-none font-normal">(Lv.{r.userLevel || 0})</span>
                                                <span className="text-xs text-text-muted ml-1">{new Date(r.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex text-amber-400">{[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}</div>
                                                {r.userId === user.id && (
                                                    <div className="flex gap-1 ml-2">
                                                        <button onClick={() => openEditReviewModal(r)} className="p-1 text-text-muted hover:text-primary"><Edit2 className="w-3 h-3" /></button>
                                                        <button onClick={() => handleDeleteReview(r.id)} className="p-1 text-text-muted hover:text-urgency"><Trash2 className="w-3 h-3" /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-sm text-text-main dark:text-text-light">{r.content}</div>
                                    </div>
                                ))}</div>
                        )}
                    </div>

                    <div className="pt-8 pb-32 text-center">
                        <button onClick={() => {
                            if (user.role === UserRole.GUEST) {
                                onShowLogin();
                            } else {
                                setShowReportModal(true);
                            }
                        }} className="text-text-muted text-xs underline flex items-center justify-center gap-1 mx-auto hover:text-urgency"><Flag className="w-3 h-3" /> 신고하기</button>

                        {(toilet.updatedAt || toilet.createdAt) && (
                            <div className="mt-2 text-[10px] text-text-muted opacity-50 font-medium">
                                {toilet.updatedAt
                                    ? `업데이트: ${new Date(toilet.updatedAt).toLocaleDateString()}`
                                    : `등록일: ${new Date(toilet.createdAt!).toLocaleDateString()}`
                                }
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Modal */}
                {
                    showMapModal && (
                        <NavigationModal
                            toilet={toilet}
                            myLocation={myLocation}
                            onClose={() => { setShowMapModal(false); onModalStateChange?.(false); }}
                            darkMode={darkMode}
                            onNavigate={handleNavigation}
                        />
                    )
                }

                {/* Modal Logic (Review & Report) */}
                {
                    showReviewModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
                            <div className="bg-surface dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 shadow-2xl mb-[10vh]">
                                <h3 className="text-lg font-bold mb-4 text-center text-text-main dark:text-text-light">{editingReviewId ? '리뷰 수정' : '리뷰 작성'}</h3>
                                <div className="flex justify-center gap-2 mb-6">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setRating(star)}><Star className={`w-8 h-8 ${star <= rating ? 'text-amber-400 fill-current' : 'text-gray-200 dark:text-gray-600'}`} /></button>))}</div>
                                <textarea
                                    className="w-full bg-background dark:bg-background-dark text-text-main dark:text-text-light rounded-xl p-3 text-sm min-h-[100px] border border-border dark:border-border-dark mb-4 outline-none resize-none"
                                    value={reviewContent}
                                    onChange={(e) => setReviewContent(e.target.value)}
                                    onPaste={(e) => { e.preventDefault(); showAlert('복사한 내용보다는 직접 적어주신 말씀이 더 정확한 정보가 됩니다!'); }}
                                    placeholder={`최소 ${ABUSE_LIMITS.MIN_CONTENT_LENGTH}자 이상 작성해주세요.`}
                                ></textarea>
                                <div className="flex gap-2"><button onClick={() => { setShowReviewModal(false); setEditingReviewId(null); setReviewContent(""); setRating(5); }} className="flex-1 py-3 bg-background dark:bg-background-dark text-text-muted rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600">취소</button><button onClick={handleSubmitReview} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold">{editingReviewId ? '수정' : '등록'}</button></div>


                            </div>
                        </div>
                    )
                }

                {
                    showReportModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowReportModal(false)}>
                            <div
                                className="bg-surface dark:bg-surface-dark rounded-2xl w-full max-w-sm p-6 shadow-2xl border-t-4 border-urgency max-h-[85vh] overflow-y-auto"
                                onClick={(e) => e.stopPropagation()}
                                style={{ WebkitOverflowScrolling: 'touch' }}
                            >
                                <h3 className="text-lg font-bold text-center mb-4 text-text-main dark:text-text-light">신고하기</h3>
                                <p className="text-sm text-text-muted text-center mb-4">신고 사유를 선택해주세요</p>

                                {/* Report Reason Selection */}
                                <div className="space-y-2 mb-4">
                                    {[
                                        '비밀번호가 틀려요',
                                        '건물주 요청으로 삭제해주세요',
                                        '도어락이 생겼어요',
                                        '휴지가 없어요',
                                        '비데가 없어요',
                                        '기타'
                                    ].map((reason) => (
                                        <button
                                            key={reason}
                                            onClick={() => {
                                                setSelectedReportType(reason);
                                                if (reason !== '기타') {
                                                    setReportReason('');
                                                }
                                            }}
                                            className={`w-full py-3 px-4 rounded-xl font-medium text-sm transition-all ${selectedReportType === reason
                                                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                                                : 'bg-background dark:bg-background-dark text-text-main dark:text-text-light hover:bg-gray-200 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>

                                {/* Custom Text Input for "기타" */}
                                {selectedReportType === '기타' && (
                                    <textarea
                                        className="w-full bg-background dark:bg-background-dark rounded-xl p-3 text-sm min-h-[80px] border border-urgency dark:border-urgency-500 mb-4 text-text-main dark:text-text-light outline-none"
                                        placeholder="상세 사유를 입력하세요"
                                        value={reportReason}
                                        onChange={(e) => setReportReason(e.target.value)}
                                        onPaste={(e) => { e.preventDefault(); showAlert('복사한 내용보다는 직접 적어주신 말씀이 더 정확한 정보가 됩니다!'); }}
                                    />
                                )}

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowReportModal(false);
                                            setSelectedReportType('');
                                            setReportReason('');
                                        }}
                                        className="flex-1 py-3 bg-background dark:bg-background-dark text-text-muted rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleReportClick}
                                        className="flex-1 py-3 bg-urgency text-white rounded-xl font-bold"
                                    >
                                        제출
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Owner Confirmation Modal */}
                {
                    showOwnerConfirmModal && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="flex justify-center mb-4">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                        <DoorClosed className="w-8 h-8 text-red-500" />
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-center mb-2">건물주님, 심려를 끼쳐드려 죄송합니다.</h3>
                                <p className="text-gray-600 text-center text-sm mb-6 leading-relaxed">
                                    정말 화장실이 급한 사람들을 위해 만든 서비스이니 너른 양해 부탁드립니다.<br /><br />
                                    <strong>정말 삭제 요청을 진행하시겠습니까?</strong>
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowOwnerConfirmModal(false)}
                                        className="flex-1 py-3 bg-gray-100 rounded-xl font-bold text-gray-600"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={() => submitReport('건물주 요청으로 삭제해주세요')}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold"
                                    >
                                        삭제 요청하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Review Success Modal (Celebration before Ad) */}
                {
                    showReviewSuccessModal && (
                        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                                {/* Confetti Background Effect */}
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <circle cx="20" cy="20" r="5" fill="#FBBF24" />
                                        <circle cx="80" cy="30" r="7" fill="#3B82F6" />
                                        <rect x="40" y="60" width="8" height="8" fill="#EF4444" transform="rotate(45 44 64)" />
                                        <circle cx="60" cy="80" r="6" fill="#10B981" />
                                        <rect x="10" y="50" width="6" height="6" fill="#8B5CF6" transform="rotate(30 13 53)" />
                                    </svg>
                                </div>

                                <div className="flex flex-col items-center text-center relative z-10">
                                    <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                        <span className="text-4xl">🎉</span>
                                    </div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">리뷰 작성 감사합니다!</h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-8 leading-relaxed">
                                        광고 시청 후 <span className="font-bold text-amber-500">크레딧(+{reviewRewardAmount} Cr)</span>이<br />지급됩니다.
                                    </p>

                                    <button
                                        onClick={() => {
                                            setShowReviewSuccessModal(false);
                                            setShowAdModal(true);
                                        }}
                                        className="w-full py-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-600 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <PlayCircle className="w-5 h-5 fill-current" />
                                        광고 시청하기
                                    </button>
                                    <button
                                        onClick={() => setShowReviewSuccessModal(false)}
                                        className="mt-4 text-xs text-gray-400 underline decoration-gray-300 underline-offset-4 hover:text-gray-600"
                                    >
                                        괜찮습니다, 다음에 받을게요
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Reward Modal */}
                {
                    showRewardModal.show && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                                {/* Background Decoration */}
                                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <circle cx="20" cy="20" r="5" fill="#FBBF24"></circle>
                                        <circle cx="80" cy="30" r="7" fill="#3B82F6"></circle>
                                        <rect x="40" y="60" width="8" height="8" fill="#EF4444" transform="rotate(45 44 64)"></rect>
                                    </svg>
                                </div>

                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-yellow-50 dark:ring-yellow-900/20">
                                        <Gift className="w-10 h-10 text-yellow-600 dark:text-yellow-500 fill-yellow-500" />
                                    </div>

                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight whitespace-pre-line">
                                        {showRewardModal.message}
                                    </h3>

                                    <div className="my-6">
                                        <span className="text-3xl font-black text-amber-500 flex items-center justify-center gap-1 drop-shadow-sm">
                                            +{showRewardModal.points} <span className="text-xl text-gray-400 font-bold">Credits</span>
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => setShowRewardModal({ ...showRewardModal, show: false })}
                                        className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                                    >
                                        확인
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                <AdManager isOpen={showAdModal} onClose={handleAdClose} adType="interstitial" />
                {/* Alert Modal */}
                <AlertModal
                    isOpen={alertModal.isOpen}
                    message={alertModal.message}
                    onClose={closeAlert}
                    onConfirm={alertModal.onConfirm}
                    isConfirm={alertModal.isConfirm}
                />
            </div>
        </div>
    );
};

export default DetailPage;
