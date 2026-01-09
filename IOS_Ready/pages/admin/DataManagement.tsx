import React, { useState, useEffect, useRef } from 'react';
import { BarChart3, AlertTriangle, Check, Trash2, Upload, Loader2, Download, Database } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { AdminToiletUpload } from '../../components/admin/AdminToiletUpload';

interface DataManagementProps {
    setRefreshTrigger: (cb: (prev: number) => number) => void;
}

export const DataManagement: React.FC<DataManagementProps> = ({ setRefreshTrigger }) => {
    const [dataStats, setDataStats] = useState({ toilets: 0, reviews: 0, users: 0 });
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingStats, setLoadingStats] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const loadStats = async () => {
        setLoadingStats(true);
        try {
            const stats = await db.getDataStats();
            setDataStats(stats);
        } finally {
            setLoadingStats(false);
        }
    };

    useEffect(() => {
        loadStats();
    }, []);

    const handleDownloadBackup = async () => {
        setLoading(true);
        try {
            const jsonString = await db.downloadBackup();
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `share_toilet_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('백업 파일이 다운로드되었습니다!');
        } catch (e) {
            console.error(e);
            alert('백업 다운로드 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const result = await db.importData(content);

                if (result.success) {
                    setRefreshTrigger(prev => prev + 1);
                    await loadStats();
                    alert(result.message);
                } else {
                    alert('오류: ' + result.message);
                }
            } catch (err) {
                console.error(err);
                alert('데이터 가져오기 실패');
            } finally {
                setLoading(false);
                // Reset input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleClearAllData = async () => {
        if (confirm('⚠️ 경고!\n\n모든 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.\n\n정말 진행하시겠습니까?')) {
            if (confirm('정말로 모든 데이터를 삭제하시겠습니까?\n\n마지막 확인입니다.')) {
                setLoading(true);
                try {
                    await db.clearAllData();
                    setRefreshTrigger(prev => prev + 1);
                    await loadStats();
                    alert('모든 데이터가 삭제되었습니다.');
                } catch (e) {
                    console.error(e);
                    alert('데이터 삭제 실패');
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleGenerateSample = async (type: 'bundang' | 'seoul') => {
        setLoading(true);
        try {
            let result;
            if (type === 'bundang') {
                result = await db.generateSampleData();
            } else {
                result = await db.generateSeoulData();
            }

            setRefreshTrigger(prev => prev + 1);
            await loadStats();
            alert(result.message);
        } catch (e) {
            console.error(e);
            alert('샘플 데이터 생성 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleMigrateFromLocalStorage = async () => {
        if (!confirm('로컬 스토리지의 데이터를 Supabase로 마이그레이션 하시겠습니까?\n이 작업은 기존 로컬 데이터를 Supabase DB에 병합합니다.')) return;

        setLoading(true);
        try {
            const toilets = JSON.parse(localStorage.getItem('db_toilets_v2') || '[]');
            const reviews = JSON.parse(localStorage.getItem('db_reviews_v2') || '[]');
            const users = JSON.parse(localStorage.getItem('db_users_v2') || '[]');

            if (toilets.length === 0 && reviews.length === 0 && users.length === 0) {
                alert('로컬 스토리지에 데이터가 없습니다.');
                setLoading(false);
                return;
            }

            const migrationData = {
                toilets,
                reviews,
                users
            };

            const result = await db.importData(JSON.stringify(migrationData));
            alert(result.message);
            setRefreshTrigger(prev => prev + 1);
            await loadStats();
        } catch (e) {
            console.error(e);
            alert('마이그레이션 실패: ' + (e as any).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                        <p className="font-bold text-gray-700">처리 중입니다...</p>
                    </div>
                </div>
            )}

            {/* Data Statistics */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    현재 데이터 현황
                </h3>
                {loadingStats ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-black text-blue-600">{dataStats.toilets}</div>
                            <div className="text-xs text-gray-600 mt-1">화장실</div>
                        </div>
                        <div className="text-center p-3 bg-amber-50 rounded-lg">
                            <div className="text-2xl font-black text-amber-600">{dataStats.reviews}</div>
                            <div className="text-xs text-gray-600 mt-1">리뷰</div>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-black text-green-600">{dataStats.users}</div>
                            <div className="text-xs text-gray-600 mt-1">회원</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Backup & Restore */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">백업 및 복원</h3>
                <div className="flex flex-col md:flex-row gap-3">
                    <button
                        onClick={handleDownloadBackup}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Download className="w-5 h-5" />
                        데이터 백업 다운로드
                    </button>

                    <div className="flex-1">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImportData}
                            className="hidden"
                            id="import-file"
                            disabled={loading}
                        />
                        <label
                            htmlFor="import-file"
                            className={`w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 cursor-pointer ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Check className="w-5 h-5" />
                            백업 파일 불러오기
                        </label>
                    </div>

                    {/* Bulk Upload Button */}
                    <div className="flex-1">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            disabled={loading}
                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Upload className="w-5 h-5" />
                            CSV 일괄 업로드
                        </button>
                    </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                    💡 팁: 코드 수정 전에 백업을 받아두면 데이터 손실을 방지할 수 있습니다.
                </p>

                {showUploadModal && (
                    <AdminToiletUpload
                        onSuccess={async () => {
                            setShowUploadModal(false);
                            setRefreshTrigger(prev => prev + 1);
                            await loadStats();
                        }}
                        onCancel={() => setShowUploadModal(false)}
                    />
                )}
            </div>

            {/* Migration from LocalStorage */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-600" />
                    데이터 마이그레이션
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    기존 로컬 브라우저 저장소(LocalStorage)에 있는 데이터를 Supabase 데이터베이스로 이전합니다.
                </p>
                <button
                    onClick={handleMigrateFromLocalStorage}
                    disabled={loading}
                    className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Upload className="w-5 h-5" />
                    로컬 데이터 → Supabase 업로드
                </button>
            </div>

            {/* Sample Data Generation */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-indigo-600" />
                    샘플 데이터 생성
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    테스트를 위해 경기도 성남시 분당구와 연천군 연천읍에 각각 50개의 화장실 데이터를 생성합니다.
                </p>
                <button
                    onClick={() => handleGenerateSample('bundang')}
                    disabled={loading}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Check className="w-5 h-5" />
                    분당/연천 샘플 데이터 생성 (100개)
                </button>
                <button
                    onClick={() => handleGenerateSample('seoul')}
                    disabled={loading}
                    className="w-full mt-3 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Check className="w-5 h-5" />
                    서울 전역 샘플 데이터 생성 (1000개)
                </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 p-4 rounded-xl border-2 border-red-200">
                <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    위험 구역
                </h3>
                <p className="text-xs text-red-600 mb-3">이 작업은 되돌릴 수 없습니다!</p>
                <button
                    onClick={handleClearAllData}
                    disabled={loading}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Trash2 className="w-5 h-5" />
                    모든 데이터 삭제
                </button>
            </div>
        </div>
    );
};

export default DataManagement;
