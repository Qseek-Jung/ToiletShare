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
                const headerRow = rows.length > 0 ? rows[0] : []; // Actually rows[0] from parseCSV is data if we sliced. 
                // parseCSV implementation in original code: "return result.slice(1)".
                // So I need to parse the first line manually or just trust index. 
                // Wait, original parseCSV logic separated header? 
                // Ah, code said: "result[0] is header, rows start from index 1".
                // But the helper `parseCSV` returned `result.slice(1)`. So header is lost?
                // Actually `headerFound` was detected in the manual loop before calling parseCSV in the original code.
                // I should probably fix parseCSV to return (header, data) or just do it here.

                // Let's assume standard columns or quick re-parse for header:
                const lines = text.split(/\r?\n/);
                const headerLine = lines[0] || '';
                const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim());

                let latIndex = headers.findIndex(h => h.includes('위도') || h.toLowerCase().includes('lat'));
                let lngIndex = headers.findIndex(h => h.includes('경도') || h.toLowerCase().includes('lng'));
                let nameIndex = headers.findIndex(h => h.includes('화장실명') || h.includes('이름') || h.toLowerCase().includes('name'));
                let roadIndex = headers.findIndex(h => h.includes('도로명') || h.toLowerCase().includes('road'));
                let jibunIndex = headers.findIndex(h => h.includes('지번') || h.toLowerCase().includes('jibun'));
                let typeIndex = headers.findIndex(h => h.includes('구분') || h.toLowerCase().includes('type'));
                let memoIndex = headers.findIndex(h => h.includes('메모') || h.toLowerCase().includes('memo'));

                // Defaults
                if (latIndex === -1) latIndex = 7;
                if (lngIndex === -1) lngIndex = 8;
                if (nameIndex === -1) nameIndex = 1;
                if (roadIndex === -1) roadIndex = 2;
                if (jibunIndex === -1) jibunIndex = 3;
                if (typeIndex === -1) typeIndex = 0;

                addLog(`📋 컬럼 매핑: 이름(${nameIndex}), 주소(${roadIndex}/${jibunIndex}), 좌표(${latIndex},${lngIndex})`);

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

                setProgress(10);
                addLog('🔄 데이터 검증 및 분류 중...');

                const total = rows.length;
                const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

                // Import validator dynamically
                const { validateBulkItem, parseBulkRow } = await import('../../utils/bulkRules');

                for (let i = 0; i < total; i++) {
                    try {
                        const row = rows[i];
                        if (row.length < 2) continue;

                        const nameRaw = row[nameIndex]?.trim() || '';
                        if (!nameRaw) continue; // Skip empty names

                        const roadAddr = row[roadIndex]?.trim() || '';
                        const jibunAddr = row[jibunIndex]?.trim() || '';
                        const addressRaw = roadAddr || jibunAddr || '';

                        const latRaw = parseFloat(row[latIndex]?.trim() || '0');
                        const lngRaw = parseFloat(row[lngIndex]?.trim() || '0');
                        const memo = row[memoIndex]?.trim() || '';
                        const typeStr = row[typeIndex]?.trim() || 'public';

                        // 1. Parsing & Enrichment (Extract Floor, Append Name to Address)
                        const parsed = parseBulkRow(nameRaw, addressRaw);

                        // 1.5 Basic Validity Check (On Raw Coords)
                        let isOnLand = false;
                        if (latRaw !== 0 && lngRaw !== 0) {
                            if (latRaw >= 33 && latRaw <= 43 && lngRaw >= 124 && lngRaw <= 132) {
                                isOnLand = await db.checkIsOnLand(latRaw, lngRaw);
                            }
                        }

                        // 2. Kakao Geocoding (Using Enriched Address)
                        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
                        let kakaoResult = null;
                        if (parsed.address) {
                            kakaoResult = await geocodeAddressKakao(parsed.address);
                            await delay(100); // Rate Limit
                        }

                        // 3. Smart Validation
                        const result = validateBulkItem(parsed, latRaw, lngRaw, kakaoResult, isOnLand);

                        // 4. Action
                        if (result.action === 'immediate') {
                            // Prepare Toilet Object
                            const toiletId = `t_${uploadBatchId}_${i}`;
                            const toilet: Toilet = {
                                id: toiletId,
                                name: result.name,
                                address: result.address, // Enriched address
                                lat: result.lat,
                                lng: result.lng,
                                type: 'public',
                                genderType: Gender.UNISEX, // Default, assume parsed elsewhere if needed
                                floor: result.floor,

                                // Defaults
                                hasPassword: false, cleanliness: 3, hasBidet: false, hasPaper: false,
                                stallCount: 1, crowdLevel: 'medium', isUnlocked: true,
                                note: memo,
                                createdBy: adminId,
                                source: 'admin',
                                isVerified: true,
                                createdAt: new Date().toISOString()
                            };
                            immediateList.push(toilet);
                            countImmediate++;
                            addLog(`[즉시등록] ${result.name} - ${result.reason}`, 'success');
                        }
                        else if (result.action === 'review') {
                            // Prepare Staging Object
                            stagingList.push({
                                upload_id: uploadBatchId,
                                name_raw: nameRaw,
                                address_raw: addressRaw,
                                lat_raw: latRaw,
                                lng_raw: lngRaw,

                                name: result.name,
                                address: result.address,
                                lat: result.lat,
                                lng: result.lng,
                                floor: result.floor,

                                status: 'review_needed',
                                reason: result.reason,
                                logs: result.logs
                            });
                            countReview++;
                            addLog(`[검수필요] ${result.name} - ${result.reason}`, 'warning');
                        }
                        else {
                            // Reject (Log only, or save as rejected in staging?)
                            // Plan said: "Rejected -> Log (Skip) or rejected status in bulk".
                            // Let's save to bulk with 'rejected' status so user can see WHY it failed in review page.
                            stagingList.push({
                                upload_id: uploadBatchId,
                                name_raw: nameRaw,
                                address_raw: addressRaw,
                                lat_raw: latRaw,
                                lng_raw: lngRaw,

                                name: result.name,
                                address: result.address,
                                lat: result.lat,
                                lng: result.lng,
                                floor: result.floor,

                                status: 'rejected',
                                reason: result.reason,
                                logs: result.logs
                            });
                            countReject++;
                            addLog(`[등록불가] ${result.name} - ${result.reason}`, 'error');
                        }

                        // Update Progress
                        if (i % 5 === 0) setProgress(10 + Math.floor((i / total) * 80));

                    } catch (rowError) {
                        console.error(`Error processing row ${i}:`, rowError);
                        addLog(`Row ${i} 처리 중 오류: ${rowError}`, 'error');
                        // Continue to next row
                    }
                }

                // 5. Batch Save
                setProgress(90);

                // A. Live DB (Toilets)
                if (immediateList.length > 0) {
                    addLog(`🚀 즉시 등록 대상 ${immediateList.length}건 저장 중...`);
                    // Helper to chunk
                    const chunk = (arr: any[], size: number) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));
                    const batches = chunk(immediateList, 50);
                    for (const b of batches) {
                        await db.bulkAddToilets(b);
                    }
                }

                // B. Staging DB (Toilets Bulk)
                if (stagingList.length > 0) {
                    addLog(`🧐 검수 대상 ${stagingList.length}건 임시 저장 중...`);
                    const batches = chunk(stagingList, 50);
                    for (const b of batches) {
                        await db.bulkSaveStaging(b);
                    }
                }

                // 6. Save History
                // We need to save history row so `upload_id` link works
                // Note: immediate items are NOT in staging, so they are just "added". 
                // history.uploadedIds usually tracked IDs. 
                const uploadedIdsList = immediateList.map(t => t.id); // Only live ones? 

                // Construct History Record
                await db.saveUploadHistory({
                    id: uploadBatchId,
                    fileName: file.name,
                    uploadedAt: new Date().toISOString(),
                    totalCount: total,
                    successCount: countImmediate, // "Success" in terms of live
                    addedCount: countImmediate,
                    updatedCount: 0, // Simplified
                    failCount: countReject,
                    uploadedToiletIds: uploadedIdsList,
                    uploadedBy: adminId,
                    logs: logsRef.current.map(l => l.message) // Save all logs
                });

                setProgress(100);
                setProcessComplete(true);
                setIsProcessing(false);

                addLog(`\n🏁 처리 완료!`, 'success');
                addLog(`  - 즉시 등록: ${countImmediate}건`, 'success');
                addLog(`  - 검수 필요: ${countReview}건 (리뷰 페이지에서 확인)`, 'warning');
                addLog(`  - 등록 불가: ${countReject}건`, 'error');

                onSuccess({
                    fileName: file.name,
                    totalCount: total,
                    successCount: countImmediate,
                    addedCount: countImmediate,
                    updatedCount: 0,
                    failCount: countReject + countReview, // Review is technically 'not done yet'
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
