import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, AlertTriangle, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Toilet } from '../../../types';
import { REGION_BOUNDS } from '../../../utils/regionBounds';
import { geocodeAddressKakao, reverseGeocodeKakao, keywordSearchKakao, checkKakaoSDK } from '../../../services/kakaoGeocoding';

interface ProcessLog {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning' | 'ai';
    timestamp: string;
    recordIdx?: number;
}

interface ConversionTerminalProps {
    file: File | null;
    regionKey: string;
}

export const ConversionTerminal: React.FC<ConversionTerminalProps> = ({ file, regionKey }) => {
    const [logs, setLogs] = useState<ProcessLog[]>([]);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [stats, setStats] = useState({ success: 0, error: 0, aiFixed: 0, duplicate: 0 });
    const [processedData, setProcessedData] = useState<any[]>([]);
    const [errorData, setErrorData] = useState<any[]>([]);
    const [successModal, setSuccessModal] = useState<{ show: boolean, title: string, path: string }>({ show: false, title: '', path: '' });
    const [logFilter, setLogFilter] = useState<'all' | 'success' | 'fixed' | 'error' | 'duplicate'>('all');
    const [recordResults, setRecordResults] = useState<Record<number, 'success' | 'fixed' | 'error' | 'duplicate'>>({});

    const logsEndRef = useRef<HTMLDivElement>(null);
    const stopRef = useRef(false);
    const pauseRef = useRef(false);
    const apiCallCounts = useRef({ kakao: 0 });
    const logIdCounter = useRef(0);

    // Auto-scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const addLog = (message: string, type: ProcessLog['type'] = 'info', recordIdx?: number) => {
        setLogs(prev => [...prev, {
            id: ++logIdCounter.current,
            message,
            type,
            timestamp: new Date().toLocaleTimeString(),
            recordIdx
        }]);
    };

    const parseCSV = (text: string): any[] => {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return [];

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const row: string[] = [];
            let inQuote = false;
            let current = '';
            for (let char of line) {
                if (char === '"') inQuote = !inQuote;
                else if (char === ',' && !inQuote) {
                    row.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current.trim());

            if (row.length > 0) data.push(row);
        }
        return data;
    };

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const startProcessing = async () => {
        if (!file || !regionKey) return;

        setIsProcessing(true);
        setIsPaused(false);
        stopRef.current = false;
        pauseRef.current = false;
        setLogs([]);
        setStats({ success: 0, error: 0, aiFixed: 0, duplicate: 0 });
        setProcessedData([]);
        setErrorData([]);
        setRecordResults({});
        apiCallCounts.current = { kakao: 0 };

        const text = await file.text();
        const rows = parseCSV(text);
        const headers = rows.length > 0 ? text.split(/\r?\n/)[0].split(',') : [];

        let nameIdx = -1, roadIdx = -1, jibunIdx = -1, latIdx = -1, lngIdx = -1;
        let typeIdx = -1, maleIdx = -1, femaleIdx = -1, timeIdx = -1;

        const h = headers.map(s => s.replace(/"/g, '').trim());
        h.forEach((col, idx) => {
            const c = col.toLowerCase();
            if (c.includes('화장실명') || c.includes('건물명')) nameIdx = idx;
            else if (c.includes('도로명')) roadIdx = idx;
            else if (c.includes('지번')) jibunIdx = idx;
            else if (c.includes('위도') || c === 'lat' || c === 'latitude') latIdx = idx;
            else if (c.includes('경도') || c === 'lng' || c === 'lon' || c === 'longitude') lngIdx = idx;
            else if (c.includes('구분')) typeIdx = idx;
            else if (c.includes('남성대변기') || c.includes('남성용')) maleIdx = idx;
            else if (c.includes('여성대변기') || c.includes('여성용')) femaleIdx = idx;
            else if (c.includes('개방시간')) timeIdx = idx;
        });

        if (nameIdx === -1) nameIdx = 0;
        if (roadIdx === -1) roadIdx = 1;
        if (latIdx === -1) latIdx = 11;
        if (lngIdx === -1) lngIdx = 12;

        addLog(`컬럼 매핑: 이름(${nameIdx}), 도로명(${roadIdx}), 지번(${jibunIdx}), 좌표(${latIdx}, ${lngIdx})`);

        const total = rows.length;
        setProgress({ current: 0, total });

        const regionBound = REGION_BOUNDS[regionKey];
        const successRows: any[] = [];
        const failedRows: any[] = [];
        const processedRecordIndices = new Map<string, { idx: number, name: string, address: string }>();
        let duplicateCount = 0;

        addLog(`작업 시작: ${total} 건 / 지역: ${regionBound.name} `, 'info');

        // --- Caching for Deduplication (API Calls) ---
        const geocodeCache = new Map<string, any>();
        const keywordCache = new Map<string, any>();
        const reverseCache = new Map<string, string>();

        const getGeocodeWithCache = (addr: string, idx: number) => {
            if (geocodeCache.has(addr)) {
                addLog(`[Cache] 지오코딩 결과 재사용: "${addr}"`, 'info', idx);
                return geocodeCache.get(addr);
            }
            return geocodeAddressKakao(addr).then(res => {
                apiCallCounts.current.kakao++;
                if (res) geocodeCache.set(addr, res);
                return res;
            });
        };

        const getKeywordWithCache = (kw: string, idx: number) => {
            if (keywordCache.has(kw)) {
                addLog(`[Cache] 키워드 검색 결과 재사용: "${kw}"`, 'info', idx);
                return keywordCache.get(kw);
            }
            return keywordSearchKakao(kw).then(res => {
                apiCallCounts.current.kakao++;
                if (res) keywordCache.set(kw, res);
                return res;
            });
        };

        const getReverseWithCache = (lat: number, lng: number, idx: number) => {
            const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
            if (reverseCache.has(key)) {
                addLog(`[Cache] 역지오코딩 결과 재사용: ${key}`, 'info', idx);
                return reverseCache.get(key);
            }
            return reverseGeocodeKakao(lat, lng).then(res => {
                apiCallCounts.current.kakao++;
                if (res) reverseCache.set(key, res);
                return res;
            });
        };

        const cleanNameForSearch = (name: string) => {
            return name
                .replace(/\(.*\)/g, '')
                .replace(/\[.*\]/g, '')
                .replace(/[①-⑳❶-❿㉠-㉭㉮-㉯]/g, '')
                .replace(/[^\w\s가-힣]/g, ' ')
                .replace(/[a-zA-Z0-9]+\s*F/gi, '')
                .replace(/\d+층/g, '')
                .replace(/지하\d+/g, '')
                .replace(/화장실/g, '')
                .replace(/(공중|개방|남자|여자|장애인)/g, '')
                .replace(/\s+/g, ' ')
                .trim();
        };

        const extractFloor = (rowName: string): { floor: string, cleanName: string } => {
            let floor = '1';
            let name = rowName;
            const bMatch = name.match(/B(\d+)/i) || name.match(/지하\s*(\d+)층/);
            if (bMatch) {
                floor = `- ${bMatch[1]} `;
                name = name.replace(bMatch[0], '');
            } else {
                const fMatch = name.match(/(\d+)F/i) || name.match(/(\d+)층/);
                if (fMatch) {
                    floor = fMatch[1];
                    name = name.replace(fMatch[0], '');
                }
            }
            return { floor, cleanName: name.trim() };
        };

        const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
            const R = 6371e3;
            const q1 = lat1 * Math.PI / 180;
            const q2 = lat2 * Math.PI / 180;
            const dq = (lat2 - lat1) * Math.PI / 180;
            const dl = (lng2 - lng1) * Math.PI / 180;
            const a = Math.sin(dq / 2) * Math.sin(dq / 2) + Math.cos(q1) * Math.cos(q2) * Math.sin(dl / 2) * Math.sin(dl / 2);
            return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };

        const ensureRegionPrefix = (addr: string): string => {
            if (!addr || regionKey === 'National') return addr;
            if (addr.includes(regionBound.name)) return addr;
            return `${regionBound.name} ${addr} `;
        };

        const cleanAddress = (addr: string) => addr.replace(/\(.*?\)/g, '').trim();

        for (let i = 0; i < total; i++) {
            while (pauseRef.current) {
                await delay(500);
                if (stopRef.current) break;
            }
            if (stopRef.current) break;

            const row = rows[i];
            const rawType = (typeIdx > -1 ? row[typeIdx] : '공중화장실')?.replace(/"/g, '') || '공중화장실';
            const rawName = row[nameIdx]?.replace(/"/g, '') || '';
            const { floor, cleanName: nameWithoutFloor } = extractFloor(rawName);
            const cleanedName = cleanNameForSearch(nameWithoutFloor);

            const roadAddr = row[roadIdx]?.replace(/"/g, '').replace(/\(.*?\)/g, '').trim() || '';
            const jibunAddr = row[jibunIdx]?.replace(/"/g, '').replace(/\(.*?\)/g, '').trim() || '';
            let address = roadAddr || jibunAddr;

            const maleCnt = (maleIdx > -1 ? row[maleIdx] : '0')?.replace(/"/g, '') || '0';
            const femaleCnt = (femaleIdx > -1 ? row[femaleIdx] : '0')?.replace(/"/g, '') || '0';
            const openTime = (timeIdx > -1 ? row[timeIdx] : '')?.replace(/"/g, '') || '';

            let lat = parseFloat(row[latIdx]?.replace(/"/g, '') || '0');
            let lng = parseFloat(row[lngIdx]?.replace(/"/g, '') || '0');
            let originalLat = lat;
            let originalLng = lng;

            if (!rawName) continue;

            let logPrefix = `[${i + 1}/${total}] ${rawName} `;
            let errorReason = '';
            let isFixed = false;
            let finalAddress = address;

            const recordKey = `${cleanedName}|${address}`;
            if (processedRecordIndices.has(recordKey)) {
                const original = processedRecordIndices.get(recordKey)!;
                addLog(`${logPrefix}: [Duplicate] 중복 데이터로 감지되어 건너뜁니다.`, 'warning', i);
                addLog(`▶ 현재건: ${rawName} | ${address}`, 'warning', i);
                addLog(`▶ 원본건: #${original.idx + 1} ${original.name} | ${original.address}`, 'warning', i);
                duplicateCount++;
                setStats(p => ({ ...p, duplicate: p.duplicate + 1 }));
                setRecordResults(prev => ({ ...prev, [i]: 'duplicate' }));
                setProgress(p => ({ ...p, current: i + 1 }));
                continue;
            }
            processedRecordIndices.set(recordKey, { idx: i, name: rawName, address: address });

            let hasOriginalCoords = (lat !== 0 && lng !== 0);
            if (hasOriginalCoords) {
                if (lat < regionBound.minLat || lat > regionBound.maxLat ||
                    lng < regionBound.minLng || lng > regionBound.maxLng) {
                    addLog(`${logPrefix}: 입력 좌표가 지역(${regionBound.name}) 범위를 벗어남 -> 무시`, 'warning', i);
                    hasOriginalCoords = false;
                    lat = 0; lng = 0; originalLat = 0; originalLng = 0;
                }
            }

            try {
                let foundResult: any = null;
                let successQuery = '';

                // Phase A: Address-based Search
                if (address && address.trim() !== regionBound.name) {
                    const addrAttempts = [];
                    if (roadAddr) addrAttempts.push({ addr: ensureRegionPrefix(roadAddr), type: 'road' });
                    if (jibunAddr && jibunAddr !== roadAddr) addrAttempts.push({ addr: ensureRegionPrefix(jibunAddr), type: 'jibun' });
                    if (addrAttempts.length === 0) addrAttempts.push({ addr: ensureRegionPrefix(address), type: 'general' });

                    for (const attempt of addrAttempts) {
                        if (foundResult) break;
                        addLog(`${logPrefix}: 주소 검색 시도[${attempt.type}]-> "${attempt.addr}"`, 'info', i);
                        const kRes = await getGeocodeWithCache(attempt.addr, i);
                        await delay(100);

                        if (kRes && kRes.address_type !== 'REGION') {
                            const reverseAddr = await getReverseWithCache(kRes.lat, kRes.lng, i);
                            await delay(100);

                            if (reverseAddr) {
                                const regionAlias = regionBound.name.substring(0, 2);
                                const isInStrictRect = kRes.lat >= regionBound.minLat && kRes.lat <= regionBound.maxLat &&
                                    kRes.lng >= regionBound.minLng && kRes.lng <= regionBound.maxLng;
                                const isInRegionName = reverseAddr.includes(regionAlias);

                                if (isInStrictRect || isInRegionName) {
                                    foundResult = kRes;
                                    successQuery = attempt.addr;
                                    break;
                                }
                            }
                        }
                    }
                }

                // Coordinate Determination & Strategy
                if (foundResult) {
                    const searchLat = foundResult.lat;
                    const searchLng = foundResult.lng;
                    const kakaoAddr = cleanAddress(foundResult.address_name);
                    finalAddress = (cleanedName && !kakaoAddr.includes(cleanedName)) ? `${kakaoAddr} ${cleanedName}` : kakaoAddr;

                    if (hasOriginalCoords) {
                        const dist = getDistance(originalLat, originalLng, searchLat, searchLng);
                        if (dist <= 500) {
                            // Strategy: Preserve original coordinates if reasonably close
                            lat = originalLat; lng = originalLng;
                            addLog(`${logPrefix}: [Keep Original] 주소 검색 결과와 근접(${Math.round(dist)}m)하여 기존 좌표 유지`, 'success', i);
                        } else {
                            // Strategy: Correct if discrepancy is too large (likely different location)
                            lat = searchLat; lng = searchLng;
                            isFixed = true;
                            addLog(`${logPrefix}: [Corrected] 기존 좌표와 거리가 멂(${Math.round(dist)}m) -> 검색 좌표로 보정`, 'warning', i);
                        }
                    } else {
                        lat = searchLat; lng = searchLng;
                        addLog(`${logPrefix}: 주소 검색 성공 -> 좌표 부여`, 'success', i);
                    }
                } else if (hasOriginalCoords) {
                    // Phase A failed, but we have coords. Best effort: use them and try to get an address.
                    lat = originalLat; lng = originalLng;
                    addLog(`${logPrefix}: [Keep Original] 주소 검색 실패 -> 기존 좌표 유지`, 'info', i);
                    const revAddr = await getReverseWithCache(lat, lng, i);
                    if (revAddr) {
                        finalAddress = (cleanedName && !revAddr.includes(cleanedName)) ? `${cleanAddress(revAddr)} ${cleanedName}` : cleanAddress(revAddr);
                        addLog(`${logPrefix}: 기존 좌표 기반 주소 획득 성공`, 'success', i);
                    }
                } else if (cleanedName && cleanedName.length > 2) {
                    // Final Fallback: Keyword Search
                    const nameQuery = regionKey === 'National' ? cleanedName : `${regionBound.name} ${cleanedName}`;
                    addLog(`${logPrefix}: [Fallback] 시설명 검색 시도 -> "${nameQuery}"`, 'info', i);
                    const nameResult = await getKeywordWithCache(nameQuery, i);
                    if (nameResult) {
                        const revForName = await getReverseWithCache(nameResult.lat, nameResult.lng, i);
                        if (revForName && revForName.includes(regionBound.name.substring(0, 2))) {
                            lat = nameResult.lat; lng = nameResult.lng;
                            finalAddress = cleanAddress(nameResult.address_name);
                            addLog(`${logPrefix}: [Fallback] 시설명 검색 결과로 좌표 부여`, 'success', i);
                        }
                    }
                }

                if (lat === 0 || lng === 0) {
                    if (!address.includes(regionBound.name)) finalAddress = `${regionBound.name} ${address} `;
                }

                // Final Region Validation
                const isInRegion = lat >= regionBound.minLat && lat <= regionBound.maxLat &&
                    lng >= regionBound.minLng && lng <= regionBound.maxLng;

                if (!isInRegion && lat !== 0) {
                    addLog(`${logPrefix}: 좌표가 ${regionBound.name} 범위를 벗어남(${lat}, ${lng})`, 'warning', i);
                    if (regionKey !== 'National') {
                        const searchAddr = address.includes(regionBound.name) ? address : `${regionBound.name} ${address} `;
                        addLog(`${logPrefix}: 주소 기반 좌표 재검색 시도(${searchAddr})...`, 'info', i);
                        const kakaoRetry = await getGeocodeWithCache(searchAddr, i);
                        await delay(100);

                        if (kakaoRetry && kakaoRetry.address_type !== 'REGION') {
                            if (kakaoRetry.lat >= regionBound.minLat && kakaoRetry.lat <= regionBound.maxLat &&
                                kakaoRetry.lng >= regionBound.minLng && kakaoRetry.lng <= regionBound.maxLng) {
                                lat = kakaoRetry.lat; lng = kakaoRetry.lng;
                                finalAddress = `${cleanAddress(kakaoRetry.address_name)} ${cleanedName} `;
                                addLog(`${logPrefix}: 주소 기반 좌표 복구 성공`, 'success', i);
                                isFixed = true;
                            }
                        }
                    }
                }

                if (lat !== 0 && lng !== 0 && (lat >= regionBound.minLat && lat <= regionBound.maxLat && lng >= regionBound.minLng && lng <= regionBound.maxLng)) {


                    const processedToilet = {
                        type: rawType, toilet_name: cleanedName, address: finalAddress, floor,
                        male_toilet_count: maleCnt, female_toilet_count: femaleCnt,
                        opening_hours: openTime, lat, lng, id: crypto.randomUUID(),
                        road_address: finalAddress, jibun_address: '', is_unisex: false,
                        password: '', created_at: new Date().toISOString(), is_public: true,
                        region: regionBound.name
                    };
                    successRows.push(processedToilet);
                    setStats(p => ({ ...p, success: p.success + 1, aiFixed: p.aiFixed + (isFixed ? 1 : 0) }));
                    setRecordResults(prev => ({ ...prev, [i]: isFixed ? 'fixed' : 'success' }));
                    addLog(`${logPrefix}: 변환 성공`, 'success', i);
                } else {
                    errorReason = lat === 0 ? '좌표를 찾을 수 없음' : `최종 좌표가 ${regionBound.name} 범위를 벗어남`;
                }

                if (errorReason) {
                    addLog(`${logPrefix}: 처리 실패 - ${errorReason} `, 'error', i);
                    failedRows.push({ originalRow: row, errorReason });
                    setStats(p => ({ ...p, error: p.error + 1 }));
                    setRecordResults(prev => ({ ...prev, [i]: 'error' }));
                }

            } catch (err: any) {
                console.error(err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                addLog(`${logPrefix}: 처리 실패 - ${errorMsg} `, 'error', i);
                failedRows.push({ originalRow: row, errorReason: errorMsg });
                setStats(p => ({ ...p, error: p.error + 1 }));
                setRecordResults(prev => ({ ...prev, [i]: 'error' }));
            }
            setProgress(p => ({ ...p, current: i + 1 }));
        }

        setProcessedData(successRows);
        setErrorData(failedRows);
        setIsProcessing(false);
        addLog(`==============================================`, 'info');
        addLog(`📊 API 호출 통계: 카카오 지오코딩 ${apiCallCounts.current.kakao} 회`, 'info');
        addLog(`작업 완료! 성공: ${successRows.length}, 중복 제거: ${duplicateCount}, 실패: ${failedRows.length} `, 'info');
    };

    const togglePause = () => {
        setIsPaused(!isPaused);
        pauseRef.current = !pauseRef.current;
        if (pauseRef.current) addLog('작업 일시정지됨', 'warning');
        else addLog('작업 재개됨', 'info');
    };

    const downloadSuccess = async () => {
        if (processedData.length === 0) return;
        const headers = ['구분', '화장실명', '주소', '층수', '남성변기수', '여성변기수', '개방시간상세', 'WGS84위도', 'WGS84경도'];
        const csvContent = [headers.join(','), ...processedData.map(t => [
            `"${t.type}"`, `"${t.toilet_name}"`, `"${t.address}"`, `"${t.floor}"`,
            `"${t.male_toilet_count}"`, `"${t.female_toilet_count}"`, `"${t.opening_hours}"`, t.lat, t.lng
        ].join(','))].join('\n');
        const content = '\uFEFF' + csvContent;
        const filename = `Cleaned_${regionKey}_${Date.now()}.csv`;
        try {
            const res = await fetch('/__save_file__', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, content }) });
            const data = await res.json();
            if (data.success) {
                setSuccessModal({ show: true, title: '변환 파일 저장 성공', path: data.path });
            } else throw new Error(data.error);
        } catch (err: any) { alert(`파일 저장 실패: ${err.message} `); }
    };

    const downloadError = async () => {
        if (errorData.length === 0) return;
        const text = await file!.text();
        const originalHeaders = text.split(/\r?\n/)[0].split(',').map(h => h.replace(/"/g, '').trim());
        const headers = [...originalHeaders, '오류사유'];
        const csvContent = [headers.join(','), ...errorData.map(e => {
            const rowData = e.originalRow.map((cell: string) => `"${cell.replace(/"/g, '')}"`);
            return [...rowData, `"${e.errorReason}"`].join(',');
        })].join('\n');
        const content = '\uFEFF' + csvContent;
        const filename = `Errors_${regionKey}_${Date.now()}.csv`;
        try {
            const res = await fetch('/__save_file__', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, content }) });
            const data = await res.json();
            if (data.success) {
                setSuccessModal({ show: true, title: '오류 리포트 저장 성공', path: data.path });
            } else throw new Error(data.error);
        } catch (err: any) { alert(`오류 리포트 저장 실패: ${err.message}`); }
    };

    const downloadLogs = async () => {
        if (logs.length === 0) return;
        const headers = ['시간', '유형', '메시지'];
        const csvContent = [headers.join(','), ...logs.map(l => [
            `"${l.timestamp}"`, `"${l.type}"`, `"${l.message.replace(/"/g, '""')}"`
        ].join(','))].join('\n');
        const content = '\uFEFF' + csvContent;
        const filename = `Log_${regionKey}_${Date.now()}.csv`;
        try {
            const res = await fetch('/__save_file__', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename, content }) });
            const data = await res.json();
            if (data.success) {
                setSuccessModal({ show: true, title: '로그 저장 성공', path: data.path });
            } else throw new Error(data.error);
        } catch (err: any) { alert(`로그 저장 실패: ${err.message}`); }
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    <Loader2 className={`w-5 h-5 ${isProcessing ? 'animate-spin text-blue-500' : 'text-gray-400'}`} />
                    변환 터미널
                </h3>
                <div className="flex gap-2">
                    {isProcessing && (
                        <button onClick={togglePause} className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold flex items-center gap-1">
                            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                            {isPaused ? "재개" : "일시정지"}
                        </button>
                    )}
                    {!isProcessing && file && (
                        <button onClick={startProcessing} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                            <Play className="w-4 h-4" />
                            변환 시작
                        </button>
                    )}
                </div>
            </div>

            {progress.total > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>진행률: {Math.floor((progress.current / progress.total) * 100)}%</span>
                        <span>{progress.current} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-5 gap-4 mb-4">
                <div
                    onClick={() => setLogFilter('all')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${logFilter === 'all' ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-200' : 'bg-white border-gray-100 hover:bg-gray-50'}`}
                >
                    <div className="text-gray-600 font-bold text-xl">{progress.total}</div>
                    <div className="text-xs text-gray-500 font-medium">전체</div>
                </div>
                <div
                    onClick={() => setLogFilter('success')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${logFilter === 'success' ? 'bg-green-100 border-green-400 ring-2 ring-green-200' : 'bg-green-50 border-green-100 hover:bg-green-100/50'}`}
                >
                    <div className="text-green-600 font-bold text-xl">{stats.success}</div>
                    <div className="text-xs text-green-700 font-medium">성공</div>
                </div>
                <div
                    onClick={() => setLogFilter('fixed')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${logFilter === 'fixed' ? 'bg-indigo-100 border-indigo-400 ring-2 ring-indigo-200' : 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100/50'}`}
                >
                    <div className="text-indigo-600 font-bold text-xl">{stats.aiFixed}</div>
                    <div className="text-xs text-indigo-700 font-medium">보정됨</div>
                </div>
                <div
                    onClick={() => setLogFilter('duplicate')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${logFilter === 'duplicate' ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200' : 'bg-amber-50 border-amber-100 hover:bg-amber-100/50'}`}
                >
                    <div className="text-amber-600 font-bold text-xl">{stats.duplicate}</div>
                    <div className="text-xs text-amber-700 font-medium">중복</div>
                </div>
                <div
                    onClick={() => setLogFilter('error')}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${logFilter === 'error' ? 'bg-red-100 border-red-400 ring-2 ring-red-200' : 'bg-red-50 border-red-100 hover:bg-red-100/50'}`}
                >
                    <div className="text-red-600 font-bold text-xl">{stats.error}</div>
                    <div className="text-xs text-red-700 font-medium">실패</div>
                </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 h-80 overflow-y-auto font-mono text-xs space-y-1 mb-6">
                {logs.length === 0 && <div className="text-gray-500 text-center py-20">대기 중... 파일을 선택하고 변환을 시작하세요.</div>}
                {logs.filter(log => {
                    if (logFilter === 'all') return true;
                    if (log.recordIdx === undefined) return false;
                    return recordResults[log.recordIdx] === logFilter;
                }).map((log) => (
                    <div key={log.id} className={`flex gap-2 animate-in slide-in-from-left-2 duration-200 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'ai' ? 'text-purple-400' : 'text-gray-300'}`}>
                        <span className="text-gray-600 shrink-0">[{log.timestamp}]</span>
                        <span>{log.message}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>

            <div className="flex gap-4">
                <button onClick={downloadSuccess} disabled={processedData.length === 0} className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <Download className="w-5 h-5" />
                    변환된 파일 서버 저장 ({processedData.length}건)
                </button>
                <button onClick={downloadError} disabled={errorData.length === 0} className="flex-1 py-3 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    오류 리포트 저장 ({errorData.length}건)
                </button>
                <button onClick={downloadLogs} disabled={logs.length === 0} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5" />
                    로그 저장 ({logs.length}건)
                </button>
            </div>

            {/* Success Modal */}
            {successModal.show && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">{successModal.title}</h3>
                            <p className="text-gray-500 mb-6">파일이 지정된 경로에 성공적으로 저장되었습니다.</p>

                            <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase block mb-1">저장 위치</span>
                                <code className="text-sm text-blue-600 break-all font-mono">{successModal.path}</code>
                            </div>

                            <button
                                onClick={() => setSuccessModal({ ...successModal, show: false })}
                                className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
