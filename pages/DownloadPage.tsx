import React, { useEffect, useState } from 'react';
import { Copy, Check, MapPin, Star, Gift, ShieldCheck, ChevronDown, Award, Users, Smartphone } from 'lucide-react';

interface DownloadPageProps {
    referrerCode: string | null;
}

const DownloadPage: React.FC<DownloadPageProps> = ({ referrerCode }) => {
    const [copied, setCopied] = useState(false);
    const [scrolled, setScrolled] = useState(false);

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
                alert(`추천인 코드 [${referrerCode}]가 복사되었습니다!\n앱 설치 후 로그인하면 혜택이 적용됩니다.`);
                setTimeout(() => {
                    if (storeUrl !== '#') window.location.href = storeUrl;
                }, 500);
            } catch (err) {
                console.error('Clipboard write failed', err);
                if (storeUrl !== '#') window.location.href = storeUrl;
            }
        } else {
            if (storeUrl !== '#') window.location.href = storeUrl;
        }
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
                        onClick={() => handleCopyAndRedirect('#')}
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

                    {/* Referral Card */}
                    {referrerCode && (
                        <div className="bg-white border border-gray-100 shadow-xl rounded-2xl p-5 max-w-xs mx-auto transform hover:-translate-y-1 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Gift className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-gray-500 uppercase">초대 혜택</span>
                                </div>
                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Active</span>
                            </div>
                            <div
                                onClick={() => handleCopyAndRedirect('#')}
                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-gray-400 font-medium">Referral Code</span>
                                    <span className="text-xl font-mono font-black text-gray-800 tracking-wider leading-none">{referrerCode}</span>
                                </div>
                                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-400" />}
                            </div>
                            <p className="text-[10px] text-gray-400 mt-3 text-center">
                                터치하여 복사하고 웰컴 포인트를 받으세요.
                            </p>
                        </div>
                    )}
                </div>
            </header>



            {/* --- App Screenshot Gallery (New) --- */}
            <section className="py-12 bg-white overflow-hidden">
                <div className="max-w-md mx-auto">
                    <div className="px-6 mb-8 text-center">
                        <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">서비스 미리보기</h2>
                        <p className="text-gray-500 text-sm">대똥단결의 직관적인 기능을 확인해보세요.</p>
                    </div>

                    {/* Horizontal Scroll Content */}
                    <div className="flex gap-6 overflow-x-auto px-6 pb-10 scrollbar-hide snap-x snap-mandatory">
                        {[
                            { src: '/images/Screenshot/Main(IOS-phone).png', label: '주변 화장실 찾기' },
                            { src: '/images/Screenshot/toilet_detail(IOS-phone).png', label: '상세 정보 및 리뷰' },
                            { src: '/images/Screenshot/toilet_navi(IOS-phone).png', label: '길찾기 안내' },
                            { src: '/images/Screenshot/toilet_submit(IOS-phone).png', label: '새로운 장소 제보' },
                            { src: '/images/Screenshot/setup(IOS-phone).png', label: '간편한 설정' }
                        ].map((shot, idx) => (
                            <div key={idx} className="flex-shrink-0 w-64 snap-center">
                                <div className="relative rounded-[32px] overflow-hidden shadow-2xl aspect-[9/19]">
                                    <img
                                        src={shot.src}
                                        alt={shot.label}
                                        className="w-full h-full object-cover object-top"
                                    />
                                </div>
                                <p className="mt-4 text-center font-bold text-gray-900 text-sm">{shot.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
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
                        onClick={() => handleCopyAndRedirect('#')}
                        className="h-14 flex flex-col items-center justify-center bg-gray-100 text-gray-900 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Android</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold">Google Play</span>
                        </div>
                    </button>
                    <button
                        onClick={() => handleCopyAndRedirect('#')}
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
