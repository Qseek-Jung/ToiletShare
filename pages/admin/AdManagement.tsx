import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AdConfig, DailyStats, CustomBannerType } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AdManagementProps {
    subSection: string;
    refreshTrigger: number;
}

// NEW: VideoRow with Click URL
const VideoRowWithClickUrl: React.FC<{
    url: string,
    clickUrl: string,
    index: number,
    onChange: (val: string) => void,
    onClickUrlChange: (val: string) => void,
    onRemove: () => void,
    platform: 'android' | 'ios'
}> = ({ url, clickUrl, index, onChange, onClickUrlChange, onRemove, platform }) => {
    const [title, setTitle] = React.useState<string | null>(null);

    // Helper to extract YouTube ID (Android only)
    const extractId = (u: string) => {
        if (!u) return null;
        const clean = u.trim();
        if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&?]*).*/;
        const match = clean.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = platform === 'android' ? React.useMemo(() => extractId(url), [url]) : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

    React.useEffect(() => {
        if (platform === 'android' && videoId) {
            const fetchTitle = async () => {
                try {
                    const safeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                    const res = await fetch(`https://noembed.com/embed?url=${safeUrl}`);
                    const data = await res.json();
                    if (data.title) setTitle(data.title);
                } catch (e) { /* ignore */ }
            };
            fetchTitle();
        } else {
            setTitle(null);
        }
    }, [videoId, platform]);

    return (
        <div className="flex flex-col gap-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start gap-3">
                {/* Thumbnail Preview (Android only) */}
                {platform === 'android' && (
                    <div className="w-20 h-14 bg-gray-100 rounded overflow-hidden shrink-0 flex items-center justify-center border border-gray-200 text-xs text-gray-400">
                        {thumbnailUrl ? (
                            <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        ) : (
                            <span className="scale-75">No Img</span>
                        )}
                    </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col gap-2">
                    {/* Title (Android only) */}
                    {platform === 'android' && title && (
                        <div className="text-xs font-bold text-gray-800 truncate" title={title}>{title}</div>
                    )}

                    {/* Video URL */}
                    <input
                        type="text"
                        placeholder={platform === 'android' ? "YouTube URL 또는 ID (예: 2S47kMBvbDg)" : "MP4 URL (예: https://cdn.example.com/ad01.mp4)"}
                        className="w-full p-2 border rounded text-xs focus:border-blue-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                        value={url}
                        onChange={(e) => onChange(e.target.value)}
                    />

                    {/* Click URL */}
                    <input
                        type="text"
                        placeholder="클릭 시 이동할 URL (선택사항, 예: https://example.com)"
                        className="w-full p-2 border rounded text-xs focus:border-green-500 outline-none bg-gray-50 focus:bg-white transition-colors"
                        value={clickUrl}
                        onChange={(e) => onClickUrlChange(e.target.value)}
                    />
                </div>

                <button
                    onClick={onRemove}
                    className="self-start p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="삭제"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export const AdManagement: React.FC<AdManagementProps> = ({ subSection, refreshTrigger }) => {
    // AdManagementView Component
    const AdManagementView = () => {
        const [config, setConfig] = useState<AdConfig>({
            interstitialSource: 'admob',
            bannerSource: 'admob',
            testMode: true,
            bannersEnabled: true,
            youtubeUrls: ['', '', '', '', ''],
            customBanners: [],
            adMobIds: { banner: '', interstitial: '', reward: '', rewardInterstitial: '', appOpen: '', native: '' }
        });
        const [loading, setLoading] = useState(true);
        const [uploading, setUploading] = useState(false);
        const [newBannerFile, setNewBannerFile] = useState<File | null>(null);
        const [newBannerLink, setNewBannerLink] = useState('');
        const [uploadType, setUploadType] = useState<CustomBannerType>('BANNER');
        const [previewUrl, setPreviewUrl] = useState<string | null>(null);
        const [showResetConfirm, setShowResetConfirm] = useState(false);
        const [bannerToDelete, setBannerToDelete] = useState<string | null>(null);
        const [ratioError, setRatioError] = useState<string | null>(null);
        const [currentRatio, setCurrentRatio] = useState<number | null>(null);
        const [currentWidth, setCurrentWidth] = useState<number | null>(null);
        const [currentHeight, setCurrentHeight] = useState<number | null>(null);
        const [selectedImage, setSelectedImage] = useState<string | null>(null);
        const [selectedPlatform, setSelectedPlatform] = useState<'ios' | 'android'>('ios');

        const TYPE_LABELS: Record<string, string> = {
            'BANNER': 'Banner (하단/지도)',
            'NATIVE_LIST': 'Native (목록)',
            'NATIVE_MODAL': 'Native (모달)',
            'NATIVE_DETAIL': 'Detail (상세 상단)'
        };

        useEffect(() => {
            const loadConfig = async () => {
                try {
                    const cfg = await db.getAdConfig();
                    // Migration / Default Handling
                    if (!cfg.interstitialSource) cfg.interstitialSource = 'admob';
                    if (!cfg.bannerSource) cfg.bannerSource = 'admob';
                    if (!cfg.customBanners) cfg.customBanners = [];

                    // Auto-cleanup: Filter empty URLs and ensure at least empty array
                    if (cfg.youtubeUrls) {
                        cfg.youtubeUrls = cfg.youtubeUrls.filter(u => u && u.trim() !== '');
                    } else {
                        cfg.youtubeUrls = [];
                    }

                    if (cfg.testMode === undefined) cfg.testMode = true; // Migration
                    setConfig(cfg);
                } catch (e) {
                    console.error("Failed to load ad config", e);
                } finally {
                    setLoading(false);
                }
            };
            loadConfig();
        }, [refreshTrigger]);

        // Generic Save with Debounce
        const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

        const saveConfig = async (newConfig: AdConfig) => {
            setConfig(newConfig);

            // Clear existing timeout
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            // Debounce: wait 1 second after last change
            saveTimeoutRef.current = setTimeout(async () => {
                try {
                    await db.saveAdConfig(newConfig);
                    console.log('✅ Config saved');
                } catch (e: any) {
                    console.error("Failed to save ad config", e);
                    alert('설정 저장 중 오류가 발생했습니다.\\n' + (e.message || e));
                }
            }, 1000);
        };

        const handleYoutubeUrlChange = (index: number, url: string) => {
            const newUrls = [...config.youtubeUrls];
            newUrls[index] = url.trim();
            saveConfig({ ...config, youtubeUrls: newUrls });
        };



        // File Handler
        const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                if (file.size > 500 * 1024) { // 500KB Limit
                    alert("이미지 용량은 500KB 이하여야 합니다.");
                    return;
                }

                // Preview & Ratio Check
                const reader = new FileReader();
                reader.onloadend = () => {
                    const dataUrl = reader.result as string;
                    const img = new Image();
                    img.onload = () => {
                        const w = img.naturalWidth;
                        const h = img.naturalHeight;
                        const ratio = w / h;

                        setCurrentWidth(w);
                        setCurrentHeight(h);
                        setCurrentRatio(ratio);
                        setPreviewUrl(dataUrl);
                        setNewBannerFile(file);

                        if (ratio < 3.0) {
                            setRatioError(`비율 알림 (${ratio.toFixed(1)}:1). 이 이미지는 모달용으로 적합하며, 하단 배너에는 위아래가 잘릴 수 있습니다.`);
                        } else {
                            setRatioError(null);
                        }
                    };
                    img.src = dataUrl;
                };
                reader.readAsDataURL(file);
            }
        };

        const handleAddBanner = async () => {
            if (!newBannerFile || !previewUrl) return;
            setUploading(true);

            // In a real app, upload to storage here. For now, use Base64.
            const newBannerLabel = {
                id: Date.now().toString(),
                imageUrl: previewUrl,
                targetUrl: newBannerLink,
                createdAt: Date.now(),
                ratio: currentRatio || undefined,
                width: currentWidth || undefined,
                height: currentHeight || undefined,
                type: uploadType
            };

            const updatedBanners = [...config.customBanners, newBannerLabel];
            const newConfig = { ...config, customBanners: updatedBanners }; // Auto-switch to custom if user adds one? Optional.

            await saveConfig(newConfig);

            // Reset Form
            setNewBannerFile(null);
            setPreviewUrl(null);
            setNewBannerLink('');
            setUploading(false);
        };

        const handleDeleteBanner = (id: string) => {
            setBannerToDelete(id);
        };

        const confirmDeleteBanner = async () => {
            if (!bannerToDelete) return;
            const updatedBanners = config.customBanners.filter(b => b.id !== bannerToDelete);

            // If no banners left, switch back to AdMob
            let newSource = config.bannerSource;
            if (updatedBanners.length === 0 && newSource === 'custom') {
                newSource = 'admob';
                // No need for alert here, let the UI reflect it or use a toast
            }

            await saveConfig({ ...config, customBanners: updatedBanners, bannerSource: newSource });
            setBannerToDelete(null);
        };

        if (loading) return <div className="p-8 text-center text-gray-500">설정을 불러오는 중입니다...</div>;

        return (
            <div className="space-y-8 pb-20">
                {/* SECTION 0: Global Ad Settings */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 border-gray-200">
                        <h2 className="text-xl font-black text-gray-900">0. 공통 광고 설정</h2>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800">AdMob 테스트 모드</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                OFF 시 실제 광고가 노출됩니다. (AndroidManifest.xml의 App ID가 올바른지 확인 필수)
                            </p>
                        </div>
                        <button
                            onClick={() => saveConfig({ ...config, testMode: !config.testMode })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.testMode ? 'bg-indigo-600' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.testMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {config.testMode && (
                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700 font-medium">
                            ⚠️ 현재 **테스트 모드**가 켜져 있어 구글의 테스트 광고가 나옵니다. 실제 광고 단위 ID 설정을 완료하셨더라도 테스트 광고만 노출됩니다.
                        </div>
                    )}
                </section>

                {/* SECTION 0.1: AdMob IDs (Production) - Platform Specific */}
                <section className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 border-b pb-2 border-gray-200">
                        <h2 className="text-xl font-black text-gray-900">0.1. 광고 단위 ID 설정 (플랫폼별)</h2>
                    </div>
                    {config.testMode && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-700">
                            💡 테스트 모드가 켜져 있어도 광고 ID는 입력해두세요. 테스트 완료 후 테스트 모드만 끄면 바로 실제 광고가 나옵니다.
                        </div>
                    )}

                    {/* Platform Tabs */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex gap-3 mb-6">
                            <button
                                onClick={() => setSelectedPlatform('ios')}
                                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${selectedPlatform === 'ios' ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                🍎 iOS
                            </button>
                            <button
                                onClick={() => setSelectedPlatform('android')}
                                className={`flex-1 py-3 px-6 rounded-lg font-bold transition-all ${selectedPlatform === 'android' ? 'bg-green-500 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                            >
                                🤖 Android
                            </button>
                        </div>

                        {/* iOS Settings */}
                        {selectedPlatform === 'ios' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="font-bold text-sm text-blue-900 mb-2">대똥단결 iOS App - 동영상 광고만</h4>
                                    <p className="text-xs text-blue-700">App ID: ca-app-pub-8142649369272916~9190025429</p>
                                    <p className="text-xs text-blue-600 mt-1">※ 배너는 커스텀 배너 사용</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">App ID</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsIOS?.appId || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsIOS: { ...config.adMobIdsIOS, appId: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-blue-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916~9190025429"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">IOS_Interstitial_Navi (길찾기 종료)</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsIOS?.interstitial || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsIOS: { ...config.adMobIdsIOS, interstitial: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-blue-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916/7259536047"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">IOS_Reward_Charge (무료충전소)</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsIOS?.reward || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsIOS: { ...config.adMobIdsIOS, reward: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-blue-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916/3994421919"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Android Settings */}
                        {selectedPlatform === 'android' && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h4 className="font-bold text-sm text-green-900 mb-2">대똥단결 Android App - 동영상 광고만</h4>
                                    <p className="text-xs text-green-700">App ID: ca-app-pub-8142649369272916~9342907044</p>
                                    <p className="text-xs text-green-600 mt-1">※ 배너는 커스텀 배너 사용</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">App ID</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsAndroid?.appId || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsAndroid: { ...config.adMobIdsAndroid, appId: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-green-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916~9342907044"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">Android_Interstitial_Navi (길찾기 종료)</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsAndroid?.interstitial || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsAndroid: { ...config.adMobIdsAndroid, interstitial: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-green-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916/6481640998"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">Android_Reward_Charge (무료충전소)</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsAndroid?.reward || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsAndroid: { ...config.adMobIdsAndroid, reward: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-green-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916/1560486806"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-700">Android_Banner (하단 배너, 배너 소스가 AdMob일 때)</label>
                                        <input
                                            type="text"
                                            value={config.adMobIdsAndroid?.banner || ''}
                                            onChange={e => setConfig({ ...config, adMobIdsAndroid: { ...config.adMobIdsAndroid, banner: e.target.value } })}
                                            className="w-full p-3 border rounded-lg font-mono text-sm bg-gray-50 focus:border-green-500 outline-none"
                                            placeholder="ca-app-pub-8142649369272916/1667146634"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <button onClick={() => saveConfig(config)} className="px-6 py-3 bg-gray-800 text-white rounded-lg font-bold text-sm hover:bg-gray-900 transition-colors">설정 저장</button>
                        </div>
                    </div>
                </section>

                {/* SECTION 0.5: Global Banner Toggle */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 border-gray-200">
                        <h2 className="text-xl font-black text-gray-900">0.5. 배너 광고 노출 설정</h2>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-gray-800">모든 배너 광고 표시</h3>
                            <p className="text-xs text-gray-500 mt-1">
                                OFF 시 앱 전체의 하단 배너가 즉시 숨겨집니다. (스크린샷 촬영용)
                            </p>
                        </div>
                        <button
                            onClick={() => saveConfig({ ...config, bannersEnabled: !config.bannersEnabled })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config.bannersEnabled !== false ? 'bg-green-500' : 'bg-gray-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.bannersEnabled !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </section>

                {/* SECTION 1: Interstitial */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 border-gray-200">
                        <h2 className="text-xl font-black text-gray-900">1. 전면 광고 (Interstitial)</h2>
                        <span className="text-xs text-gray-500 font-medium">화면 전환, 네비게이션 종료 시 표시</span>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">광고 소스 선택</label>
                            <div className="flex gap-4">
                                <button
                                    onClick={async () => {
                                        const newConfig = { ...config, interstitialSource: 'admob' };
                                        setConfig(newConfig);
                                        await saveConfig(newConfig);
                                    }}
                                    className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${config.interstitialSource === 'admob' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    <span className="text-xl">📱</span>
                                    <span>AdMob 사용</span>
                                </button>
                                <button
                                    onClick={async () => {
                                        const newConfig = { ...config, interstitialSource: 'youtube' };
                                        setConfig(newConfig);
                                        await saveConfig(newConfig);
                                    }}
                                    className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${config.interstitialSource === 'youtube' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    <span className="text-xl">🎬</span>
                                    <span>자체 영상 사용</span>
                                </button>
                            </div>
                        </div>

                        {/* Platform-Specific Video Ad Settings */}
                        {config.interstitialSource === 'youtube' && (
                            <div className="space-y-6 animate-in slide-in-from-top-2">
                                {/* 1.1 Android Settings (YouTube) */}
                                <div className="glass-panel p-5 rounded-xl bg-red-50/50 border border-red-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                                            <span className="text-red-600">1.1</span> Android 설정 (YouTube)
                                        </h3>
                                        <span className="text-[10px] font-bold text-red-600 bg-red-100 px-3 py-1 rounded-full">
                                            Android 전용 · Playlist 순환
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-600 mb-4 bg-white/60 p-3 rounded-lg border border-red-100">
                                        💡 Android는 여러 영상을 랜덤으로 순환 재생합니다. 클릭 시 설정한 URL로 이동합니다.
                                    </div>

                                    <div className="space-y-3">
                                        {(config.interstitialAndroid?.youtubeUrls || []).map((url, index) => (
                                            <VideoRowWithClickUrl
                                                key={index}
                                                url={url}
                                                clickUrl={config.interstitialAndroid?.clickUrls?.[index] || ''}
                                                index={index}
                                                platform="android"
                                                onChange={(val) => {
                                                    const newUrls = [...(config.interstitialAndroid?.youtubeUrls || [])];
                                                    newUrls[index] = val;
                                                    saveConfig({
                                                        ...config,
                                                        interstitialAndroid: {
                                                            ...config.interstitialAndroid,
                                                            youtubeUrls: newUrls,
                                                            clickUrls: config.interstitialAndroid?.clickUrls || []
                                                        }
                                                    });
                                                }}
                                                onClickUrlChange={(val) => {
                                                    const newClickUrls = [...(config.interstitialAndroid?.clickUrls || [])];
                                                    newClickUrls[index] = val;
                                                    saveConfig({
                                                        ...config,
                                                        interstitialAndroid: {
                                                            ...config.interstitialAndroid,
                                                            youtubeUrls: config.interstitialAndroid?.youtubeUrls || [],
                                                            clickUrls: newClickUrls
                                                        }
                                                    });
                                                }}
                                                onRemove={() => {
                                                    const newUrls = (config.interstitialAndroid?.youtubeUrls || []).filter((_, i) => i !== index);
                                                    const newClickUrls = (config.interstitialAndroid?.clickUrls || []).filter((_, i) => i !== index);
                                                    saveConfig({
                                                        ...config,
                                                        interstitialAndroid: {
                                                            ...config.interstitialAndroid,
                                                            youtubeUrls: newUrls,
                                                            clickUrls: newClickUrls
                                                        }
                                                    });
                                                }}
                                            />
                                        ))}

                                        {/* Add Button */}
                                        <button
                                            onClick={() => {
                                                saveConfig({
                                                    ...config,
                                                    interstitialAndroid: {
                                                        ...config.interstitialAndroid,
                                                        youtubeUrls: [...(config.interstitialAndroid?.youtubeUrls || []), ''],
                                                        clickUrls: config.interstitialAndroid?.clickUrls || []
                                                    }
                                                });
                                            }}
                                            className="w-full py-3 border-2 border-dashed border-red-300 text-red-500 font-bold rounded-lg hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <span>+ YouTube 영상 추가</span>
                                        </button>

                                        {(!config.interstitialAndroid?.youtubeUrls || config.interstitialAndroid.youtubeUrls.length === 0) && (
                                            <div className="text-center py-4 text-xs text-red-500 font-medium bg-white/60 rounded-lg">
                                                등록된 YouTube 영상이 없습니다.
                                            </div>
                                        )}
                                    </div>

                                    {/* Android Duration Settings */}
                                    <div className="mt-5 pt-4 border-t border-red-200 grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-700">비밀번호 확인 (초)</label>
                                            <input
                                                type="number"
                                                value={config.interstitialAndroid?.durationUnlock || 15}
                                                onChange={(e) => saveConfig({
                                                    ...config,
                                                    interstitialAndroid: {
                                                        ...config.interstitialAndroid,
                                                        youtubeUrls: config.interstitialAndroid?.youtubeUrls || [],
                                                        clickUrls: config.interstitialAndroid?.clickUrls || [],
                                                        durationUnlock: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full p-2 border rounded text-sm focus:border-red-500 outline-none bg-white text-center font-bold text-red-600"
                                                min="5"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-700">포인트 충전 (초)</label>
                                            <input
                                                type="number"
                                                value={config.interstitialAndroid?.durationPoint || 15}
                                                onChange={(e) => saveConfig({
                                                    ...config,
                                                    interstitialAndroid: {
                                                        ...config.interstitialAndroid,
                                                        youtubeUrls: config.interstitialAndroid?.youtubeUrls || [],
                                                        clickUrls: config.interstitialAndroid?.clickUrls || [],
                                                        durationPoint: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full p-2 border rounded text-sm focus:border-red-500 outline-none bg-white text-center font-bold text-red-600"
                                                min="5"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-700">길찾기 종료 (초)</label>
                                            <input
                                                type="number"
                                                value={config.interstitialAndroid?.durationNavigation || 5}
                                                onChange={(e) => saveConfig({
                                                    ...config,
                                                    interstitialAndroid: {
                                                        ...config.interstitialAndroid,
                                                        youtubeUrls: config.interstitialAndroid?.youtubeUrls || [],
                                                        clickUrls: config.interstitialAndroid?.clickUrls || [],
                                                        durationNavigation: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full p-2 border rounded text-sm focus:border-red-500 outline-none bg-white text-center font-bold text-red-600"
                                                min="3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 1.2 iOS Settings (MP4) */}
                                <div className="glass-panel p-5 rounded-xl bg-blue-50/50 border border-blue-200 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                                            <span className="text-blue-600">1.2</span> iOS 설정 (MP4)
                                        </h3>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                                            iOS 전용 · 1개 랜덤 선택 후 반복
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-600 mb-4 bg-white/60 p-3 rounded-lg border border-blue-100">
                                        💡 iOS는 YouTube 재생이 제한되므로 MP4 영상을 사용합니다.<br />
                                        트래픽 절약을 위해 랜덤하게 1개를 선택한 후 동일 영상을 반복 재생합니다.
                                    </div>

                                    <div className="space-y-3">
                                        {(config.interstitialIOS?.videoUrls || []).map((url, index) => (
                                            <VideoRowWithClickUrl
                                                key={index}
                                                url={url}
                                                clickUrl={config.interstitialIOS?.clickUrls?.[index] || ''}
                                                index={index}
                                                platform="ios"
                                                onChange={(val) => {
                                                    const newUrls = [...(config.interstitialIOS?.videoUrls || [])];
                                                    newUrls[index] = val;
                                                    saveConfig({
                                                        ...config,
                                                        interstitialIOS: {
                                                            ...config.interstitialIOS,
                                                            videoUrls: newUrls,
                                                            clickUrls: config.interstitialIOS?.clickUrls || []
                                                        }
                                                    });
                                                }}
                                                onClickUrlChange={(val) => {
                                                    const newClickUrls = [...(config.interstitialIOS?.clickUrls || [])];
                                                    newClickUrls[index] = val;
                                                    saveConfig({
                                                        ...config,
                                                        interstitialIOS: {
                                                            ...config.interstitialIOS,
                                                            videoUrls: config.interstitialIOS?.videoUrls || [],
                                                            clickUrls: newClickUrls
                                                        }
                                                    });
                                                }}
                                                onRemove={() => {
                                                    const newUrls = (config.interstitialIOS?.videoUrls || []).filter((_, i) => i !== index);
                                                    const newClickUrls = (config.interstitialIOS?.clickUrls || []).filter((_, i) => i !== index);
                                                    saveConfig({
                                                        ...config,
                                                        interstitialIOS: {
                                                            ...config.interstitialIOS,
                                                            videoUrls: newUrls,
                                                            clickUrls: newClickUrls
                                                        }
                                                    });
                                                }}
                                            />
                                        ))}

                                        {/* Add Button */}
                                        <button
                                            onClick={() => {
                                                saveConfig({
                                                    ...config,
                                                    interstitialIOS: {
                                                        ...config.interstitialIOS,
                                                        videoUrls: [...(config.interstitialIOS?.videoUrls || []), ''],
                                                        clickUrls: config.interstitialIOS?.clickUrls || []
                                                    }
                                                });
                                            }}
                                            className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-500 font-bold rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all text-sm flex items-center justify-center gap-2"
                                        >
                                            <span>+ MP4 영상 추가</span>
                                        </button>

                                        {(!config.interstitialIOS?.videoUrls || config.interstitialIOS.videoUrls.length === 0) && (
                                            <div className="text-center py-4 text-xs text-blue-500 font-medium bg-white/60 rounded-lg">
                                                등록된 MP4 영상이 없습니다. Cloudflare R2 등 CDN에 업로드한 영상 URL을 입력하세요.
                                            </div>
                                        )}
                                    </div>

                                    {/* iOS Duration Settings */}
                                    <div className="mt-5 pt-4 border-t border-blue-200 grid grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-700">비밀번호 확인 (초)</label>
                                            <input
                                                type="number"
                                                value={config.interstitialIOS?.durationUnlock || 15}
                                                onChange={(e) => saveConfig({
                                                    ...config,
                                                    interstitialIOS: {
                                                        ...config.interstitialIOS,
                                                        videoUrls: config.interstitialIOS?.videoUrls || [],
                                                        clickUrls: config.interstitialIOS?.clickUrls || [],
                                                        durationUnlock: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full p-2 border rounded text-sm focus:border-blue-500 outline-none bg-white text-center font-bold text-blue-600"
                                                min="5"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-700">포인트 충전 (초)</label>
                                            <input
                                                type="number"
                                                value={config.interstitialIOS?.durationPoint || 15}
                                                onChange={(e) => saveConfig({
                                                    ...config,
                                                    interstitialIOS: {
                                                        ...config.interstitialIOS,
                                                        videoUrls: config.interstitialIOS?.videoUrls || [],
                                                        clickUrls: config.interstitialIOS?.clickUrls || [],
                                                        durationPoint: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full p-2 border rounded text-sm focus:border-blue-500 outline-none bg-white text-center font-bold text-blue-600"
                                                min="5"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-gray-700">길찾기 종료 (초)</label>
                                            <input
                                                type="number"
                                                value={config.interstitialIOS?.durationNavigation || 5}
                                                onChange={(e) => saveConfig({
                                                    ...config,
                                                    interstitialIOS: {
                                                        ...config.interstitialIOS,
                                                        videoUrls: config.interstitialIOS?.videoUrls || [],
                                                        clickUrls: config.interstitialIOS?.clickUrls || [],
                                                        durationNavigation: Number(e.target.value)
                                                    }
                                                })}
                                                className="w-full p-2 border rounded text-sm focus:border-blue-500 outline-none bg-white text-center font-bold text-blue-600"
                                                min="3"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* SECTION 2: Banner / Native */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 border-b pb-2 border-gray-200">
                        <h2 className="text-xl font-black text-gray-900">2. 배너/네이티브 광고</h2>
                        <span className="text-xs text-gray-500 font-medium">리 목록, 등록 완료 모달 등에 표시</span>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-3">광고 노출 방식</label>

                            {/* Toggle Switch */}
                            <div className="flex bg-gray-100 p-1 rounded-lg relative h-12 w-full max-w-md mx-auto">
                                <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-md shadow-sm transition-all duration-300 ease-out border border-gray-200 ${config.bannerSource === 'custom' ? 'left-[calc(50%+2px)]' : 'left-1'}`}></div>
                                <button
                                    onClick={() => saveConfig({ ...config, bannerSource: 'admob' })}
                                    className={`flex-1 relative z-10 font-bold text-sm transition-colors ${config.bannerSource === 'admob' ? 'text-indigo-600' : 'text-gray-500'}`}
                                >
                                    AdMob (자동)
                                </button>
                                <button
                                    onClick={() => saveConfig({ ...config, bannerSource: 'custom' })}
                                    className={`flex-1 relative z-10 font-bold text-sm transition-colors ${config.bannerSource === 'custom' ? 'text-amber-600' : 'text-gray-500'}`}
                                >
                                    직접 등록 (이미지)
                                </button>
                            </div>
                        </div>

                        {/* Designer Guide (New) */}
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                            <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                🎨 디자이너용 배너 제작 가이드 (복사해서 전달하세요)
                            </h4>
                            <div className="bg-white p-3 rounded-lg border text-[11px] leading-relaxed font-mono select-all">
                                [모바일 앱 배너 제작 가이드 - 고화질 권장 규격]<br />
                                <br />
                                1. 권장 해상도 (High-DPI 선명도 확보를 위한 규격)<br />
                                - 하단 바/목록 배너: 1080 x 290 px (약 3.7:1 비율, 또는 가로 720px 이상)<br />
                                - 길찾기(상세) 상단: 1080 x 270 px (4:1 비율 가로형)<br />
                                - 홈 화면 리스트: 1080 x 216 px (5:1 비율)<br />
                                - 등록 성공 팝업: 1080 x 800 px (3:2 ~ 4:3 비율)<br />
                                <br />
                                * 1080px은 최신 스마트폰(아이폰/갤럭시)의 너비에 맞춘 기준입니다.<br />
                                * 실제로는 작게 보이지만, 원본을 큼직하게 제작해야 글자가 깨지지 않고 깨끗하게 나옵니다.<br />
                                <br />
                                2. 디자인 세부 가이드<br />
                                - 상하좌우 10% 영역은 '안전 영역'으로 비워두고 중요한 글자나 로고를 배치하세요.<br />
                                - 배경색이나 이미지는 캔버스 끝까지 꽉 채워야 잘리지 않고 자연스럽습니다.<br />
                                - 용량: 파일당 500KB 이하 준수 (JPG/PNG/GIF 지원)<br />
                                <br />
                                💡 '상세페이지 배너'는 길찾기 실행 시 화면 상단에 뜨는 배너를 의미합니다.
                            </div>
                            <p className="text-[10px] text-gray-500">* 위 내용을 드래그하여 복사한 뒤 디자이너에게 전달하면 규격에 맞는 배너를 제작할 수 있습니다.</p>
                        </div>

                        {/* Custom Banner Manager */}
                        {config.bannerSource === 'custom' && (
                            <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                                {/* Upload Form */}
                                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                                    <h4 className="font-bold text-sm text-gray-800 mb-3">새 배너 등록</h4>

                                    {/* Type Selector */}
                                    <div className="mb-4">
                                        <div className="flex gap-2 mb-2">
                                            {[
                                                { id: 'BANNER', label: 'Banner (하단/지도)', desc: '1080x290 (3.7:1)' },
                                                { id: 'NATIVE_LIST', label: 'Native (목록)', desc: '1080x216 (5:1)' },
                                                { id: 'NATIVE_MODAL', label: 'Native (모달)', desc: '1080x800 (1.35:1)' },
                                                { id: 'NATIVE_DETAIL', label: 'Detail (상세 상단)', desc: '1080x270 (4:1)' }
                                            ].map(type => (
                                                <button
                                                    key={type.id}
                                                    onClick={() => setUploadType(type.id as CustomBannerType)}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex flex-col items-center ${uploadType === type.id
                                                        ? 'bg-amber-100 border-amber-300 text-amber-800 shadow-sm'
                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <span>{type.label}</span>
                                                    <span className="font-normal opacity-75 md:block hidden">{type.desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-3 items-start">
                                            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden border border-gray-300 relative group cursor-pointer shrink-0">
                                                {previewUrl ? (
                                                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                                                ) : (
                                                    <span className="text-xs text-gray-500 text-center p-1">이미지<br />선택</span>
                                                )}
                                                <input type="file" accept="image/*" onChange={handleFileSelect} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={newBannerLink}
                                                    onChange={e => setNewBannerLink(e.target.value)}
                                                    placeholder="이동할 URL (예: https://mysite.com)"
                                                    className="w-full p-2 border border-amber-200 rounded text-sm outline-none focus:border-amber-500"
                                                />
                                                <div className="text-xs text-gray-500">
                                                    * 권장 비율: <strong>5:1 이상</strong> (하단 바/목록용)<br />
                                                    * <strong>3:2 정도</strong> (모달/팝업용)<br />
                                                    * 500KB 이하의 JPG/PNG/GIF
                                                </div>
                                                {ratioError && (
                                                    <div className="text-xs text-amber-600 font-bold">
                                                        ℹ {ratioError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddBanner}
                                            disabled={!newBannerFile || uploading}
                                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "리스트에 추가하기"}
                                        </button>
                                    </div>
                                </div>

                                {/* Active Banners List */}
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-sm text-gray-800">등록된 배너 ({config.customBanners.length})</h4>
                                        {config.customBanners.length > 0 && (
                                            <button
                                                onClick={() => setShowResetConfirm(true)}
                                                className="text-xs text-red-500 underline hover:text-red-700 font-medium"
                                            >
                                                모든 배너 삭제 (초기화)
                                            </button>
                                        )}
                                    </div>
                                    {config.customBanners.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            등록된 배너가 없습니다.<br />
                                            <span className="text-xs">이미지가 없으면 AdMob으로 자동 표시됩니다.</span>
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            {config.customBanners.map((banner) => (
                                                <div key={banner.id} className="flex gap-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative group items-center">
                                                    <div
                                                        className="w-16 h-16 bg-gray-100 rounded overflow-hidden shrink-0 cursor-zoom-in ring-1 ring-black/5 hover:ring-indigo-500 transition-all"
                                                        onClick={() => setSelectedImage(banner.imageUrl)}
                                                    >
                                                        <img src={banner.imageUrl} className="w-full h-full object-cover" alt="Banner" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs text-gray-400 mb-1">
                                                            {new Date(banner.createdAt).toLocaleDateString()} 등록
                                                            {banner.width && banner.height ? ` · ${banner.width}x${banner.height}` : ''}
                                                            {banner.ratio ? ` (${banner.ratio.toFixed(1)}:1)` : ''}
                                                        </div>
                                                        <div className="text-sm font-medium text-blue-600 truncate">{banner.targetUrl || "링크 없음"}</div>
                                                        <div className="mt-1">
                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${banner.type === 'NATIVE_LIST' ? 'bg-purple-100 text-purple-700' :
                                                                banner.type === 'NATIVE_MODAL' ? 'bg-green-100 text-green-700' :
                                                                    banner.type === 'NATIVE_DETAIL' ? 'bg-orange-100 text-orange-700' :
                                                                        'bg-blue-100 text-blue-700'
                                                                }`}>
                                                                {TYPE_LABELS[banner.type || 'BANNER'] || banner.type || 'BANNER'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDeleteBanner(banner.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                    >
                                                        <X className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Reset Confirmation Modal */}
                {showResetConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <X className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="font-black text-xl text-gray-900 mb-2 text-center">배너 설정을 초기화할까요?</h3>
                            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
                                등록된 <strong>모든 커스텀 배너 이미지</strong>가 삭제됩니다. 유튜브 광고 링크 등 다른 설정은 유지됩니다.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowResetConfirm(false)}
                                    className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const resetConfig = {
                                                ...config,
                                                customBanners: [],
                                                bannerSource: 'admob' as const
                                            };
                                            await db.saveAdConfig(resetConfig);
                                            setShowResetConfirm(false);
                                            window.location.reload();
                                        } catch (e: any) {
                                            alert("초기화 실패: " + (e.message || e));
                                            setShowResetConfirm(false);
                                        }
                                    }}
                                    className="flex-1 py-3 text-white font-bold bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-200 transition-all"
                                >
                                    배너만 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Individual Banner Deletion Modal */}
                {bannerToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 text-center">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <X className="w-8 h-8 text-red-600" />
                            </div>
                            <h3 className="font-black text-xl text-gray-900 mb-2">이 배너를 삭제할까요?</h3>
                            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                선택한 배너가 광고 목록에서 제거됩니다.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setBannerToDelete(null)}
                                    className="flex-1 py-3 text-gray-500 font-bold bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={confirmDeleteBanner}
                                    className="flex-1 py-3 text-white font-bold bg-red-500 hover:bg-red-600 rounded-xl shadow-lg shadow-red-200 transition-all"
                                >
                                    삭제하기
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview Image Modal */}
                {selectedImage && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                        <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
                            <img
                                src={selectedImage}
                                alt="Full Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
                            />
                            <button
                                onClick={() => setSelectedImage(null)}
                                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
                            >
                                <X className="w-8 h-8" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // AdPerformanceView Component
    const AdPerformanceView = () => {
        const [period, setPeriod] = useState<'week' | 'month' | '6month' | 'year' | 'custom'>('week');
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');
        const [statsData, setStatsData] = useState<any[]>([]);
        const [loading, setLoading] = useState(false);

        useEffect(() => {
            if (period === 'custom') return;

            const end = new Date();
            const start = new Date();

            switch (period) {
                case 'week': start.setDate(end.getDate() - 7); break;
                case 'month': start.setMonth(end.getMonth() - 1); break;
                case '6month': start.setMonth(end.getMonth() - 6); break;
                case 'year': start.setFullYear(end.getFullYear() - 1); break;
            }

            setEndDate(end.toISOString().split('T')[0]);
            setStartDate(start.toISOString().split('T')[0]);
        }, [period]);

        useEffect(() => {
            const fetchStats = async () => {
                setLoading(true);
                try {
                    let days = 7;
                    if (period === 'month') days = 30;
                    if (period === '6month') days = 180;
                    if (period === 'year') days = 365;

                    // Note: Custom date range is harder with getAdStatsBreakdown fixed logic, 
                    // for now map period to approximate days or implement range support in db service.
                    // Let's stick to days logic for simplicity as requested 'Stack Graph' usually implies recent trends.

                    const data = await db.getAdStatsBreakdown(days);
                    console.log('📊 AdStats Data:', data);
                    setStatsData(data);
                } finally {
                    setLoading(false);
                }
            };
            fetchStats();
        }, [period, startDate, endDate]); // Keeping deps to trigger reload but logic uses days

        const totalViews = statsData.reduce((acc, curr) => acc + (curr.myPage || 0) + (curr.unlock || 0) + (curr.review || 0), 0);

        return (
            <div className="space-y-4">
                {/* Period Selector */}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                            { value: 'week', label: '1주일' },
                            { value: 'month', label: '1개월' },
                            { value: '6month', label: '6개월' },
                            { value: 'year', label: '1년' },
                        ].map(p => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value as any)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${period === p.value ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button
                            onClick={() => setPeriod('custom')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${period === 'custom' ? 'bg-amber-100 text-amber-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                        >
                            직접 설정
                        </button>
                    </div>

                    {/* Custom Date Range Picker */}
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setPeriod('custom'); }}
                            className="bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                        />
                        <span className="text-gray-400">~</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setPeriod('custom'); }}
                            className="bg-white border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:border-amber-500"
                        />
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">기간 내 총 시청</div>
                        <div className="text-2xl font-black text-amber-500">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : totalViews.toLocaleString()}회
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">일 평균 시청</div>
                        <div className="text-2xl font-black text-gray-900">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (statsData.length ? Math.round(totalViews / statsData.length).toLocaleString() : 0)}회
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <div className="text-xs text-gray-500 mb-1">최고 시청일</div>
                        <div className="text-lg font-bold text-gray-900">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                statsData.length > 0
                                    ? statsData.reduce((max, curr) => {
                                        const currTotal = (curr.myPage || 0) + (curr.unlock || 0) + (curr.review || 0);
                                        const maxTotal = (max.myPage || 0) + (max.unlock || 0) + (max.review || 0);
                                        return currTotal > maxTotal ? curr : max;
                                    }, statsData[0]).date
                                    : '-'
                            )}
                        </div>
                        <div className="text-xs text-amber-500 font-bold">
                            {statsData.length > 0 ? (
                                Math.max(...statsData.map(s => (s.myPage || 0) + (s.unlock || 0) + (s.review || 0))).toLocaleString() + '회'
                            ) : ''}
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="mb-6">
                        <h3 className="font-bold text-gray-900">광고 시청 유형별 추이</h3>
                    </div>
                    {loading ? (
                        <div className="h-48 flex items-center justify-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <span className="sr-only">로딩 중...</span>
                        </div>
                    ) : (
                        <div className="h-64 section-chart" style={{ minHeight: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        tickFormatter={(val) => val.slice(5)}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Bar dataKey="myPage" name="마이페이지(충전)" stackId="a" fill="#FBBF24" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="unlock" name="화장실 열람" stackId="a" fill="#60A5FA" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="review" name="리뷰 보상" stackId="a" fill="#F472B6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Render appropriate sub-component based on subSection
    if (subSection === '' || subSection === 'ad-config') return <AdManagementView />;
    if (subSection === 'ad-performance') return <AdPerformanceView />;

    return null;
};

export default AdManagement;
