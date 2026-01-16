import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
    const { t } = useTranslation();
    return (
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 pb-8 pt-[calc(2rem+env(safe-area-inset-top))]">
                {/* Header */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
                    <button
                        onClick={() => window.location.hash = '#/'}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span className="font-medium">{t('go_home', '홈으로')}</span>
                    </button>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">{t('tos_title', '서비스 이용약관')}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('tos_date', '시행일자: 2024년 12월 6일')}</p>
                </div>

                {/* Content */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 space-y-8 text-gray-900 dark:text-gray-200">
                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_1_title', '제1조 (목적)')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t('tos_article_1_content')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_2_title', '제2조 (정의)')}</h2>
                        <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2">
                            <li>{t('tos_article_2_li_1')}</li>
                            <li>{t('tos_article_2_li_2')}</li>
                            <li>{t('tos_article_2_li_3')}</li>
                            <li>{t('tos_article_2_li_4')}</li>
                            <li>{t('tos_article_2_li_5')}</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_3_title', '제3조 (약관의 효력 및 변경)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_3_sub_1_title', '1. 약관의 효력')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_3_sub_1_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_3_sub_2_title', '2. 약관의 변경')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {t('tos_article_3_sub_2_content')}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_4_title', '제4조 (서비스의 제공 및 변경)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_4_sub_1_title', '1. 서비스 내용')}</h3>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>{t('tos_article_4_sub_1_li_1')}</li>
                                    <li>{t('tos_article_4_sub_1_li_2')}</li>
                                    <li>{t('tos_article_4_sub_1_li_3')}</li>
                                    <li>{t('tos_article_4_sub_1_li_4')}</li>
                                    <li>{t('tos_article_4_sub_1_li_5')}</li>
                                    <li>{t('tos_article_4_sub_1_li_6')}</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_4_sub_2_title', '2. 서비스 제공 시간')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">
                                    {t('tos_article_4_sub_2_content')}
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_5_title', '제5조 (회원가입)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_5_sub_1_title', '1. 회원가입 방법')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_5_sub_1_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_5_sub_2_title', '2. 회원 정보')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_5_sub_2_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_5_sub_3_title', '3. 미성년자 가입')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_5_sub_3_content')}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_6_title', '제6조 (개인정보 보호)')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                            {t('tos_article_6_content')}
                        </p>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                            <strong className="text-gray-900 dark:text-white">{t('tos_article_6_link', '개인정보처리방침:')}</strong>
                            <button onClick={() => window.location.hash = '#/privacy'} className="ml-2 text-blue-600 dark:text-blue-400 hover:underline">
                                {t('tos_article_6_btn', '바로가기')}
                            </button>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_7_title', '제7조 (이용자의 의무)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_7_sub_1_title', '1. 금지행위')}</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">{t('tos_article_7_sub_1_content')}</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>{t('tos_article_7_sub_1_li_1')}</li>
                                    <li>{t('tos_article_7_sub_1_li_2')}</li>
                                    <li>{t('tos_article_7_sub_1_li_3')}</li>
                                    <li>{t('tos_article_7_sub_1_li_4')}</li>
                                    <li>{t('tos_article_7_sub_1_li_5')}</li>
                                    <li>{t('tos_article_7_sub_1_li_6')}</li>
                                    <li>{t('tos_article_7_sub_1_li_7')}</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_7_sub_2_title', '2. 계정 관리')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_7_sub_2_content')}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_8_title', '제8조 (크래딧 제도)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_8_sub_1_title', '1. 크래딧 획득')}</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">{t('tos_article_8_sub_1_content')}</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>{t('tos_article_8_sub_1_li_1')}</li>
                                    <li>{t('tos_article_8_sub_1_li_2')}</li>
                                    <li>{t('tos_article_8_sub_1_li_3')}</li>
                                    <li>{t('tos_article_8_sub_1_li_4')}</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_8_sub_2_title', '2. 크래딧 사용')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_8_sub_2_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_8_sub_3_title', '3. 크래딧의 환급 불가')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_8_sub_3_content')}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_9_title', '제9조 (콘텐츠의 관리)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_9_sub_1_title', '1. 이용자 게시물')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_9_sub_1_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_9_sub_2_title', '2. 콘텐츠 삭제')}</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-2">{t('tos_article_9_sub_2_content')}</p>
                                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                                    <li>{t('tos_article_9_sub_2_li_1')}</li>
                                    <li>{t('tos_article_9_sub_2_li_2')}</li>
                                    <li>{t('tos_article_9_sub_2_li_3')}</li>
                                    <li>{t('tos_article_9_sub_2_li_4')}</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_10_title', '제10조 (서비스 이용의 제한)')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t('tos_article_10_content')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_11_title', '제11조 (면책조항)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_11_sub_1_title', '1. 서비스 제공 중단')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_11_sub_1_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_11_sub_2_title', '2. 정보의 정확성')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_11_sub_2_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_11_sub_3_title', '3. 이용자 간 분쟁')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_11_sub_3_content')}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_12_title', '제12조 (저작권)')}</h2>
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                            {t('tos_article_12_content')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_13_title', '제13조 (분쟁 해결)')}</h2>
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_13_sub_1_title', '1. 준거법')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_13_sub_1_content')}</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">{t('tos_article_13_sub_2_title', '2. 관할법원')}</h3>
                                <p className="text-gray-700 dark:text-gray-300">{t('tos_article_13_sub_2_content')}</p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('tos_article_14_title', '제14조 (부칙)')}</h2>
                        <p className="text-gray-700 dark:text-gray-300">{t('tos_article_14_content')}</p>
                    </section>

                    <section className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg text-center text-sm text-gray-500 dark:text-gray-400">
                            <p className="font-bold mb-2">{t('tos_footer_contact_title', '문의사항')}</p>
                            <p>{t('tos_footer_email', '이메일: qseek77@gmail.com')}</p>
                            <p>{t('tos_footer_service', '서비스명: 대똥단결')}</p>
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
