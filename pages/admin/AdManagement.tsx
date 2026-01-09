import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AdConfig, DailyStats, CustomBannerType } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AdManagementProps {
    subSection: string;
    refreshTrigger: number;
}

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
                    if (!cfg.youtubeUrls || cfg.youtubeUrls.length !== 5) {
                        cfg.youtubeUrls = ['', '', '', '', ''];
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

        // Generic Save
        const saveConfig = async (newConfig: AdConfig) => {
            setConfig(newConfig);
            try {
                await db.saveAdConfig(newConfig);
            } catch (e: any) {
                console.error("Failed to save ad config", e);
                alert('설정 저장 중 오류가 발생했습니다. (이미지 용량 초과 등)\n' + (e.message || e));
            }
        };

        const handleYoutubeUrlChange = (index: number, url: string) => {
            const newUrls = [...config.youtubeUrls];
            newUrls[index] = url.trim();
            saveConfig({ ...config, youtubeUrls: newUrls });
        };

        const handleClearYoutubeUrl = (index: number) => {
            const newUrls = [...config.youtubeUrls];
            newUrls[index] = '';
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

                        if (ratio < 5) {
                            setRatioError(`비율 알림 (${ratio.toFixed(1)}:1). 이 이미지는 하단 바 등 가로가 긴 영역에는 노출되지 않고, 모달 등 적절한 위치에서만 사용됩니다.`);
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

                {/* SECTION 0.1: AdMob IDs (Production) */}
                {!config.testMode && (
                    <section className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 border-b pb-2 border-gray-200">
                            <h2 className="text-xl font-black text-gray-900">0.1. 광고 단위 ID 설정</h2>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Banner ID (하단/지도상단)</label>
                                    <input
                                        type="text"
                                        value={config.adMobIds?.banner || ''}
                                        onChange={e => setConfig({ ...config, adMobIds: { ...config.adMobIds, banner: e.target.value } })}
                                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50 from-neutral-50"
                                        placeholder="ca-app-pub-..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Native ID (목록/모달)</label>
                                    <input
                                        type="text"
                                        value={config.adMobIds?.native || ''}
                                        onChange={e => setConfig({ ...config, adMobIds: { ...config.adMobIds, native: e.target.value } })}
                                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                                        placeholder="ca-app-pub-..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Interstitial ID (화면전환)</label>
                                    <input
                                        type="text"
                                        value={config.adMobIds?.interstitial || ''}
                                        onChange={e => setConfig({ ...config, adMobIds: { ...config.adMobIds, interstitial: e.target.value } })}
                                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                                        placeholder="ca-app-pub-..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Reward ID (무료충전소)</label>
                                    <input
                                        type="text"
                                        value={config.adMobIds?.reward || ''}
                                        onChange={e => setConfig({ ...config, adMobIds: { ...config.adMobIds, reward: e.target.value } })}
                                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                                        placeholder="ca-app-pub-..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">Reward Int. ID (비밀번호)</label>
                                    <input
                                        type="text"
                                        value={config.adMobIds?.rewardInterstitial || ''}
                                        onChange={e => setConfig({ ...config, adMobIds: { ...config.adMobIds, rewardInterstitial: e.target.value } })}
                                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                                        placeholder="ca-app-pub-..."
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500">App Open ID (앱실행)</label>
                                    <input
                                        type="text"
                                        value={config.adMobIds?.appOpen || ''}
                                        onChange={e => setConfig({ ...config, adMobIds: { ...config.adMobIds, appOpen: e.target.value } })}
                                        className="w-full p-2 border rounded font-mono text-sm bg-gray-50"
                                        placeholder="ca-app-pub-..."
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button onClick={() => saveConfig(config)} className="px-4 py-2 bg-gray-800 text-white rounded font-bold text-sm">설정 저장</button>
                            </div>
                        </div>
                    </section>
                )}

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
                                    onClick={() => saveConfig({ ...config, interstitialSource: 'admob' })}
                                    className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${config.interstitialSource === 'admob' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    <span>AdMob (앱 광고)</span>
                                    <span className="text-xs font-normal opacity-70">수익 창출 가능</span>
                                </button>
                                <button
                                    onClick={() => saveConfig({ ...config, interstitialSource: 'youtube' })}
                                    className={`flex-1 py-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-1 ${config.interstitialSource === 'youtube' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                                >
                                    <span>YouTube 영상</span>
                                    <span className="text-xs font-normal opacity-70">정보 제공 / 홍보용</span>
                                </button>
                            </div>
                        </div>

                        {/* YouTube Settings */}
                        {config.interstitialSource === 'youtube' && (
                            <div className="glass-panel p-4 rounded-xl bg-red-50/50 border border-red-100">
                                <h3 className="font-bold text-gray-900 mb-2 text-sm flex items-center gap-2">YouTube 재생 목록 <span className="text-[10px] font-normal text-red-500 bg-red-100 px-2 py-0.5 rounded-full">5초 후 닫기 버튼 생성됨</span></h3>
                                <div className="space-y-2">
                                    {config.youtubeUrls.map((url, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <span className="text-gray-400 font-bold w-4 text-center text-xs">{index + 1}</span>
                                            <input
                                                type="text"
                                                placeholder="https://youtu.be/..."
                                                className="flex-1 p-2 border rounded text-sm focus:border-red-500 outline-none bg-white"
                                                value={url}
                                                onChange={(e) => handleYoutubeUrlChange(index, e.target.value)}
                                            />
                                            {url && (
                                                <button onClick={() => handleClearYoutubeUrl(index)} className="p-2 text-gray-400 hover:text-red-500">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
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
                                - 하단 바/목록 배너: 1080 x 200 px (또는 가로 최소 720px 이상)<br />
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
                                                { id: 'BANNER', label: 'Banner (하단/지도)', desc: '1080x200 (5:1)' },
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
