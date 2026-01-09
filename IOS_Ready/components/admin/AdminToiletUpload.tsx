import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, Check, FileText, Loader2 } from 'lucide-react';
import { Toilet, Gender } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { geocodeAddressKakao } from '../../services/kakaoGeocoding';
import { MAPS_API_KEY } from '../../config';

interface UploadResult {
    fileName: string;
    totalCount: number;
    successCount: number;
    addedCount: number;
    updatedCount: number;
    failCount: number;
    uploadedIds: string[];
    logs: string[];
}

interface AdminToiletUploadProps {
    onSuccess: (result: UploadResult) => void;
    onCancel: () => void;
}

interface ProcessLog {
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
    timestamp: string;
}

export const AdminToiletUpload: React.FC<AdminToiletUploadProps> = ({ onSuccess, onCancel }) => {
    const [file, setFile] = useState<File | null>(null);
    const [encoding, setEncoding] = useState('UTF-8');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<ProcessLog[]>([]);
    const [uploadedIds, setUploadedIds] = useState<string[]>([]);
    const [processComplete, setProcessComplete] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [adminId, setAdminId] = useState<string>('admin'); // Fallback to 'admin'
    const fileInputRef = useRef<HTMLInputElement>(null);
    const logsRef = useRef<ProcessLog[]>([]); // Ref to hold latest logs for async access

    // Fetch actual admin ID on mount
    React.useEffect(() => {
        db.getAdminAccountId().then(id => {
            if (id && id !== '00000000-0000-0000-0000-000000000000') {
                setAdminId(id);
            }
        });
    }, []);

    const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
        const newLog = {
            message,
            type,
            timestamp: new Date().toLocaleTimeString()
        };

        // Update both Ref (for logic) and State (for UI)
        logsRef.current = [...logsRef.current, newLog];
        setLogs(prev => [...prev, newLog]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.name.endsWith('.csv')) {
                setFile(selectedFile);
            } else {
                alert('CSV 파일만 업로드 가능합니다.');
            }
        }
    };

    const parseCSV = (text: string): any[] => {
        const result = [];
        let currentRecord: string[] = [];
        let currentField = '';
        let inQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (inQuote) {
                if (char === '"') {
                    if (nextChar === '"') {
                        // Escaped quote
                        currentField += '"';
                        i++;
                    } else {
                        // End of quote
                        inQuote = false;
                    }
                } else {
                    currentField += char;
                }
            } else {
                if (char === '"') {
                    inQuote = true;
                } else if (char === ',') {
                    currentRecord.push(currentField.trim());
                    currentField = '';
                } else if (char === '\r' || char === '\n') {
                    currentRecord.push(currentField.trim());
                    if (currentRecord.length > 0 && currentRecord.some(f => f !== '')) {
                        result.push(currentRecord);
                    }
                    currentRecord = [];
                    currentField = '';
                    if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
                } else {
                    currentField += char;
                }
            }
        }

        // Handle last record if not followed by newline
        if (currentField !== '' || currentRecord.length > 0) {
            currentRecord.push(currentField.trim());
            if (currentRecord.some(f => f !== '')) {
                result.push(currentRecord);
            }
        }

        // result[0] is header, rows start from index 1
        return result.slice(1);
    };

    const handleCancelUpload = async () => {
        if (uploadedIds.length === 0) {
            onCancel();
            return;
        }

        setIsCancelling(true);
        setProgress(0);
        setIsCancelling(true);
        setProgress(0);
        setLogs([]);
        logsRef.current = [];
        addLog('취소 프로세스를 시작합니다...', 'warning');

        const total = uploadedIds.length;

        // Optimize cancellation: delete in batches
        const batchSize = 50;
        for (let i = 0; i < total; i += batchSize) {
            const batch = uploadedIds.slice(i, i + batchSize);
            // Not optimal to call deleteToilet in loop if we had bulk delete exposed easily in db wrapper
            // but db.deleteToilet is by ID.
            // Since we added batch logic in db_supabase (deleteToilet is single), let's loop
            // OR we can improvise a bulk delete in db_supabase if needed.
            // For now loop is fine for MVP.
            await Promise.all(batch.map(id => db.deleteToilet(id)));

            const current = Math.min(i + batchSize, total);
            const percentage = Math.floor((current / total) * 100);
            setProgress(percentage);
            addLog(`데이터 삭제 중... (${current}/${total})`, 'warning');
        }

        addLog(`취소 완료! ${total}건의 데이터가 삭제되었습니다.`, 'success');
        setUploadedIds([]);
        setIsCancelling(false);
        setProcessComplete(true);
    };

    const processUpload = async () => {
        if (!file) return;

        setShowProgressModal(true);
        setIsProcessing(true);
        setProcessComplete(false);
        setProgress(0);
        setLogs([]);
        logsRef.current = [];
        setUploadedIds([]);
        addLog('파일을 업로드하고 있습니다...');

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                setProgress(5);
                addLog('📄 파일을 분석중입니다...');

                const rows = parseCSV(text); // Assume header detection is similar to before or simpler
                // Re-using header detection logic from original code if needed or assuming standard
                // For brevity, let's include the header detection logic again or assume simple mapping
                // Since this is a replacement block, I should probably keep the header logic or call a helper.
                // Let's copy the header detection part briefly since it was robust.

                // --- Simple Header Detection reused ---
                const headerRow = rows.length > 0 ? rows[0] : [];
                const lines = text.split(/\r?\n/);
                const headerLine = lines[0] || '';
                const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());

                // --- Header Mapping ---
                let latIndex = headers.findIndex(h => h.includes('WGS84위도') || h.includes('위도') || h.toLowerCase().includes('lat'));
                let lngIndex = headers.findIndex(h => h.includes('WGS84경도') || h.includes('경도') || h.toLowerCase().includes('lng'));
                let nameIndex = headers.findIndex(h => h.includes('화장실명') || h.includes('이름') || h.toLowerCase().includes('name'));
                let roadIndex = headers.findIndex(h => h.includes('도로명') || h.toLowerCase().includes('road'));
                let jibunIndex = headers.findIndex(h => h.includes('지번') || h.toLowerCase().includes('jibun'));
                let typeIndex = headers.findIndex(h => h.includes('구분') || h.toLowerCase().includes('type'));
                let maleStallIndex = headers.findIndex(h => h.includes('남성용-대변기수') || h.includes('남성변기수'));
                let femaleStallIndex = headers.findIndex(h => h.includes('여성용-대변기수') || h.includes('여성변기수'));
                let hoursIndex = headers.findIndex(h => h.includes('개방시간'));
                let memoIndex = headers.findIndex(h => h.includes('메모') || h.toLowerCase().includes('memo'));

                // Detect if this is a "Cleaned" (Standard) CSV with coordinates
                const isFastPath = latIndex !== -1 && lngIndex !== -1;

                if (isFastPath) {
                    addLog('⚡ 지오코딩이 완료된 파일(Fast-Path)로 감지되었습니다. 직접 업로드를 시작합니다.', 'success');
                } else {
                    addLog('🔍 일반 CSV 파일로 감지되었습니다. 지오코딩 및 검토 프로세스를 시작합니다.');
                    // Fallbacks for basic search
                    if (latIndex === -1) latIndex = 7;
                    if (lngIndex === -1) lngIndex = 8;
                }

                if (nameIndex === -1) nameIndex = 1;
                if (roadIndex === -1) roadIndex = 2;
                if (jibunIndex === -1) jibunIndex = 3;
                if (typeIndex === -1) typeIndex = 0;

                addLog(`📋 컬럼 매핑: 이름(${nameIndex}), 주소(${roadIndex}/${jibunIndex}), 좌표(${latIndex},${lngIndex})${isFastPath ? ', 변기수(' + maleStallIndex + '/' + femaleStallIndex + ')' : ''}`);

                const immediateList: Toilet[] = [];
                const stagingList: any[] = []; // items for toilets_bulk

                // Stats
                let countImmediate = 0;
                let countReview = 0;
                let countReject = 0;

                // Create Upload ID (History) first? 
                // We usually save history at the end. But for staging reference we might need an ID.
                // Or we can save history later and update staging items? No, better to have a reference.
                // Let's generate a temporary batch ID or use the same ID logic as history.
                const uploadBatchId = `upload_${Date.now()}`;

                const total = rows.length;
                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                if (isFastPath) {
                    // --- FAST PATH: Direct Mapping ---
                    for (let i = 0; i < total; i++) {
                        try {
                            const row = rows[i];
                            if (row.length < 2) continue;

                            const name = row[nameIndex]?.trim() || '';
                            if (!name) continue;

                            const lat = parseFloat(row[latIndex]?.trim() || '0');
                            const lng = parseFloat(row[lngIndex]?.trim() || '0');
                            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                                // Skip or log silent warning? Let's log to terminal for visibility
                                if (i < 5) addLog(`[누락] ${name}: 좌표 정보가 유효하지 않습니다.`, 'warning');
                                continue;
                            }

                            const address = (row[roadIndex] || row[jibunIndex] || '').trim();
                            const maleStalls = row[maleStallIndex]?.trim() || '';
                            const femaleStalls = row[femaleStallIndex]?.trim() || '';
                            const hours = row[hoursIndex]?.trim() || '';
                            const memo = row[memoIndex]?.trim() || '';

                            let note = '';
                            if (maleStalls) note += `남성변기: ${maleStalls} `;
                            if (femaleStalls) note += `여성변기: ${femaleStalls} `;
                            if (hours) note += `\n개방시간: ${hours}`;
                            if (memo) note += `\n${memo}`;

                            const toiletId = `t_${uploadBatchId}_${i}`;
                            const toilet: Toilet = {
                                id: toiletId,
                                name,
                                address,
                                lat,
                                lng,
                                type: 'public',
                                genderType: Gender.UNISEX,
                                floor: 1,
                                hasPassword: false,
                                cleanliness: 3,
                                hasBidet: false,
                                hasPaper: false,
                                stallCount: (parseInt(maleStalls) || 0) + (parseInt(femaleStalls) || 0) || 1,
                                crowdLevel: 'medium',
                                isUnlocked: true,
                                note: note.trim(),
                                createdBy: adminId,
                                source: 'admin',
                                isVerified: true,
                                createdAt: new Date().toISOString()
                            };

                            immediateList.push(toilet);
                            countImmediate++;

                            if (i % 50 === 0) setProgress(10 + Math.floor((i / total) * 80));
                        } catch (err) {
                            console.error(`FastPath Row ${i} Error:`, err);
                        }
                    }
                } else {
                    // --- STANDARD PATH: Geocoding & Validation ---
                    const { validateBulkItem, parseBulkRow } = await import('../../utils/bulkRules');
                    addLog('🔄 데이터 검증 및 분류 중...');

                    for (let i = 0; i < total; i++) {
                        try {
                            const row = rows[i];
                            if (row.length < 2) continue;

                            const nameRaw = row[nameIndex]?.trim() || '';
                            if (!nameRaw) continue;

                            const roadAddr = row[roadIndex]?.trim() || '';
                            const jibunAddr = row[jibunIndex]?.trim() || '';
                            const addressRaw = roadAddr || jibunAddr || '';

                            const latRaw = parseFloat(row[latIndex]?.trim() || '0');
                            const lngRaw = parseFloat(row[lngIndex]?.trim() || '0');
                            const memo = row[memoIndex]?.trim() || '';

                            const parsed = parseBulkRow(nameRaw, addressRaw);
                            let isOnLand = false;
                            if (latRaw !== 0 && lngRaw !== 0) {
                                if (latRaw >= 33 && latRaw <= 43 && lngRaw >= 124 && lngRaw <= 132) {
                                    isOnLand = await db.checkIsOnLand(latRaw, lngRaw);
                                }
                            }

                            let kakaoResult = null;
                            if (parsed.address) {
                                kakaoResult = await geocodeAddressKakao(parsed.address);
                                await delay(100);
                            }

                            const result = validateBulkItem(parsed, latRaw, lngRaw, kakaoResult, isOnLand);

                            if (result.action === 'immediate') {
                                const toiletId = `t_${uploadBatchId}_${i}`;
                                immediateList.push({
                                    id: toiletId,
                                    name: result.name,
                                    address: result.address,
                                    lat: result.lat,
                                    lng: result.lng,
                                    type: 'public',
                                    genderType: Gender.UNISEX,
                                    floor: result.floor,
                                    hasPassword: false, cleanliness: 3, hasBidet: false, hasPaper: false,
                                    stallCount: 1, crowdLevel: 'medium', isUnlocked: true,
                                    note: memo,
                                    createdBy: adminId,
                                    source: 'admin',
                                    isVerified: true,
                                    createdAt: new Date().toISOString()
                                } as Toilet);
                                countImmediate++;
                                addLog(`[즉시등록] ${result.name} - ${result.reason}`, 'success');
                            } else if (result.action === 'review') {
                                stagingList.push({
                                    upload_id: uploadBatchId,
                                    name_raw: nameRaw, address_raw: addressRaw,
                                    lat_raw: latRaw, lng_raw: lngRaw,
                                    name: result.name, address: result.address,
                                    lat: result.lat, lng: result.lng, floor: result.floor,
                                    status: 'review_needed', reason: result.reason, logs: result.logs
                                });
                                countReview++;
                                addLog(`[검수필요] ${result.name} - ${result.reason}`, 'warning');
                            } else {
                                stagingList.push({
                                    upload_id: uploadBatchId,
                                    name_raw: nameRaw, address_raw: addressRaw,
                                    lat_raw: latRaw, lng_raw: lngRaw,
                                    name: result.name, address: result.address,
                                    lat: result.lat, lng: result.lng, floor: result.floor,
                                    status: 'rejected', reason: result.reason, logs: result.logs
                                });
                                countReject++;
                                addLog(`[등록불가] ${result.name} - ${result.reason}`, 'error');
                            }

                            if (i % 5 === 0) setProgress(10 + Math.floor((i / total) * 80));
                        } catch (rowError) {
                            console.error(`Standard Row ${i} Error:`, rowError);
                        }
                    }
                }

                // --- Final Batch Save ---
                setProgress(90);
                const chunk = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

                if (immediateList.length > 0) {
                    addLog(`🚀 즉시 등록 대상 ${immediateList.length}건 저장 중...`);
                    const batches = chunk(immediateList, 50);
                    for (const b of batches) await db.bulkAddToilets(b);
                }

                if (stagingList.length > 0) {
                    addLog(`🧐 검수 대상 ${stagingList.length}건 임시 저장 중...`);
                    const batches = chunk(stagingList, 50);
                    for (const b of batches) await db.bulkSaveStaging(b);
                }

                const uploadedIdsList = immediateList.map(t => t.id);

                await db.saveUploadHistory({
                    id: uploadBatchId,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString(),
                    totalCount: total,
                    successCount: countImmediate,
                    addedCount: countImmediate,
                    updatedCount: 0,
                    failCount: countReject + countReview,
                    uploadedToiletIds: uploadedIdsList,
                    uploadedBy: adminId,
                    logs: logsRef.current.map(l => l.message)
                });

                setProgress(100);
                setProcessComplete(true);
                setIsProcessing(false);

                addLog(`\n🏁 처리 완료!`, 'success');
                if (isFastPath) {
                    addLog(`  - 총 업로드: ${countImmediate}건`, 'success');
                } else {
                    addLog(`  - 즉시 등록: ${countImmediate}건`, 'success');
                    addLog(`  - 검수 필요: ${countReview}건 (리뷰 페이지에서 확인)`, 'warning');
                    addLog(`  - 등록 불가: ${countReject}건`, 'error');
                }

                onSuccess({
                    fileName: file.name,
                    totalCount: total,
                    successCount: countImmediate,
                    addedCount: countImmediate,
                    updatedCount: 0,
                    failCount: countReject + countReview,
                    uploadedIds: uploadedIdsList,
                    logs: logsRef.current.map(l => l.message)
                });

            } catch (err) {
                console.error(err);
                addLog(`CRITICAL ERROR: ${err}`, 'error');
                setIsProcessing(false);
            }
        };

        reader.readAsText(file, encoding);
    };

    const chunk = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

    return (
        <>
            {/* File Selection Modal */}
            {!showProgressModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                화장실 데이터 일괄 업로드
                            </h3>
                            <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                                {file ? (
                                    <>
                                        <FileText className="w-12 h-12 text-blue-500 mb-3" />
                                        <p className="font-bold text-gray-900">{file.name}</p>
                                        <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                        <p className="font-bold text-gray-700">CSV 파일 선택</p>
                                    </>
                                )}
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl">
                                <label className="block text-sm font-bold text-gray-700 mb-2">파일 인코딩</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="encoding" value="UTF-8" checked={encoding === 'UTF-8'} onChange={(e) => setEncoding(e.target.value)} />
                                        <span className="text-sm">UTF-8</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="encoding" value="EUC-KR" checked={encoding === 'EUC-KR'} onChange={(e) => setEncoding(e.target.value)} />
                                        <span className="text-sm">EUC-KR (엑셀)</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button onClick={onCancel} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                                취소
                            </button>
                            <button onClick={processUpload} disabled={!file} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
                                업로드 시작
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Modal */}
            {showProgressModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Upload className="w-5 h-5 text-blue-600" />
                                {isCancelling ? '취소 처리 중' : isProcessing ? '업로드 처리 중' : '처리 완료'}
                            </h3>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="text-center py-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4 relative">
                                    {(isProcessing || isCancelling) && progress < 100 ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <Check className="w-8 h-8" />
                                    )}
                                    <span className="absolute -bottom-8 font-black text-xl text-blue-600">{progress}%</span>
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mt-6">
                                    {isCancelling ? '데이터 삭제 중...' : isProcessing ? '데이터 처리 중...' : '작업 완료'}
                                </h4>
                                {(isProcessing || isCancelling) && <p className="text-sm text-gray-500">창을 닫지 마세요.</p>}
                            </div>

                            <div className="bg-gray-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
                                {logs.map((log, index) => (
                                    <div key={index} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' :
                                        log.type === 'success' ? 'text-green-400' :
                                            log.type === 'warning' ? 'text-amber-400' : 'text-gray-300'
                                        }`}>
                                        <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                                        <span>{log.message}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            {!processComplete && (
                                <button
                                    onClick={handleCancelUpload}
                                    disabled={isCancelling}
                                    className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCancelling ? '취소 중...' : '취소하기'}
                                </button>
                            )}
                            {processComplete && (
                                <button
                                    onClick={onCancel}
                                    className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
                                >
                                    확인
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
