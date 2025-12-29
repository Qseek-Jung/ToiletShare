import React, { useState, useEffect } from 'react';
import { Upload, Trash2, FileText, Calendar, CheckCircle2, XCircle, Loader2, Eye } from 'lucide-react';
import { AdminToiletUpload } from '../../components/admin/AdminToiletUpload';
import { dbSupabase as db } from '../../services/db_supabase';
import { UploadHistory } from '../../types';

interface BulkUploadPageProps {
    onRefresh: () => void;
}

export const BulkUploadPage: React.FC<BulkUploadPageProps> = ({ onRefresh }) => {
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadHistories, setUploadHistories] = useState<UploadHistory[]>([]);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });
    const [loading, setLoading] = useState(true);

    const loadHistories = async () => {
        setLoading(true);
        try {
            const histories = await db.getUploadHistories();
            setUploadHistories(histories);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadHistories();
    }, []);

    const handleUploadSuccess = async (result: { fileName: string; totalCount: number; successCount: number; addedCount: number; updatedCount: number; failCount: number; uploadedIds: string[]; logs: string[] }) => {
        // Save upload history
        const history: UploadHistory = {
            id: `upload_${Date.now()}`,
            fileName: result.fileName,
            uploadedAt: new Date().toISOString(),
            totalCount: result.totalCount,
            successCount: result.successCount,
            addedCount: result.addedCount,
            updatedCount: result.updatedCount,
            failCount: result.failCount,
            uploadedToiletIds: result.uploadedIds,
            uploadedBy: 'admin',
            logs: result.logs
        };

        await db.saveUploadHistory(history);
        loadHistories();
        setShowUploadModal(false);
        onRefresh();
    };

    const viewLog = (history: UploadHistory) => {
        try {
            if (!history) return;

            const logs = history.logs && Array.isArray(history.logs) ? history.logs : ['(로그 없음)'];
            const content = [
                `파일명: ${history.fileName}`,
                `일시: ${history.uploadedAt}`,
                `---`,
                ...logs
            ].join('\n');

            // Open new window
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>${history.fileName} - 로그 보기</title>
                            <style>
                                body { font-family: monospace; padding: 20px; line-height: 1.5; background: #f9fafb; color: #1f2937; }
                                pre { white-space: pre-wrap; word-break: break-all; }
                                .header { font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 20px; }
                            </style>
                        </head>
                        <body>
                            <div class="header">
                                <h2>업로드 로그 뷰어</h2>
                                <p>파일: ${history.fileName}</p>
                                <p>일시: ${history.uploadedAt}</p>
                            </div>
                            <pre>${content}</pre>
                        </body>
                    </html>
                `);
                newWindow.document.close();
            } else {
                alert('팝업 차단을 해제해주세요.');
            }

        } catch (error) {
            console.error('View log failed', error);
            alert('로그 보기 실패: ' + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleDelete = async (id: string) => {
        setIsDeleting(true);
        setDeleteProgress({ current: 0, total: 0 });

        const history = uploadHistories.find(h => h.id === id);
        if (history) {
            setDeleteProgress({ current: 0, total: history.uploadedToiletIds?.length || 0 });
        }

        await db.deleteUploadHistory(id, (current, total) => {
            setDeleteProgress({ current, total });
        });

        await loadHistories();
        setIsDeleting(false);
        setDeleteId(null);
        onRefresh();
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Upload Button Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">화장실 데이터 일괄 업로드</h3>
                        <p className="text-gray-600 text-sm">
                            CSV 파일을 업로드하여 여러 화장실을 한 번에 등록할 수 있습니다.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
                    >
                        <Upload className="w-5 h-5" />
                        CSV 업로드
                    </button>
                </div>
            </div>

            {/* Upload History List */}
            <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-600" />
                    업로드 히스토리
                </h4>

                {loading ? (
                    <div className="bg-white p-12 rounded-xl border border-gray-100 text-center flex justify-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    </div>
                ) : uploadHistories.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl border border-gray-100 text-center">
                        <Upload className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400">아직 업로드 기록이 없습니다.</p>
                        <p className="text-gray-400 text-sm mt-1">CSV 파일을 업로드하여 시작하세요.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {uploadHistories.map((history) => (
                            <div
                                key={history.id}
                                className="bg-white p-5 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                            <h5 className="font-bold text-gray-900">{history.fileName}</h5>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                            <Calendar className="w-4 h-4" />
                                            <span>{formatDate(history.uploadedAt)}</span>
                                        </div>

                                        <div className="space-y-2">
                                            {/* First row: Total and Success */}
                                            <div className="flex items-center gap-4 text-sm">
                                                <div className="flex items-center gap-1.5 text-gray-700">
                                                    <span className="font-medium">총</span>
                                                    <span className="font-bold text-blue-600">{history.totalCount}개</span>
                                                </div>
                                                <div className="w-px h-4 bg-gray-200"></div>
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span className="font-bold">{history.successCount}개</span>
                                                </div>
                                                <div className="w-px h-4 bg-gray-200"></div>
                                                <div className="flex items-center gap-1.5 text-red-600">
                                                    <XCircle className="w-4 h-4" />
                                                    <span className="font-bold">{history.failCount}개</span>
                                                </div>
                                            </div>
                                            {/* Second row: Breakdown of success */}
                                            <div className="flex items-center gap-3 text-xs pl-1">
                                                <div className="flex items-center gap-1.5 text-emerald-600">
                                                    <span className="font-medium">↳ 신규:</span>
                                                    <span className="font-bold">{history.addedCount}개</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-amber-600">
                                                    <span className="font-medium">덮어쓰기:</span>
                                                    <span className="font-bold">{history.updatedCount}개</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => viewLog(history)}
                                            className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                                            title="로그 보기 (새창)"
                                        >
                                            <Eye className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteId(history.id)}
                                            className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <AdminToiletUpload
                    onSuccess={(result: any) => handleUploadSuccess(result)}
                    onCancel={() => setShowUploadModal(false)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deleteId && !isDeleting && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border-t-4 border-red-500">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-3">업로드 기록을 삭제하시겠습니까?</h3>
                        <p className="text-gray-600 text-sm text-center mb-6">
                            이 작업으로 등록된 모든 화장실이 삭제됩니다.<br />
                            삭제된 데이터는 복구할 수 없습니다.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                            >
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Progress Modal */}
            {isDeleting && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">데이터 삭제 중...</h3>
                            <p className="text-gray-600 text-sm">창을 닫지 마세요.</p>
                        </div>

                        <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                                <span>진행 상황</span>
                                <span className="font-bold text-red-600">{deleteProgress.current} / {deleteProgress.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-red-600 h-full transition-all duration-300"
                                    style={{ width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>

                        <p className="text-center text-sm text-gray-500">
                            {deleteProgress.current === deleteProgress.total && deleteProgress.total > 0
                                ? '삭제가 완료되었습니다.'
                                : `${deleteProgress.current}개 삭제됨...`}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUploadPage;
