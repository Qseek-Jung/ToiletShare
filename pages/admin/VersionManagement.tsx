import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Smartphone, CheckCircle, AlertCircle, Apple } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { VersionPolicy, VersionInfo } from '../../types';

export const VersionManagement: React.FC = () => {
    const [policy, setPolicy] = useState<VersionPolicy | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const loadPolicy = async () => {
        setLoading(true);
        try {
            const data = await db.getVersionPolicy();
            setPolicy(data);
        } catch (e) {
            console.error(e);
            alert('설정을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicy();
    }, []);

    const handleSave = async () => {
        if (!policy) return;
        setSaving(true);
        try {
            await db.saveVersionPolicy(policy);
            alert('버전 정책이 저장되었습니다. 앱을 재시작하면 반영됩니다.');
        } catch (e) {
            console.error(e);
            alert('저장 실패');
        } finally {
            setSaving(false);
        }
    };

    const updateAndroid = (updates: Partial<VersionInfo>) => {
        if (!policy) return;
        setPolicy({ ...policy, android: { ...policy.android, ...updates } });
    };

    const updateIOS = (updates: Partial<VersionInfo>) => {
        if (!policy) return;
        setPolicy({ ...policy, ios: { ...policy.ios, ...updates } });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">로딩 중...</div>;
    if (!policy) return <div className="p-8 text-center text-red-500">데이터를 불러올 수 없습니다.</div>;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <RefreshCw className="w-6 h-6 text-blue-600" />
                            앱 버전 관리
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">
                            앱 실행 시 강제 업데이트 또는 권장 업데이트를 띄울 수 있습니다.
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-300 transition-colors"
                    >
                        {saving ? '저장 중...' : '설정 저장'}
                        <Save className="w-4 h-4" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Android Config */}
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-green-700">
                            <Smartphone className="w-5 h-5" />
                            Android 설정
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">최신 버전 (Latest Version)</label>
                                <input
                                    type="text"
                                    value={policy.android.latestVersion}
                                    onChange={(e) => updateAndroid({ latestVersion: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="예: 1.0.2"
                                />
                                <p className="text-xs text-gray-500 mt-1">이 버전보다 낮으면 업데이트 권장 모달 표시</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">최소 지원 버전 (Min Version)</label>
                                <input
                                    type="text"
                                    value={policy.android.minVersion}
                                    onChange={(e) => updateAndroid({ minVersion: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm border-red-200 bg-red-50"
                                    placeholder="예: 1.0.0"
                                />
                                <p className="text-xs text-red-500 mt-1">이 버전보다 낮으면 <strong>강제 업데이트</strong> 모달 표시 (앱 사용 불가)</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">스토어 URL</label>
                                <input
                                    type="text"
                                    value={policy.android.storeUrl}
                                    onChange={(e) => updateAndroid({ storeUrl: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm text-gray-600"
                                    placeholder="market://details?id=..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">업데이트 안내 메시지</label>
                                <textarea
                                    value={policy.android.updateMessage}
                                    onChange={(e) => updateAndroid({ updateMessage: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm h-20"
                                    placeholder="모달에 띄울 메시지 내용"
                                />
                            </div>
                        </div>
                    </div>

                    {/* iOS Config */}
                    <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                            <Apple className="w-5 h-5" />
                            iOS 설정
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">최신 버전 (Latest Version)</label>
                                <input
                                    type="text"
                                    value={policy.ios.latestVersion}
                                    onChange={(e) => updateIOS({ latestVersion: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm"
                                    placeholder="예: 1.0.2"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">최소 지원 버전 (Min Version)</label>
                                <input
                                    type="text"
                                    value={policy.ios.minVersion}
                                    onChange={(e) => updateIOS({ minVersion: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm border-red-200 bg-red-50"
                                    placeholder="예: 1.0.0"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">스토어 URL</label>
                                <input
                                    type="text"
                                    value={policy.ios.storeUrl}
                                    onChange={(e) => updateIOS({ storeUrl: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm text-gray-600"
                                    placeholder="https://apps.apple.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">업데이트 안내 메시지</label>
                                <textarea
                                    value={policy.ios.updateMessage}
                                    onChange={(e) => updateIOS({ updateMessage: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm h-20"
                                    placeholder="모달에 띄울 메시지 내용"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 bg-blue-50 p-4 rounded-xl text-sm text-blue-800 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">버전 체크 동작 원리</p>
                        <ul className="list-disc pl-4 mt-1 space-y-1">
                            <li><strong>강제 업데이트</strong>: 현재 앱 버전 &lt; 최소 지원 버전 (앱 진입 불가)</li>
                            <li><strong>권장 업데이트</strong>: 현재 앱 버전 &lt; 최신 버전 (하루 동안 닫기 가능)</li>
                            <li>버전 비교는 <code>X.Y.Z</code> 형식의 Semver (Semantic Versioning) 방식을 따릅니다.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
