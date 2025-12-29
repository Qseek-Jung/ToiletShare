import React, { useState, useEffect } from 'react';
import { Coins, RotateCcw, Save, UserPlus, MapPin, Star, Flag, Key, Play, Loader2, Award, Lock } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { CreditPolicy, DEFAULT_CREDIT_POLICY } from '../../types';

export const CreditPolicyManagement: React.FC = () => {
    const [policy, setPolicy] = useState<CreditPolicy>(DEFAULT_CREDIT_POLICY);
    const [originalPolicy, setOriginalPolicy] = useState<CreditPolicy>(DEFAULT_CREDIT_POLICY);
    const [levelUpReward, setLevelUpReward] = useState<number>(10);
    const [originalLevelUpReward, setOriginalLevelUpReward] = useState<number>(10);
    const [hasChanges, setHasChanges] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchPolicy = async () => {
            setLoading(true);
            try {
                const [currentPolicy, rewardStr] = await Promise.all([
                    db.getCreditPolicy(),
                    db.getSystemSetting('level_up_reward', '10')
                ]);
                setPolicy(currentPolicy);
                setOriginalPolicy(currentPolicy);

                const reward = parseInt(rewardStr, 10);
                setLevelUpReward(reward);
                setOriginalLevelUpReward(reward);
            } finally {
                setLoading(false);
            }
        };
        fetchPolicy();
    }, []);

    useEffect(() => {
        const policyChanged = JSON.stringify(policy) !== JSON.stringify(originalPolicy);
        const rewardChanged = levelUpReward !== originalLevelUpReward;
        setHasChanges(policyChanged || rewardChanged);
    }, [policy, originalPolicy, levelUpReward, originalLevelUpReward]);

    const handleChange = (key: keyof CreditPolicy, value: number) => {
        if (key === 'unlockCost') {
            // Unlock cost is displayed as negative (deduction) but stored as positive
            setPolicy({ ...policy, [key]: Math.abs(value) });
            return;
        }
        if (value < 0) return; // Prevent negative values
        setPolicy({ ...policy, [key]: value });
    };

    const handleReset = () => {
        setPolicy({ ...DEFAULT_CREDIT_POLICY });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Policy Rule: Ad View Reward = Unlock Cost
            // Ensure adView is always equal to unlockCost before saving
            const finalPolicy = {
                ...policy,
                adView: policy.unlockCost
            };

            await Promise.all([
                db.saveCreditPolicy(finalPolicy),
                db.setSystemSetting('level_up_reward', levelUpReward.toString(), 'Credits awarded on level up')
            ]);

            setPolicy(finalPolicy); // Update local state to reflect the sync
            setOriginalPolicy(finalPolicy);
            setOriginalLevelUpReward(levelUpReward);
            setShowConfirmModal(false);
            alert('크래딧 정책이 저장되었습니다!');
        } finally {
            setSaving(false);
        }
    };

    const policyItems = [
        { key: 'signup' as keyof CreditPolicy, label: '회원가입', icon: UserPlus, color: 'bg-blue-500', description: '새 회원이 가입할 때' },
        { key: 'toiletSubmit' as keyof CreditPolicy, label: '화장실 등록', icon: MapPin, color: 'bg-green-500', description: '새 화장실을 등록할 때' },
        { key: 'reviewSubmit' as keyof CreditPolicy, label: '리뷰 작성', icon: Star, color: 'bg-yellow-500', description: '화장실 리뷰를 작성할 때' },
        { key: 'reportSubmit' as keyof CreditPolicy, label: '신고 접수', icon: Flag, color: 'bg-red-500', description: '화장실을 신고할 때' },

        // adView is hidden and auto-synced with unlockCost
        { key: 'unlockCost' as keyof CreditPolicy, label: '비번열람차감/광고시청적립', icon: Lock, color: 'bg-gray-600', description: '비번 열람 시 차감 (광고 시청 시 동일 금액 지급)' },
        { key: 'referralReward' as keyof CreditPolicy, label: '친구 초대', icon: UserPlus, color: 'bg-indigo-500', description: '초대받은 친구가 가입할 때 (추천인에게 지급)' },
        { key: 'ownerReviewReward' as keyof CreditPolicy, label: '내 화장실 리뷰받음', icon: Star, color: 'bg-yellow-600', description: '내 화장실에 타인이 리뷰를 남길 때 (작성자 지급)' },
        { key: 'ownerUnlockReward' as keyof CreditPolicy, label: '내 화장실(비번) 열람', icon: Award, color: 'bg-teal-500', description: '내 화장실을 타인이 열람할 때 (작성자 지급)' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                <span className="ml-2 text-gray-500">정책 불러오는 중...</span>
            </div>
        );
    }

    const renderPolicyCard = (item: any) => {
        const Icon = item.icon;
        const rawValue = policy[item.key as keyof CreditPolicy];
        const currentValue = rawValue;

        const originalRaw = originalPolicy[item.key as keyof CreditPolicy];
        const originalValue = originalRaw;

        const isChanged = rawValue !== originalRaw;

        return (
            <div
                key={item.key}
                className={`bg-white rounded-xl border-2 p-5 shadow-sm transition-all ${isChanged ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'
                    }`}
            >
                <div className="flex items-start gap-4">
                    <div className={`${item.color} rounded-lg p-3 shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-1">{item.label}</h3>
                        <p className="text-xs text-gray-500 mb-3">{item.description}</p>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                value={currentValue}
                                onChange={(e) => handleChange(item.key as keyof CreditPolicy, parseInt(e.target.value) || 0)}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg font-bold text-center focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                            />
                            <span className="text-sm font-medium text-gray-600">크래딧</span>
                            {isChanged && (
                                <span className="ml-auto text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                                    변경됨 ({originalValue} → {currentValue})
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center gap-3 mb-2">
                    <Coins className="w-8 h-8" />
                    <h2 className="text-2xl font-black">크래딧 정책 관리</h2>
                </div>
                <p className="text-amber-50 text-sm">각 활동별로 지급되는 크래딧 양을 설정합니다.</p>
            </div>

            {/* 1. 활동 보상 (Earnings) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                    활동 보상 (적립)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {policyItems.filter(i => ['signup', 'referralReward', 'toiletSubmit', 'reviewSubmit', 'reportSubmit'].includes(i.key)).map((item) => renderPolicyCard(item))}

                    {/* Level Up Reward (Custom Card) */}
                    <div className={`bg-white rounded-xl border-2 p-5 shadow-sm transition-all ${levelUpReward !== originalLevelUpReward ? 'border-amber-400 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                        <div className="flex items-start gap-4">
                            <div className="bg-indigo-500 rounded-lg p-3 shrink-0">
                                <Award className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 mb-1">레벨업 보상</h3>
                                <p className="text-xs text-gray-500 mb-3">사용자 등급(Class)이 상승할 때</p>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="number"
                                        min="0"
                                        value={levelUpReward}
                                        onChange={(e) => setLevelUpReward(parseInt(e.target.value) || 0)}
                                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg font-bold text-center focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                                    />
                                    <span className="text-sm font-medium text-gray-600">크래딧</span>
                                    {levelUpReward !== originalLevelUpReward && (
                                        <span className="ml-auto text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">
                                            변동 ({originalLevelUpReward} → {levelUpReward})
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. 크리에이터 보상 (Owner Rewards) */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-1 h-6 bg-teal-500 rounded-full"></span>
                    크리에이터 보상 (내 화장실)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {policyItems.filter(i => ['ownerReviewReward', 'ownerUnlockReward'].includes(i.key)).map((item) => renderPolicyCard(item))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                    사용 및 차감
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {policyItems.filter(i => ['unlockCost'].includes(i.key)).map((item) => renderPolicyCard(item))}
                </div>
            </div>


            {/* Action Buttons */}
            <div className="flex gap-3 sticky bottom-0 bg-white p-4 border-t border-gray-200 -mx-4 z-10 shadow-inner">
                <button
                    onClick={handleReset}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                    <RotateCcw className="w-5 h-5" />
                    기본값으로 초기화
                </button>
                <button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={!hasChanges || saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ml-auto ${hasChanges && !saving
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? '저장 중...' : '변경 사항 저장'}
                </button>
            </div>

            {/* Confirmation Modal */}
            {
                showConfirmModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                                    <Coins className="w-8 h-8 text-amber-500" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2">크래딧 정책을 변경하시겠습니까?</h3>
                            <p className="text-gray-600 text-center text-sm mb-6">
                                변경된 정책은 즉시 적용되며,<br />
                                이후 모든 활동에 새로운 크래딧 양이 지급됩니다.
                            </p>

                            {/* Changes Summary */}
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                                <div className="text-xs font-bold text-gray-500 mb-2">변경 사항:</div>
                                {policyItems.map((item) => {
                                    const current = policy[item.key];
                                    const original = originalPolicy[item.key];
                                    if (current !== original) {
                                        return (
                                            <div key={item.key} className="flex justify-between text-sm">
                                                <span className="text-gray-700">{item.label}</span>
                                                <span className="font-bold text-amber-600">
                                                    {original} → {current} 크래딧
                                                </span>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}

                                {levelUpReward !== originalLevelUpReward && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-700">레벨업 보상</span>
                                        <span className="font-bold text-amber-600">
                                            {originalLevelUpReward} → {levelUpReward} 크래딧
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowConfirmModal(false)}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-gray-100 rounded-xl font-bold hover:bg-gray-200"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '저장'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default CreditPolicyManagement;
