import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PenTool, MapPin, Camera } from 'lucide-react';
import { PageLayout } from '../../components/PageLayout';

export const RegistrationGuide: React.FC = () => {
    const { t } = useTranslation();
    return (
        <PageLayout className="pb-24">
            <div className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-900 dark:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">{t('reg_guide_title', '화장실 등록 가이드')}</h1>
            </div>

            <div className="pt-20 px-6 space-y-8">
                {/* Intro */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <PenTool className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('reg_guide_subtitle', '화장실 제보하기')}</h2>
                    <p className="text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: t('reg_guide_desc', '알고 있는 개방 화장실을 등록하여<br />모두의 급똥을 구해주세요! 🦸') }} />
                </div>

                {/* Steps */}
                <div className="space-y-6">
                    <StepItem
                        step="1"
                        icon={<MapPin className="w-5 h-5 text-white" />}
                        color="bg-red-500"
                        title={t('reg_step_1_title', '위치 선택')}
                        desc={t('reg_step_1_desc', '지도에서 화장실의 정확한 위치를 핀으로 찍어주세요.')}
                    />
                    <StepItem
                        step="2"
                        icon={<PenTool className="w-5 h-5 text-white" />}
                        color="bg-blue-500"
                        title={t('reg_step_2_title', '정보 입력')}
                        desc={t('reg_step_2_desc', '화장실 이름, 층수, 개방 여부 등 상세 정보를 입력합니다.')}
                    />
                    <StepItem
                        step="3"
                        icon={<Camera className="w-5 h-5 text-white" />}
                        color="bg-purple-500"
                        title={t('reg_step_3_title', '사진 및 리뷰 (선택)')}
                        desc={t('reg_step_3_desc', '화장실 입구 사진이나 팁이 있다면 함께 남겨주세요.')}
                    />
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl text-xs text-gray-500 dark:text-gray-400">
                    {t('reg_guide_warning', '* 허위 사실을 기재하거나 장난으로 등록할 경우 이용이 제한될 수 있습니다.')}
                </div>
            </div>
        </PageLayout>
    );
};

const StepItem = ({ step, icon, color, title, desc }: any) => (
    <div className="flex gap-4">
        <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0 z-10 shadow-md`}>
                <span className="font-bold text-white font-mono">{step}</span>
            </div>
            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-700 -mt-1 -mb-6" />
        </div>
        <div className="pb-6">
            <h4 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
        </div>
    </div>
);
