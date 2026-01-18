import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    const { t } = useTranslation();
    return (
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">{t('go_home', '홈으로')}</span>
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('privacy_title', '개인정보처리방침')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('privacy_date', '최종 수정일: 2025년 12월 6일')}</p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 space-y-8 text-gray-900 dark:text-gray-200">
                    <section>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            {t('privacy_intro')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_1_title', '1. 수집하는 개인정보 항목')}</h2>
                        <div className="space-y-3">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('privacy_sec_1_req_title', '필수 수집 항목')}</h3>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>{t('privacy_sec_1_req_li_1')}</li>
                                    <li>{t('privacy_sec_1_req_li_2')}</li>
                                </ul>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('privacy_sec_1_auto_title', '자동 수집 항목')}</h3>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>{t('privacy_sec_1_auto_li_1')}</li>
                                    <li>{t('privacy_sec_1_auto_li_2')}</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_2_title', '2. 개인정보의 수집 및 이용 목적')}</h2>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                            <li>{t('privacy_sec_2_li_1')}</li>
                            <li>{t('privacy_sec_2_li_2')}</li>
                            <li>{t('privacy_sec_2_li_3')}</li>
                            <li>{t('privacy_sec_2_li_4')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_3_title', '3. 개인정보의 보유 및 이용 기간')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            {t('privacy_sec_3_content')}
                        </p>
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                            <p className="text-gray-800 dark:text-gray-200">
                                <strong>{t('privacy_sec_3_box_period', '보유 기간: 회원 탈퇴 시까지')}</strong><br />
                                <strong>{t('privacy_sec_3_box_exception', '예외: 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관')}</strong>
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_4_title', '4. 개인정보의 파기 절차 및 방법')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            {t('privacy_sec_4_content')}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                            <li><strong>{t('privacy_sec_4_li_1')}</strong></li>
                            <li><strong>{t('privacy_sec_4_li_2')}</strong></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_5_title', '5. 제3자 제공')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t('privacy_sec_5_content')}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4 mt-3">
                            <li>{t('privacy_sec_5_li_1')}</li>
                            <li>{t('privacy_sec_5_li_2')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_6_title', '6. 소셜 로그인 서비스')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            {t('privacy_sec_6_content')}
                        </p>
                        <div className="space-y-3">
                            <div className="border-l-4 border-blue-500 pl-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('privacy_sec_6_google', 'Google')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('privacy_sec_6_google_info', '수집 정보: 이메일, 성별')}</p>
                            </div>
                            <div className="border-l-4 border-green-500 pl-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('privacy_sec_6_naver', 'Naver')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('privacy_sec_6_naver_info', '수집 정보: 이메일, 성별')}</p>
                            </div>
                            <div className="border-l-4 border-yellow-500 pl-4">
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('privacy_sec_6_kakao', 'Kakao')}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{t('privacy_sec_6_kakao_info', '수집 정보: 이메일, 성별')}</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                            {t('privacy_sec_6_footer')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_7_title', '7. 이용자의 권리와 행사 방법')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
                            {t('privacy_sec_7_content')}
                        </p>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 ml-4">
                            <li>{t('privacy_sec_7_li_1')}</li>
                            <li>{t('privacy_sec_7_li_2')}</li>
                            <li>{t('privacy_sec_7_li_3')}</li>
                            <li>{t('privacy_sec_7_li_4')}</li>
                        </ul>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                <strong>{t('privacy_sec_7_box', '권리 행사 방법: 서비스 내 \"내 정보\" 메뉴 또는 아래 개인정보 보호책임자에게 이메일로 요청')}</strong>
                            </p>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_8_title', '8. 개인정보 보호책임자')}</h2>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-lg">
                            <p className="text-gray-700 dark:text-gray-300 mb-3">
                                {t('privacy_sec_8_content')}
                            </p>
                            <div className="space-y-2">
                                <p className="text-gray-900 dark:text-white"><strong>{t('privacy_sec_8_role', '개인정보 보호책임자')}</strong></p>
                                <p className="text-gray-700 dark:text-gray-300">{t('privacy_sec_8_email', '이메일:')} <a href="mailto:qseek77@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">qseek77@gmail.com</a></p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('privacy_sec_9_title', '9. 개인정보 처리방침의 변경')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t('privacy_sec_9_content')}
                        </p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            <p>{t('privacy_footer_date', '본 개인정보처리방침은 2025년 12월 6일부터 적용됩니다.')}</p>
                            <p className="mt-2">{t('privacy_footer_contact', '문의사항이 있으시면')} <a href="mailto:qseek77@gmail.com" className="text-blue-600 dark:text-blue-400 hover:underline">qseek77@gmail.com</a>{t('privacy_footer_contact_end', '으로 연락 주시기 바랍니다.')}</p>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400">
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        {t('tos_go_home', '홈으로 돌아가기')}
                    </button>
                </div>
            </div>
        </div>
    );
}
