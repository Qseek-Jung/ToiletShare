import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, Check, FileText, Loader2 } from 'lucide-react';
import { Toilet, Gender } from '../../types';
import { dbSupabase as db } from '../../services/db_supabase';
import { batchGeocode } from '../../services/geocoding';

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
        const lines = text.split('\n');
        const result = [];

        // CSV splitting logic that handles quoted strings containing commas
        const splitCSVLine = (line: string) => {
            // Using the "split by comma unless in quotes" strategy
            const entries = [];
            let inQuote = false;
            let current = '';

            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    inQuote = !inQuote;
                } else if (char === ',' && !inQuote) {
                    entries.push(current);
                    current = '';
                    continue;
                }
                current += char;
            }
            entries.push(current);

            // Clean up quotes from entries
            return entries.map(e => {
                const trimmed = e.trim();
                // If wrapped in quotes, remove them and unescape double quotes
                if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                    return trimmed.slice(1, -1).replace(/""/g, '"');
                }
                return trimmed;
            });
        };

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = splitCSVLine(line);

            // Basic validation
            // if (columns.length < 4) continue; 
            // Better to keep even short rows if we want to debug, but existing logic skips <4.
            if (columns.length < 2) continue; // Relaxed check

            result.push(columns);
        }
        return result;
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

                const rows = parseCSV(text);
                addLog(`${rows.length}개의 데이터 행을 발견했습니다.`);

                if (rows.length === 0) {
                    throw new Error('데이터가 없거나 형식이 올바르지 않습니다.');
                }

                // 🏗️ Dynamic Column Mapping (헤더 기반 컬럼 찾기)
                const allLines = text.split('\n');

                // Header parsing using same logic as splitCSVLine (inline simplified)
                const parseLine = (line: string) => {
                    const entries = [];
                    let inQuote = false;
                    let current = '';
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i];
                        if (char === '"') { inQuote = !inQuote; }
                        else if (char === ',' && !inQuote) {
                            entries.push(current);
                            current = '';
                            continue;
                        }
                        current += char;
                    }
                    entries.push(current);
                    return entries.map(e => {
                        const trimmed = e.trim();
                        if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                            return trimmed.slice(1, -1).replace(/""/g, '"');
                        }
                        return trimmed;
                    });
                };

                const headerLine = parseLine(allLines[0]);
                const detectedHeaders = headerLine.map(h => h.trim());

                let latIndex = detectedHeaders.findIndex((h: string) => h.includes('위도') || h.toLowerCase().includes('lat'));
                let lngIndex = detectedHeaders.findIndex((h: string) => h.includes('경도') || h.toLowerCase().includes('lng'));
                // let nameIndex = detectedHeaders.findIndex((h: string) => h.includes('화장실명') || h.includes('이름'));
                // let roadIndex = detectedHeaders.findIndex((h: string) => h.includes('도로명') || h.includes('주소'));
                // let jibunIndex = detectedHeaders.findIndex((h: string) => h.includes('지번'));

                // Fallback to default indices if unique headers not found
                if (latIndex === -1) latIndex = 7;
                if (lngIndex === -1) lngIndex = 8;

                addLog(`📋 컬럼 매핑: 위도(Col ${latIndex}), 경도(Col ${lngIndex})`);

                // 지오코딩이 필요한 항목들 분류
                const newToilets: Toilet[] = [];
                const itemsToGeocodeWithRoad: any[] = [];
                const itemsToGeocodeWithJibun: any[] = [];
                const itemsToVerify: any[] = [];
                const newIds: string[] = [];
                let skippedCount = 0;
                let geocodingSuccessCount = 0;
                let geocodingFailCount = 0;
                let verificationModifiedCount = 0;

                setProgress(10);
                addLog('🔄 데이터 매핑 중...');

                for (const row of rows) {
                    if (row.length < 2) {
                        skippedCount++;
                        continue;
                    }

                    // Use standard indices for known columns unless we want to map everything.
                    // For now, let's stick to fixing Lat/Lng.
                    const typeStr = row[0]?.trim() || '';
                    const name = row[1]?.trim() || '';
                    const roadAddr = row[2]?.trim() || '';
                    const jibunAddr = row[3]?.trim() || '';
                    const maleCount = parseInt(row[4]?.trim() || '0');
                    const femaleCount = parseInt(row[5]?.trim() || '0');
                    const memo = row[6]?.trim() || '';

                    // Use Dynamic Indices
                    const latStr = row[latIndex]?.trim() || '';
                    const lngStr = row[lngIndex]?.trim() || '';

                    if (!name) {
                        addLog(`화장실 이름이 없어 건너뜁니다.`, 'warning');
                        skippedCount++;
                        continue;
                    }

                    let hasPaper = false;
                    if (typeStr.includes('공중화장실')) {
                        hasPaper = true;
                    }

                    let genderType: Gender = Gender.UNISEX;
                    if (maleCount > 0 && femaleCount === 0) genderType = Gender.MALE;
                    else if (femaleCount > 0 && maleCount === 0) genderType = Gender.FEMALE;

                    const stallCount = genderType === Gender.UNISEX
                        ? maleCount + femaleCount
                        : Math.max(maleCount, femaleCount);


                    let lat = parseFloat(latStr) || 0;
                    let lng = parseFloat(lngStr) || 0;

                    // 🚨 Smart Check: 한국 좌표 범위 기반으로 Lat/Lng 반전 감지
                    // 한국: Lat 33~43, Lng 124~132
                    // 만약 Lat이 100보다 크고 Lng가 100보다 작으면 뒤바뀐 것으로 판단
                    if (lat > 50 && lng < 100 && lng > 0) {
                        const temp = lat;
                        lat = lng;
                        lng = temp;
                        // 첫 번째 행에서만 로그를 남기거나, 매번 남기면 너무 많을 수 있으므로 생략하거나
                        // row index가 0일때만 경고하는 등의 로직이 가능하지만, 여기선 일단 조용히 보정.
                        // 필요하면 logs에 추가: addLog(`"${name}": 좌표(X,Y) 순서 보정됨`, 'warning');
                    }

                    const address = roadAddr || jibunAddr || '주소 없음';

                    const toiletId = `t_csv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    newIds.push(toiletId);

                    const toilet: Toilet = {
                        id: toiletId,
                        name,
                        address,
                        lat,
                        lng,
                        type: 'public',
                        genderType,
                        floor: 1,
                        hasPassword: false,
                        cleanliness: 3,
                        hasBidet: false,
                        hasPaper,
                        stallCount,
                        crowdLevel: 'medium',
                        isUnlocked: true,
                        note: memo,
                        createdBy: adminId,
                        reviewCount: 0,
                        ratingAvg: 0,
                        source: 'admin',
                        isVerified: true,
                        createdAt: new Date().toISOString()
                    };

                    // 주소 클리닝 함수
                    const cleanAddress = (addr: string): string => {
                        return addr
                            .replace(/\([^)]*\)/g, '')
                            .replace(/（[^）]*）/g, '')
                            .replace(/\[[^\]]*\]/g, '')
                            .replace(/\s+/g, ' ')
                            .trim();
                    };

                    const cleanedRoadAddr = roadAddr ? cleanAddress(roadAddr) : '';
                    const cleanedJibunAddr = jibunAddr ? cleanAddress(jibunAddr) : '';

                    // 검증 로직 추가
                    if (lat !== 0 && lng !== 0 && (cleanedRoadAddr || cleanedJibunAddr)) {
                        // 좌표가 있지만 주소도 있는 경우 => 검증 목록에 추가
                        itemsToVerify.push({
                            toilet,
                            searchAddress: cleanedRoadAddr || cleanedJibunAddr,
                            originalLat: lat,
                            originalLng: lng
                        });
                        // 일단 리스트에는 넣지 않고, 검증 후 처리

                    } else if (lat !== 0 && lng !== 0) {
                        // 좌표만 있는 경우 (주소 없음) => 그냥 추가
                        newToilets.push(toilet);
                        addLog(`"${name}": 좌표 보유 (주소없음) ✓`);
                    } else if (roadAddr) {
                        itemsToGeocodeWithRoad.push({
                            toilet,
                            searchAddress: cleanedRoadAddr,
                            fallbackAddress: cleanedJibunAddr
                        });
                    } else if (jibunAddr) {
                        itemsToGeocodeWithJibun.push({
                            toilet,
                            searchAddress: cleanedJibunAddr
                        });
                    } else {
                        geocodingFailCount++;
                        addLog(`"${name}": 주소 정보 없음 ✗`, 'error');
                    }
                }

                const totalToGeocode = itemsToGeocodeWithRoad.length + itemsToGeocodeWithJibun.length + itemsToVerify.length; // 검증 항목 포함
                addLog(`📊 분석 완료: 좌표+주소검증필요 ${itemsToVerify.length}개, 신규지오코딩 ${itemsToGeocodeWithRoad.length + itemsToGeocodeWithJibun.length}개`);

                // 거리 계산 헬퍼 (Haversine formula)
                const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                    const R = 6371; // Radius of the earth in km
                    const dLat = (lat2 - lat1) * (Math.PI / 180);
                    const dLon = (lon2 - lon1) * (Math.PI / 180);
                    const a =
                        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    return R * c;
                }

                // 지오코딩 수행
                if (totalToGeocode > 0) {
                    setProgress(15);
                    let processedCount = 0;

                    // 0단계: 좌표 검증 (Verification)
                    if (itemsToVerify.length > 0) {
                        addLog(`🕵️ 좌표 유효성 검증 중... (${itemsToVerify.length}개)`);
                        await batchGeocode(
                            itemsToVerify,
                            (item) => item.searchAddress,
                            (item, lat, lng, location_type) => {
                                if (lat && lng) {
                                    // 거리 차이 계산
                                    const dist = getDistanceFromLatLonInKm(item.originalLat, item.originalLng, lat, lng);

                                    // 50m 이상 차이나는 경우 처리
                                    if (dist > 0.05) {
                                        // 🚨 Precision Check: If Google Maps returns low precision (APPROXIMATE or GEOMETRIC_CENTER),
                                        // and CSV has specific coordinates, we should TRUST CSV (original).
                                        // Unless CSV is wildly off (e.g. > 20km... but hard to say).
                                        // For now, if location_type is NOT ROOFTOP or RANGE_INTERPOLATED, we assume it's a generic region match.
                                        const isPrecise = location_type === 'ROOFTOP' || location_type === 'RANGE_INTERPOLATED';

                                        if (isPrecise) {
                                            // 지오코딩이 정밀한데도 차이가 나면 => CSV가 틀렸을 확률 높음 (또는 건물이동?) => 지오코딩 좌표 채택
                                            newToilets.push({ ...item.toilet, lat, lng });
                                            verificationModifiedCount++;
                                            addLog(`⚠️ "${item.toilet.name}": 좌표불일치(${dist.toFixed(3)}km). CSV(${item.originalLat}, ${item.originalLng}) vs Geo(${lat.toFixed(6)}, ${lng.toFixed(6)})[${location_type}] => 주소좌표로 교체.`, 'warning');
                                        } else {
                                            // 지오코딩이 부정확함 (APPROXIMATE 등) => CSV 좌표 신뢰 (상세 좌표일 가능성)
                                            newToilets.push(item.toilet);
                                            addLog(`ℹ️ "${item.toilet.name}": 좌표차이있음(${dist.toFixed(3)}km) but 구글좌표가 부정확함[${location_type}]. 원본 좌표 유지.`, 'info');
                                        }
                                    } else {
                                        // 50m 이내면 원래 좌표 신뢰
                                        newToilets.push(item.toilet);
                                        addLog(`"${item.toilet.name}": 좌표 정확함 (${(dist * 1000).toFixed(0)}m 차이) ✓`);
                                    }
                                } else {
                                    // 지오코딩 실패 시 원래 좌표 유지 (어쩔 수 없음)
                                    newToilets.push(item.toilet);
                                    addLog(`"${item.toilet.name}": 주소 검색 실패. 원본 좌표 사용.`, 'warning');
                                }
                            },
                            (current, total) => {
                                processedCount++;
                                const percentage = 15 + Math.floor((processedCount / totalToGeocode) * 70);
                                setProgress(percentage);
                            }
                        );
                    }

                    // 1단계: 도로명주소로 지오코딩
                    if (itemsToGeocodeWithRoad.length > 0) {
                        addLog(`  🔍 1단계: 도로명주소로 검색 (${itemsToGeocodeWithRoad.length}개)`);
                        await batchGeocode(
                            itemsToGeocodeWithRoad,
                            (item) => item.searchAddress,
                            (item, lat, lng) => {
                                if (lat && lng) {
                                    newToilets.push({ ...item.toilet, lat, lng });
                                    geocodingSuccessCount++;
                                    addLog(`"${item.toilet.name}": 도로명주소로 좌표 찾음 ✓`, 'success');
                                } else if (item.fallbackAddress) {
                                    // 2단계로 이동: 지번주소
                                    itemsToGeocodeWithJibun.push({
                                        toilet: item.toilet,
                                        searchAddress: item.fallbackAddress
                                    });
                                    addLog(`"${item.toilet.name}": 도로명주소 실패, 지번주소로 재시도`, 'warning');
                                } else {
                                    geocodingFailCount++;
                                    addLog(`"${item.toilet.name}": 도로명주소 실패 (지번주소 없음) ✗`, 'error');
                                }
                            },
                            (current, total) => {
                                processedCount++;
                                const percentage = 15 + Math.floor((processedCount / totalToGeocode) * 70);
                                setProgress(percentage);
                            }
                        );
                    }

                    // 2단계: 지번주소로 지오코딩 (최종 시도)
                    const jibunItems = itemsToGeocodeWithJibun.filter(item => !newToilets.find(t => t.id === item.toilet.id));
                    if (jibunItems.length > 0) {
                        addLog(`  🔍 2단계: 지번주소로 검색 (${jibunItems.length}개)`);
                        await batchGeocode(
                            jibunItems,
                            (item) => item.searchAddress,
                            (item, lat, lng) => {
                                if (lat && lng) {
                                    newToilets.push({ ...item.toilet, lat, lng });
                                    geocodingSuccessCount++;
                                    addLog(`"${item.toilet.name}": 지번주소로 좌표 찾음 ✓`, 'success');
                                } else {
                                    geocodingFailCount++;
                                    addLog(`"${item.toilet.name}": 모든 방법 실패 ✗ (도로명→지번)`, 'error');
                                }
                            },
                            (current, total) => {
                                processedCount++;
                                const percentage = 15 + Math.floor((processedCount / totalToGeocode) * 70);
                                setProgress(percentage);
                            }
                        );
                    }

                    addLog(`✅ 처리 완료: 검증수정 ${verificationModifiedCount}개, 신규지오코딩 ${geocodingSuccessCount}개, 실패 ${geocodingFailCount}개`);
                }

                if (newToilets.length === 0) {
                    throw new Error('등록할 유효한 화장실 데이터가 없습니다.');
                }

                setProgress(90);
                addLog(`💾 화장실정보를 DB로 업데이트 중입니다... (처리: 0 / ${newToilets.length})`);

                // DB 업데이트를 시각적으로 표시하며 added/updated 추적
                let dbProcessedCount = 0;
                let totalAdded = 0;
                let totalUpdated = 0;
                const batchSize = 10;

                for (let i = 0; i < newToilets.length; i += batchSize) {
                    const batch = newToilets.slice(i, Math.min(i + batchSize, newToilets.length));
                    const result = await db.bulkAddToilets(batch); // Async batch add

                    totalAdded += result.added;
                    totalUpdated += result.updated;
                    dbProcessedCount += batch.length;
                    const percentage = 90 + Math.floor((dbProcessedCount / newToilets.length) * 10);
                    setProgress(percentage);
                    addLog(`💾 화장실정보를 DB로 업데이트 중입니다... (처리: ${dbProcessedCount} / ${newToilets.length})`);
                    // Note: Supabase calls are async, so no need for artificial timeout theoretically, but kept small delay if needed for UI pacing
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

                setUploadedIds(newIds);
                setProgress(100);

                const totalInFile = rows.length;
                const successCount = newToilets.length;
                const failCount = totalInFile - successCount;

                addLog(`\n🎉 업로드 완료!`, 'success');
                addLog(`📊 결과 요약:`, 'success');
                addLog(`  - 총 파일 화장실 수: ${totalInFile}개`, 'success');
                addLog(`  - 정상 업로드: ${successCount}개`, 'success');
                addLog(`    • 신규 생성: ${totalAdded}개`, 'success');
                addLog(`    • 중복 덮어쓰기: ${totalUpdated}개`, 'success');
                addLog(`  - 미처리 (오류): ${failCount}개`, 'success');

                setIsProcessing(false);
                setProcessComplete(true);

                // Pass result data to parent component
                // Pass result data to parent component
                setTimeout(() => {
                    // Use logsRef.current to get the full accumulated logs
                    const allLogs = logsRef.current;
                    const errorLogs = allLogs.filter(l => l.type === 'error');
                    const warningLogs = allLogs.filter(l => l.type === 'warning');
                    const successLogs = allLogs.filter(l => l.type === 'success');

                    const formattedLogs = [
                        '==================================================',
                        `❌ 실패 / 오류 항목 (${errorLogs.length}건)`,
                        '==================================================',
                        ...(errorLogs.length > 0 ? errorLogs.map(l => `[${l.timestamp}] ${l.message}`) : ['(없음)']),
                        '',
                        '==================================================',
                        `⚠️ 변경 / 주의 항목 (${warningLogs.length}건)`,
                        '==================================================',
                        ...(warningLogs.length > 0 ? warningLogs.map(l => `[${l.timestamp}] ${l.message}`) : ['(없음)']),
                        '',
                        '==================================================',
                        `✅ 성공 / 완료 항목 (${successLogs.length}건)`,
                        '==================================================',
                        ...(successLogs.length > 0 ? successLogs.map(l => `[${l.timestamp}] ${l.message}`) : ['(없음)']),
                        '',
                        '==================================================',
                        `ℹ️ 전체 상세 로그`,
                        '==================================================',
                        ...allLogs.map(log => `[${log.timestamp}] ${log.message}`)
                    ];

                    onSuccess({
                        fileName: file.name,
                        totalCount: totalInFile,
                        successCount: successCount,
                        addedCount: totalAdded,
                        updatedCount: totalUpdated,
                        failCount: failCount,
                        uploadedIds: newIds,
                        logs: formattedLogs
                    });
                }, 500);

            } catch (err) {
                console.error('Upload error:', err);
                const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류 발생';
                addLog(`❌ 오류 발생: ${errorMessage}`, 'error');
                addLog('업로드 실패', 'error');
                setProgress(0);
                setIsProcessing(false);
                setProcessComplete(true);
            }
        };

        reader.readAsText(file, encoding);
    };

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
