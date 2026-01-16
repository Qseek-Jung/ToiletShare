import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Gift, PlayCircle, ThumbsUp } from 'lucide-react';
import { TextLayout } from '../../components/TextLayout';

export const CreditGuide: React.FC = () => {
    const { t } = useTranslation();
    return (
        <TextLayout className="pb-24">
            <div className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-900 dark:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">{t('credit_guide_title', '크레딧 이용 안내')}</h1>
            </div>

            <div className="pt-20 px-6 space-y-8">
                {/* Intro */}
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Gift className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('credit_what_is', '크레딧이란?')}</h2>
                    <p className="text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: t('credit_what_is_desc', '대똥단결 내에서 화장실 정보를 확인하거나<br />비밀번호를 잠금 해제할 때 사용하는 포인트입니다.') }} />
                </div>

                {/* How to Earn */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white border-b pb-2 border-gray-100 dark:border-gray-700">{t('credit_how_to_earn', '적립 방법')}</h3>
                    <ul className="space-y-4">
                        <li className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                <PlayCircle className="w-5 h-5 text-blue-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-200">{t('credit_earn_ad_title', '광고 시청')}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('credit_earn_ad_desc', '광고를 끝까지 시청하면 크레딧이 적립됩니다.')}</p>
                            </div>
                        </li>
                        <li className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                                <ThumbsUp className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 dark:text-gray-200">{t('credit_earn_invite_title', '친구 초대')}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('credit_earn_invite_desc', '친구가 내 초대 링크로 가입하면 서로 보상을 받습니다.')}</p>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* Usage */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                    <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white border-b pb-2 border-gray-100 dark:border-gray-700">{t('credit_usage_title', '사용처')}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('credit_usage_desc', '잠긴 화장실 비밀번호 확인 화장실 상세화면에서 비밀번호가 잠겨있을 때, 크레딧을 사용하여 잠금을 해제할 수 있습니다.').replace('잠긴 화장실 비밀번호 확인', '🔒 <strong>잠긴 화장실 비밀번호 확인</strong><br />') }} />
                </div>
            </div>
        </TextLayout>
    );
};
