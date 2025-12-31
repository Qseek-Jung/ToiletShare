import React, { useState, useEffect, useRef } from 'react';
import { dbSupabase as db } from '../../services/db_supabase';
import { Toilet, Gender } from '../../types';
import { Check, X, MapPin, AlertTriangle, Trash2, Edit, ExternalLink, Search, RefreshCw, Save } from 'lucide-react';
import { geocodeAddressKakao } from '../../services/kakaoGeocoding';

interface BulkItem {
    id: string;
    upload_id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    floor: number;
    status: 'review_needed' | 'rejected' | 'done';
    reason: string;
    logs: any[];
    created_at: string;
    name_raw: string;
    address_raw: string;
    lat_raw: number;
    lng_raw: number;
}

export const BulkReviewPage: React.FC = () => {
    const [items, setItems] = useState<BulkItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [uploadIdFilter, setUploadIdFilter] = useState<string | null>(null);

    // Edit Modal State
    const [editingItem, setEditingItem] = useState<BulkItem | null>(null);
    const [editForm, setEditForm] = useState<{ name: string, address: string, lat: number, lng: number, floor: number }>({ name: '', address: '', lat: 0, lng: 0, floor: 1 });
    const [isGeocoding, setIsGeocoding] = useState(false);

    useEffect(() => {
        // Parse URL Query Params for uploadId
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        const uid = params.get('uploadId');
        if (uid) setUploadIdFilter(uid);

        fetchItems(uid);
    }, []);

    const fetchItems = async (uidFilter?: string | null) => {
        setLoading(true);
        const targetId = uidFilter !== undefined ? uidFilter : uploadIdFilter;
        // If targetId is null (explicitly), pass undefined to get default behavior (pending only)
        // If targetId is string, get all for that upload (including rejected)
        const data = await db.getBulkItems(targetId || undefined);
        setItems(data);
        setLoading(false);
    };

    const handleApprove = async (item: BulkItem) => {
        if (!confirm(`"${item.name}"을(를) 정식 서비스에 등록하시겠습니까?`)) return;
        setProcessingId(item.id);

        try {
            // 1. Add to live Toilets table
            const toilet: Toilet = {
                id: `t_bulk_${item.id}`, // Use Staging ID part to ensure uniqueness but track origin
                name: item.name,
                address: item.address,
                lat: item.lat,
                lng: item.lng,
                type: 'public',
                genderType: Gender.UNISEX,
                floor: item.floor || 1,
                hasPassword: false,
                cleanliness: 3,
                hasBidet: false,
                hasPaper: false,
                stallCount: 1,
                crowdLevel: 'medium',
                isUnlocked: true,
                note: `Bulk Upload Reviewed (Origin: ${item.reason})`,
                createdBy: 'admin',
                source: 'admin',
                isVerified: true,
                createdAt: new Date().toISOString()
            };

            const result = await db.bulkAddToilets([toilet]);

            if (result.added > 0 || result.updated > 0) {
                // 2. Mark as Done in Staging
                await db.updateBulkItemStatus(item.id, 'done');
                setItems(prev => prev.filter(i => i.id !== item.id)); // Remove from list
            } else {
                throw new Error('Database insert failed');
            }
        } catch (err) {
            console.error(err);
            alert('등록 중 오류가 발생했습니다.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (item: BulkItem) => {
        if (!confirm(`"${item.name}"을(를) 거절 처리 하시겠습니까?`)) return;
        setProcessingId(item.id);
        try {
            await db.updateBulkItemStatus(item.id, 'rejected');
            // Refresh list or update local state
            // If we are viewing by upload_id, we keep it visible but update status.
            // If viewing pending only, remove it.
            if (uploadIdFilter) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'rejected' } : i));
            } else {
                setItems(prev => prev.filter(i => i.id !== item.id));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (item: BulkItem) => {
        if (!confirm(`"${item.name}"을(를) 완전히 삭제하시겠습니까? (복구 불가)`)) return;
        setProcessingId(item.id);
        try {
            await db.deleteBulkItem(item.id);
            setItems(prev => prev.filter(i => i.id !== item.id));
        } catch (err) {
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const openKakaoMap = (lat: number, lng: number) => {
        window.open(`https://map.kakao.com/link/map/${lat},${lng}`, '_blank');
    };

    const handleEditClick = (item: BulkItem) => {
        setEditingItem(item);
        setEditForm({
            name: item.name,
            address: item.address,
            lat: item.lat,
            lng: item.lng,
            floor: item.floor || 1
        });
    };

    const handleCloseEdit = () => {
        setEditingItem(null);
    };

    const handleAutoGeocoding = async () => {
        if (!editForm.address) return;
        setIsGeocoding(true);
        try {
            const result = await geocodeAddressKakao(editForm.address);
            if (result) {
                setEditForm(prev => ({ ...prev, lat: result.lat, lng: result.lng }));
                alert(`좌표를 찾았습니다!\n${result.lat}, ${result.lng}`);
            } else {
                alert('주소로 좌표를 찾을 수 없습니다.');
            }
        } catch (e) {
            alert('지오코딩 오류');
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editingItem) return;
        try {
            await db.updateBulkItemContent(editingItem.id, editForm);
            // Update local state
            setItems(prev => prev.map(i => i.id === editingItem.id ? { ...i, ...editForm } : i));
            setEditingItem(null);
        } catch (e) {
            alert('저장 실패');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 flex flex-col items-center gap-2"><RefreshCw className="animate-spin" /> 데이터 로딩 중...</div>;

    const pendingItems = items.filter(i => i.status === 'review_needed');
    const logsItems = items; // If filtered by ID, show all. If not, filtered is pending only anyway.

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        대량 업로드 검수
                        {uploadIdFilter && <span className="text-sm font-normal bg-gray-100 px-2 py-1 rounded text-gray-500">Batch: {uploadIdFilter}</span>}
                    </h1>
                </div>
                <div className="flex gap-2">
                    {uploadIdFilter && (
                        <button onClick={() => { setUploadIdFilter(null); fetchItems(null); }} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200">
                            필터 해제
                        </button>
                    )}
                    <button onClick={() => fetchItems()} className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1">
                        <RefreshCw size={16} /> 새로고침
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="grid gap-4">
                {items.length === 0 ? (
                    <div className="p-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        검수할 항목이 없습니다.
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className={`p-4 rounded-xl shadow-sm border flex flex-col md:flex-row gap-4 items-start md:items-center ${item.status === 'rejected' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-blue-100'}`}>
                            {item.status === 'rejected' && (
                                <div className="text-red-500 font-bold text-xs absolute top-4 right-4 md:static md:w-16">
                                    [거절됨]
                                </div>
                            )}

                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-lg">{item.name}</h3>
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">F{item.floor}</span>
                                    {item.status === 'review_needed' && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">검수필요</span>}
                                </div>
                                <p className="text-gray-600 text-sm mb-1">{item.address}</p>
                                <div className="text-xs text-red-500 font-medium bg-red-50 inline-block px-2 py-1 rounded mb-1">
                                    이유: {item.reason}
                                </div>
                                <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                    <span>좌표: {item.lat.toFixed(6)}, {item.lng.toFixed(6)}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 self-end md:self-center">
                                <button
                                    onClick={() => openKakaoMap(item.lat, item.lng)}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded tooltip"
                                    title="지도 확인"
                                >
                                    <MapPin size={20} />
                                </button>
                                <button
                                    onClick={() => handleEditClick(item)}
                                    disabled={processingId === item.id}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded tooltip"
                                    title="수정"
                                >
                                    <Edit size={20} />
                                </button>

                                <div className="w-px h-8 bg-gray-200 mx-1"></div>

                                {item.status !== 'rejected' && (
                                    <button
                                        onClick={() => handleReject(item)}
                                        disabled={processingId === item.id}
                                        className="px-3 py-1.5 border border-red-200 text-red-600 rounded hover:bg-red-50 text-sm font-medium"
                                    >
                                        거절
                                    </button>
                                )}

                                <button
                                    onClick={() => handleApprove(item)}
                                    disabled={processingId === item.id}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                    <Check size={16} /> 승인
                                </button>

                                {item.status === 'rejected' && (
                                    <button
                                        onClick={() => handleDelete(item)}
                                        disabled={processingId === item.id}
                                        className="p-2 text-gray-400 hover:text-red-600 rounded"
                                        title="완전 삭제"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6">
                        <div className="flex justify-between items-center mb-6 border-b pb-4">
                            <h3 className="text-xl font-bold">항목 수정</h3>
                            <button onClick={handleCloseEdit} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">이름</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    value={editForm.name}
                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">주소</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 border rounded-lg p-2"
                                        value={editForm.address}
                                        onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                                    />
                                    <button
                                        onClick={handleAutoGeocoding}
                                        disabled={isGeocoding}
                                        className="px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm whitespace-nowrap"
                                    >
                                        좌표 찾기
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">위도 (Lat)</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        className="w-full border rounded-lg p-2"
                                        value={editForm.lat}
                                        onChange={e => setEditForm({ ...editForm, lat: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">경도 (Lng)</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        className="w-full border rounded-lg p-2"
                                        value={editForm.lng}
                                        onChange={e => setEditForm({ ...editForm, lng: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="text-right">
                                <button
                                    onClick={() => openKakaoMap(editForm.lat, editForm.lng)}
                                    className="text-sm text-blue-600 hover:underline flex items-center justify-end gap-1"
                                >
                                    <ExternalLink size={14} /> 현재 좌표 지도에서 확인
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">층수</label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg p-2"
                                    value={editForm.floor}
                                    onChange={e => setEditForm({ ...editForm, floor: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3 pt-4 border-t">
                            <button onClick={handleCloseEdit} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl">
                                취소
                            </button>
                            <button onClick={handleSaveEdit} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2">
                                <Save size={18} /> 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
