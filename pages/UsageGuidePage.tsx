import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, AlertTriangle, CheckCircle2, Crown, Coins, HelpCircle, Star, Heart, Shield } from 'lucide-react';
import { LevelIcon } from '../components/LevelIcon';
import { TextLayout } from '../components/TextLayout';
import { ContactModal } from '../components/ContactModal';

import { dbSupabase as db } from '../services/db_supabase';
import { DEFAULT_CREDIT_POLICY, CreditPolicy, User } from '../types';

interface UsageGuidePageProps {
    user?: User;
}

const UsageGuidePage: React.FC<UsageGuidePageProps> = ({ user }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState('intro');
    const [policy, setPolicy] = useState<CreditPolicy>(DEFAULT_CREDIT_POLICY);
    const [levelUpReward, setLevelUpReward] = useState<number>(10);
    const [showContactModal, setShowContactModal] = useState(false);

    useEffect(() => {
        const loadPolicy = async () => {
            const [fetchedPolicy, rewardStr] = await Promise.all([
                db.getCreditPolicy(),
                db.getSystemSetting('level_up_reward', '10')
            ]);
            if (fetchedPolicy) setPolicy(fetchedPolicy);
            setLevelUpReward(parseInt(rewardStr, 10));
        };
        loadPolicy();
    }, []);

    // Scroll Refs for tabs
    const sectionRefs = {
        intro: useRef<HTMLDivElement>(null),
        levels: useRef<HTMLDivElement>(null),
        credits: useRef<HTMLDivElement>(null),
        etiquette: useRef<HTMLDivElement>(null),
    };

    const scrollToSection = (key: keyof typeof sectionRefs) => {
        setActiveTab(key);
        sectionRefs[key].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Sticky Header Effect
    const [isSticky, setIsSticky] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            setIsSticky(window.scrollY > 100);

            // Auto-update active tab based on scroll position
            const scrollPos = window.scrollY + 150;
            if (sectionRefs.etiquette.current && scrollPos >= sectionRefs.etiquette.current.offsetTop) setActiveTab('etiquette');
            else if (sectionRefs.credits.current && scrollPos >= sectionRefs.credits.current.offsetTop) setActiveTab('credits');
            else if (sectionRefs.levels.current && scrollPos >= sectionRefs.levels.current.offsetTop) setActiveTab('levels');
            else setActiveTab('intro');
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navItems = [
        { id: 'intro', label: t('guide_tab_intro', '소개') },
        { id: 'levels', label: t('guide_tab_levels', '등급') },
        { id: 'credits', label: t('guide_tab_credits', '포인트') },
        { id: 'etiquette', label: t('guide_tab_etiquette', '매너') },
    ];

    return (
        <TextLayout className="p-0 bg-gray-50 dark:bg-gray-900" noPadding>
            {/* Top Header - Fixed */}
            <div className="absolute top-0 left-0 right-0 z-40 bg-surface dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 pt-[env(safe-area-inset-top)] shadow-sm">
                <div className="flex items-center px-4 h-14">
                    <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="ml-2 text-lg font-bold text-gray-900 dark:text-white">{t('guide_usage', '이용 안내')}</h1>
                </div>

                {/* Tab Navigation (Styled like Filter Chips) */}
                <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar bg-surface dark:bg-surface-dark">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => scrollToSection(item.id as any)}
                            className={`flex-none px-4 py-2 text-sm font-bold rounded-full border transition-all duration-200
                            ${activeTab === item.id
                                    ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-100 dark:border-primary-800 text-primary-700 dark:text-primary-400 shadow-sm scale-105'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="absolute inset-0 pt-[calc(env(safe-area-inset-top)+110px)] pb-[env(safe-area-inset-bottom)] overflow-y-auto overflow-x-hidden" id="guide-scroll-container">
                <div className="max-w-md mx-auto space-y-12 p-5 pb-20">
                    {/* Content */}

                    {/* 1. Intro Section */}
                    <div ref={sectionRefs.intro} className="space-y-6 pt-4 animate-fade-in-up scroll-mt-32">
                        <div className="text-center space-y-4 mb-8">
                            {/* Highlights (Gratitude & Cleanliness) */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 text-center shadow-sm">
                                <h2 className="text-xl font-black text-amber-800 dark:text-amber-500 mb-2">
                                    "{t('guide_intro_title', '비움의 기쁨, 채움의 감사')}"
                                </h2>
                                <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: t('guide_intro_desc', '급한 불을 껐을 때의 그 안도감,<br />잊지 않으셨죠? 😌') }} />
                                <div className="my-4 w-full h-px bg-amber-200/50 dark:bg-amber-800/50"></div>
                                <p className="text-amber-900 dark:text-amber-400 font-bold text-lg" dangerouslySetInnerHTML={{ __html: t('guide_intro_clean', '머문 자리는 언제나 아름답게,<br /><span class="underline decoration-wavy decoration-amber-500/50">청결한 뒷정리</span>는 필수입니다!').replace('className="', 'class="') }} />
                            </div>

                            <div className="mt-8">
                                <span className="text-4xl">🤝</span>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-4">
                                    "{t('guide_intro_unity_title', '우리는 하나가 됩니다.')}"
                                </h2>
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed mt-2" dangerouslySetInnerHTML={{ __html: t('guide_intro_unity_desc', '나만 아는 화장실이 누군가에겐<br />구원의 빛이 될 수 있습니다. ✨') }} />
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                            <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full">
                                <MapPin className="w-6 h-6 text-orange-500" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{t('guide_nearest_title', '가장 가까운 화장실')}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: t('guide_nearest_desc', '내 주변 개방된 화장실을<br />지도에서 바로 찾아보세요.') }} />
                            </div>
                        </div>
                    </div>

                    {/* 2. Level System Section */}
                    <div ref={sectionRefs.levels} className="space-y-6 pt-8 scroll-mt-32">
                        <div className="flex items-center gap-2 mb-2">
                            <Crown className="w-6 h-6 text-amber-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('guide_level_system', '명예로운 등급 시스템')}</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm" dangerouslySetInnerHTML={{ __html: t('guide_level_desc', '활동을 많이 할수록 내 화장실의 품격이 올라갑니다.<br /><span class="text-brand-primary font-bold">비데(Bidet)</span> 등급에 도전해보세요!').replace('className="', 'class="') }} />

                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {[
                                    { level: 0, label: t('level_hand', '맨손'), score: '0', desc: t('level_desc_0', '환영합니다! 시작은 미약하지만...') },
                                    { level: 1, label: t('level_straw', '지푸라기'), score: '10', desc: t('level_desc_1', '뭔가 도구는 생겼네요.') },
                                    { level: 2, label: t('level_newspaper', '신문지'), score: '30', desc: t('level_desc_2', '이제 좀 닦을 만합니다.') },
                                    { level: 3, label: t('level_roll_tissue', '두루마리'), score: '60', desc: t('level_desc_3', '기본적인 품위를 갖추셨군요.') },
                                    { level: 4, label: t('level_box_tissue', '곽티슈'), score: '100', desc: t('level_desc_4', '부드러운 배려의 아이콘!') },
                                    { level: 5, label: t('level_wet_tissue', '물티슈'), score: '200', desc: t('level_desc_5', '깔끔함 그 자체입니다.') },
                                    { level: 6, label: t('level_bidet', '비데'), score: '400', desc: t('level_desc_6', '진정한 화장실의 제왕 👑') },
                                ].map((item) => (
                                    <div key={item.level} className="flex items-center p-4 gap-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <div className="shrink-0 flex flex-col items-center gap-1 w-14">
                                            <LevelIcon level={item.level} size="lg" />
                                            <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{item.score}점~</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-900 dark:text-white text-lg">{item.label}</span>
                                                {item.level >= 5 && <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-bold">High Class</span>}
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. Credit Point Section */}
                    <div ref={sectionRefs.credits} className="space-y-6 pt-4 scroll-mt-32">
                        <div className="flex items-center gap-2 mb-2">
                            <Coins className="w-6 h-6 text-yellow-500" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('guide_credit_tips', '크레딧 꿀팁')}</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm" dangerouslySetInnerHTML={{ __html: t('guide_credit_desc', '크레딧은 비밀번호를 보거나 레벨을 올리는데 사용됩니다.<br /><span class="text-xs text-gray-500 dark:text-gray-500">* 정책에 따라 변경될 수 있습니다.</span>').replace('className="', 'class="') }} />

                        <div className="grid grid-cols-2 gap-2">
                            {/* 1. Signup */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-lg shrink-0">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('guide_credit_signup', '회원가입')}</h3>
                                </div>
                                <div className="flex justify-end items-end">
                                    <span className="text-lg font-black text-green-600 dark:text-green-500">+{policy.signup}</span>
                                    <span className="text-xs text-gray-400 mb-1 ml-0.5">C</span>
                                </div>
                            </div>

                            {/* 2. Toilet Reg */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-lg shrink-0">
                                        <MapPin className="w-4 h-4 text-orange-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('guide_credit_toilet_reg', '화장실 등록')}</h3>
                                </div>
                                <div className="flex justify-end items-end">
                                    <span className="text-lg font-black text-orange-500">+{policy.toiletSubmit}</span>
                                    <span className="text-xs text-gray-400 mb-1 ml-0.5">C</span>
                                </div>
                            </div>

                            {/* 3. Level Up */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-lg shrink-0">
                                        <Crown className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('guide_credit_level_up', '등급 상승')}</h3>
                                </div>
                                <div className="flex justify-end items-end">
                                    <span className="text-lg font-black text-amber-500">+{levelUpReward}</span>
                                    <span className="text-xs text-gray-400 mb-1 ml-0.5">C</span>
                                </div>
                            </div>

                            {/* 4. Review */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg shrink-0">
                                        <Star className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('guide_credit_write_review', '리뷰 작성')}</h3>
                                </div>
                                <div className="flex justify-end items-end">
                                    <span className="text-lg font-black text-blue-500">+{policy.reviewSubmit}</span>
                                    <span className="text-xs text-gray-400 mb-1 ml-0.5">C</span>
                                </div>
                            </div>

                            {/* 5. Report */}
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-lg shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-purple-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-sm">{t('guide_credit_report', '신고 접수')}</h3>
                                </div>
                                <div className="flex justify-end items-end">
                                    <span className="text-lg font-black text-purple-500">+{policy.reportSubmit}</span>
                                    <span className="text-xs text-gray-400 mb-1 ml-0.5">C</span>
                                </div>
                            </div>

                            {/* 6. Unlock */}
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1.5 bg-white dark:bg-gray-600 rounded-lg shrink-0 border border-gray-100 dark:border-gray-500">
                                        <Heart className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                    </div>
                                    <h3 className="font-bold text-gray-600 dark:text-gray-300 text-sm">{t('guide_credit_unlock', '비번 열람')}</h3>
                                </div>
                                <div className="flex justify-end items-end">
                                    <span className="text-lg font-black text-gray-600 dark:text-gray-400">-{policy.unlockCost}</span>
                                    <span className="text-xs text-gray-400 mb-1 ml-0.5">C</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Etiquette Section */}
                    <div ref={sectionRefs.etiquette} className="space-y-6 pt-4 pb-12 scroll-mt-32">
                        <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-6 h-6 text-brand-secondary" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('guide_etiquette_title', '지켜주세요 (약속)')}</h2>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
                            <div className="flex gap-4">
                                <div className="shrink-0 mt-1">
                                    <CheckCircle2 className="w-5 h-5 text-brand-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('guide_etiquette_fake_title', '허위 정보는 No!')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" dangerouslySetInnerHTML={{ __html: t('guide_etiquette_fake_desc', '엉뚱한 위치나 틀린 비밀번호는 곤란해요.<br />급한 사람을 두 번 울리지 말아주세요. 😭') }} />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 mt-1">
                                    <CheckCircle2 className="w-5 h-5 text-brand-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('guide_etiquette_spam_title', '도배는 참아주세요')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" dangerouslySetInnerHTML={{ __html: t('guide_etiquette_spam_desc', '점수를 위해 의미 없는 글을 반복하면,<br />관리자가 슬퍼하며 차단할 수 있습니다.') }} />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="shrink-0 mt-1">
                                    <CheckCircle2 className="w-5 h-5 text-brand-secondary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{t('guide_etiquette_respect_title', '서로 존중해요')}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1" dangerouslySetInnerHTML={{ __html: t('guide_etiquette_respect_desc', '리뷰도 소통입니다. <br />고운 말을 쓰면 복이 와요! (그리고 점수도요)') }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3">
                        <button
                            onClick={() => setShowContactModal(true)}
                            className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <HelpCircle className="w-5 h-5" />
                            {t('contact_title', '문의하기')}
                        </button>
                        <button
                            onClick={() => window.location.hash = '#/'}
                            className="w-full py-4 bg-gray-900 dark:bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors shadow-lg"
                        >
                            {t('go_home_full', '홈으로 돌아가기')}
                        </button>
                    </div>
                </div>

                {/* Contact Modal */}
                {user && (
                    <ContactModal
                        isOpen={showContactModal}
                        onClose={() => setShowContactModal(false)}
                        user={user}
                    />
                )}
            </div>
        </TextLayout>
    );
};

export default UsageGuidePage;
