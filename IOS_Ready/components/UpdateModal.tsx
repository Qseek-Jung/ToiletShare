import React from 'react';
import { Smartphone, AlertTriangle, ArrowRight, X } from 'lucide-react';

interface UpdateModalProps {
    type: 'force' | 'optional';
    storeUrl: string;
    message: string;
    onClose: () => void; // Only for optional
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ type, storeUrl, message, onClose }) => {
    const handleUpdate = () => {
        window.open(storeUrl, '_system');
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`p-8 pb-6 flex flex-col items-center text-center ${type === 'force' ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${type === 'force' ? 'bg-white text-red-500' : 'bg-white text-blue-500'}`}>
                        {type === 'force' ? <AlertTriangle className="w-10 h-10" /> : <Smartphone className="w-10 h-10" />}
                    </div>

                    <h2 className="text-2xl font-black text-gray-900 mb-2">
                        {type === 'force' ? '중요 업데이트 안내' : '새로운 버전 업데이트'}
                    </h2>
                    <p className="text-gray-600 font-medium">
                        {type === 'force' ? '원활한 사용을 위해 업데이트가 필요합니다.' : '더 편리해진 앱을 만나보세요!'}
                    </p>
                </div>

                {/* Body */}
                <div className="p-8 pt-6">
                    <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-center">
                        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm">
                            {message}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleUpdate}
                            className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 ${type === 'force' ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                                }`}
                        >
                            지금 업데이트 하기
                            <ArrowRight className="w-5 h-5" />
                        </button>

                        {type === 'optional' && (
                            <button
                                onClick={onClose}
                                className="w-full py-4 text-gray-500 font-bold text-sm hover:text-gray-700 transition-colors"
                            >
                                다음에 할게요
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
