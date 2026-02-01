import React, { useEffect, useState } from 'react';
import { Copy, Check, MapPin, Star, Gift, ShieldCheck, ChevronDown, Award, Users, Smartphone, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface DownloadPageProps {
    referrerCode: string | null;
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.toiletshare.app';
const APP_STORE_URL = 'https://apps.apple.com/app/id6740177708';

const SCREENSHOTS = [
    { src: '/images/Screenshot/Main(IOS-phone).png', label: '주변 화장실 찾기' },
    { src: '/images/Screenshot/toilet_detail(IOS-phone).png', label: '상세 정보 및 리뷰' },
    { src: '/images/Screenshot/toilet_navi(IOS-phone).png', label: '길찾기 안내' },
    { src: '/images/Screenshot/toilet_submit(IOS-phone).png', label: '새로운 장소 제보' },
    { src: '/images/Screenshot/setup(IOS-phone).png', label: '간편한 설정' }
];

const DownloadPage: React.FC<DownloadPageProps> = ({ referrerCode }) => {
    const [copied, setCopied] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Lightbox State
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const [zoomLevel, setZoomLevel] = useState<number>(1);

    const screenshots = SCREENSHOTS; // Alias for consistency

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleCopyAndRedirect = async (storeUrl: string) => {
        if (referrerCode) {
            try {
                await navigator.clipboard.writeText(referrerCode);
                setCopied(true);
                // Removed alert() as it blocks the UI and can prevent automatic redirection in some browsers
                console.log(`[DownloadPage] Referral code [${referrerCode}] copied.`);
            } catch (err) {
                console.error('Clipboard write failed', err);
            }
        }

        // Redirect immediately or after a very short delay for the copy state to reflect
        if (storeUrl !== '#') {
            window.location.href = storeUrl;
        }
    };

    // Lightbox Handlers
    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setZoomLevel(1);
        // Lock body scroll
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setLightboxIndex(null);
        setZoomLevel(1);
        document.body.style.overflow = '';
    };

    const toggleZoom = () => {
        setZoomLevel(prev => prev === 1 ? 2.5 : 1);
    };

    const navigateLightbox = (direction: number) => {
        if (lightboxIndex === null) return;
        let newIndex = lightboxIndex + direction;
        if (newIndex < 0) newIndex = screenshots.length - 1;
        if (newIndex >= screenshots.length) newIndex = 0;
        setLightboxIndex(newIndex);
        setZoomLevel(1);
    };

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans pb-32">

            {/* --- Navigation Bar --- */}
            <nav className="fixed top-0 w-full z-[100] bg-white border-b border-gray-100 py-4 shadow-sm">
                <div className="max-w-md mx-auto px-6 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <img src="/images/app/ddong-icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm" />
                        <span className="font-bold text-lg tracking-tight text-gray-900">대똥단결</span>
                    </div>
                    <button
                        onClick={() => handleCopyAndRedirect(PLAY_STORE_URL)}
                        className="bg-gray-900 text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-black transition-colors"
                    >
                        앱 다운로드
                    </button>
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <header className="relative pt-24 pb-12 px-6 overflow-hidden">
                <div className="max-w-md mx-auto text-center relative z-10">
                    <div className="inline-block mb-4 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold tracking-wide uppercase">
                        No.1 Public Restroom Finder
                    </div>
                    <h1 className="text-4xl font-black mb-4 leading-tight tracking-tight text-gray-900">
                        급할 땐,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">대똥단결</span>
                    </h1>
                    <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                        전국 5만여개 이상의 개방 화장실 정보를<br />
                        실시간으로 확인하세요.
                    </p>

                    {/* Hero Image */}
                    <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-10 group">
                        <div className="absolute inset-0 bg-blue-200 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                        <img
                            src="/images/app/landing_hero_3d.png"
                            alt="Map Illustration"
                            className="relative z-10 w-full h-full object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500"
                        />
                    </div>

                    {/* Referral Card Hidden (Background Processing) */}
                </div>
            </header>



            {/* --- App Screenshot Gallery (New) --- */}
            <section className="pb-12 pt-0 bg-white overflow-hidden">
                <div className="max-w-md mx-auto">
                    <div className="px-6 mb-8 text-center">
                        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">서비스 미리보기</h2>
                        <p className="text-gray-500 text-sm">대똥단결의 직관적인 기능을 확인해보세요.</p>
                    </div>

                    {/* Horizontal Scroll Content */}
                    <div className="flex gap-6 overflow-x-auto px-6 pb-10 scrollbar-hide snap-x snap-mandatory">
                        {screenshots.map((shot, idx) => (
                            <div key={idx} className="flex-shrink-0 w-72 snap-center group cursor-pointer" onClick={() => openLightbox(idx)}>
                                <div className="relative rounded-[24px] overflow-hidden shadow-2xl border border-gray-100 bg-gray-50 hover:scale-[1.02] transition-transform duration-300">
                                    {/* Thumbnail: Removing aspect constraint and using object-contain to show full quality text */}
                                    <img
                                        src={shot.src}
                                        alt={shot.label}
                                        className="w-full h-auto object-contain"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        <div className="opacity-0 group-hover:opacity-100 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0 transition-all">
                                            터치하여 확대
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-center font-bold text-gray-900 text-sm">{shot.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Lightbox Overlay */}
                {lightboxIndex !== null && (
                    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
                        {/* Header Controls */}
                        <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-center text-white bg-gradient-to-b from-black/50 to-transparent">
                            <div className="text-sm font-medium opacity-80">
                                {lightboxIndex + 1} / {screenshots.length}
                            </div>
                            <button
                                onClick={closeLightbox}
                                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Main Image Container */}
                        <div
                            className="w-full h-full flex items-center justify-center overflow-auto touch-pan-x touch-pan-y"
                            onClick={(e) => {
                                // Close if clicking outside image (on background)
                                if (e.target === e.currentTarget) closeLightbox();
                            }}
                        >
                            <img
                                src={screenshots[lightboxIndex].src}
                                alt="Fullscreen"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleZoom();
                                }}
                                className={`transition-all duration-300 ease-out cursor-zoom-in
                                    ${zoomLevel > 1
                                        ? 'w-auto h-auto max-w-none scale-[1.0]' // Zoomed: Allow logic to handle scale via width, or just native size.
                                        // Actually, for crisp text, we want native size.
                                        // If screen is small, w-auto h-auto might still effectively be "contain" if intrinsic is small.
                                        // But screenshots are usually large.
                                        // Let's use min-w-[150%] to force zoom feel.
                                        : 'max-w-full max-h-full object-contain p-4' // Default: Fit
                                    }
                                `}
                                style={zoomLevel > 1 ? { minWidth: '150%' } : {}}
                            />
                        </div>

                        {/* Navigation Buttons (Hidden if zoomed for better panning) */}
                        {zoomLevel === 1 && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigateLightbox(-1); }}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-md"
                                >
                                    <ChevronLeft className="w-8 h-8" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigateLightbox(1); }}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors backdrop-blur-md"
                                >
                                    <ChevronRight className="w-8 h-8" />
                                </button>
                            </>
                        )}

                        {/* Zoom Hint / Footer */}
                        <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                            <div className="inline-block bg-black/50 text-white/80 px-4 py-2 rounded-full text-xs backdrop-blur-md">
                                {zoomLevel === 1 ? '화면을 터치하면 확대됩니다' : '화면을 터치하면 축소됩니다'}
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {/* --- Feature 1 (Left Aligned) --- */}
            <section className="py-16 px-6 max-w-md mx-auto">
                <div className="flex flex-col space-y-4">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
                        <MapPin className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                        내 주변 가장 가까운<br />개방 화장실 찾기
                    </h2>
                    <p className="text-gray-500 leading-relaxed">
                        낯선 곳에서 당황하지 마세요. 현재 위치를 기반으로 도보 5분 거리 내의 이용 가능한 화장실을 즉시 안내합니다.
                    </p>
                </div>
            </section>

            {/* --- Feature 2 (Right Aligned Concept) --- */}
            <section className="py-16 px-6 max-w-md mx-auto border-t border-gray-100">
                <div className="flex flex-col space-y-4 items-end text-right">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                        데이터로 검증된<br />안전하고 깨끗한 공간
                    </h2>
                    <p className="text-gray-500 leading-relaxed">
                        사용자들의 실시간 리뷰와 평점을 통해 청결도와 안전성을 미리 확인하고 안심하고 이용하세요.
                    </p>
                </div>
            </section>

            {/* --- Feature 3 (Center Aligned) --- */}
            <section className="py-16 px-6 max-w-md mx-auto border-t border-gray-100 text-center">
                <div className="flex flex-col items-center space-y-4">
                    <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center">
                        <Award className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                        참여할수록 커지는<br />포인트 혜택
                    </h2>
                    <p className="text-gray-500 leading-relaxed">
                        화장실 정보를 공유하거나 리뷰를 남기면 포인트가 적립됩니다. 적립된 포인트로 다양한 상품을 교환하세요.
                    </p>
                </div>
            </section>

            {/* --- Footer --- */}
            <footer className="bg-gray-900 text-gray-400 py-12 px-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-6 opacity-50">
                    <img src="/images/app/ddong-icon.png" alt="Logo" className="w-6 h-6 grayscale" />
                    <span className="font-bold text-sm tracking-tight text-white">대똥단결</span>
                </div>
                <p className="text-xs leading-5 mb-8 text-gray-500">
                    대똥단결은 공공데이터를 기반으로<br />
                    누구나 편리하게 화장실을 이용할 수 있도록<br />
                    돕는 소셜 맵 서비스입니다.
                </p>
                <p className="text-[10px] text-gray-600 font-medium">
                    © 2024 ToiletShare Inc. All rights reserved.
                </p>
            </footer>

            {/* --- Sticky Bottom CTA --- */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-gray-200 z-50">
                <div className="max-w-md mx-auto grid grid-cols-2 gap-3">
                    <button
                        onClick={() => handleCopyAndRedirect(PLAY_STORE_URL)}
                        className="h-14 flex flex-col items-center justify-center bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Android</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold">Google Play</span>
                        </div>
                    </button>
                    <button
                        onClick={() => handleCopyAndRedirect(APP_STORE_URL)}
                        className="h-14 flex flex-col items-center justify-center bg-gray-900 text-white rounded-xl shadow-lg shadow-gray-200 hover:bg-black transition-colors"
                    >
                        <span className="text-[10px] font-bold text-gray-400 uppercase">iOS</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold">App Store</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadPage;
