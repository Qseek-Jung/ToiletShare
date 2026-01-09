
import React, { useState } from 'react';
import { Upload, ArrowRight, FileText } from 'lucide-react';
import { RegionSelector } from '../../components/admin/BulkConverter/RegionSelector';
import { ConversionTerminal } from '../../components/admin/BulkConverter/ConversionTerminal';

export const BulkFileConversionPage: React.FC = () => {
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">대량 등록 파일 변환</h2>
                <p className="text-gray-500 mt-1">
                    지역별 공공데이터 CSV 파일을 정리하고, 좌표 오류를 AI로 자동 보정하여 대량 등록 전용 파일로 변환합니다.
                </p>
            </div>

            {/* Step 1: Region Selection */}
            <RegionSelector
                selectedRegion={selectedRegion}
                onRegionChange={setSelectedRegion}
            />

            {/* Step 2: File Upload */}
            <div className={`bg-white p-6 rounded-xl border border-gray-200 transition-opacity ${!selectedRegion ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className="block text-sm font-bold text-gray-700 mb-4">
                    2. 원본 CSV 파일 업로드
                </label>

                <div className="flex items-center gap-6">
                    <label className="flex-1 cursor-pointer group">
                        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-blue-50 group-hover:border-blue-300 transition-all">
                            {file ? (
                                <>
                                    <FileText className="w-10 h-10 text-blue-600 mb-3" />
                                    <p className="font-bold text-gray-900">{file.name}</p>
                                    <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-gray-400 group-hover:text-blue-500 mb-3" />
                                    <p className="font-medium text-gray-600 group-hover:text-blue-600">클릭하여 CSV 파일 선택</p>
                                </>
                            )}
                            <input type="file" className="hidden" accept=".csv" onChange={handleFileChange} />
                        </div>
                    </label>

                    <div className="hidden md:flex flex-col gap-2 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">1</div>
                            <span>지역 선택</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300 ml-3"></div>
                        <div className="flex items-center gap-2 text-blue-600 font-bold">
                            <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs">2</div>
                            <span>파일 업로드</span>
                        </div>
                        <div className="h-4 w-px bg-gray-300 ml-3"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold">3</div>
                            <span>변환 및 다운로드</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 3: Terminal */}
            {selectedRegion && file && (
                <div className="animate-fade-in-up">
                    <ConversionTerminal file={file} regionKey={selectedRegion} />
                </div>
            )}
        </div>
    );
};
