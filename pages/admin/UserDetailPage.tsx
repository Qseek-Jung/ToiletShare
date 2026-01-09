import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Star, TrendingUp, AlertTriangle, MessageSquare, History, Award, Trash2, Ban, ShieldAlert, Loader2 } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { User, UserRole, UserStatus, Gender, CreditHistory } from '../../types';
import { supabase } from '../../services/supabase';
import { LevelIcon } from '../../components/LevelIcon';

const LEVEL_NAMES: Record<number, string> = {
    0: '손 (Lv.0)',
    1: '지푸라기 (Lv.1)',
    2: '신문지 (Lv.2)',
    3: '두루마리 (Lv.3)',
    4: '각티슈 (Lv.4)',
    5: '물티슈 (Lv.5)',
    6: '비데 (Lv.6)',
};

interface UserDetailPageProps {
    userId: string;
    onBack: () => void;
}

export const UserDetailPage: React.FC<UserDetailPageProps> = ({ userId, onBack }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [referrerEmail, setReferrerEmail] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'history' | 'danger'>('info');

    // Stats
    const [stats, setStats] = useState({
        toilets: 0,
        reviews: 0,
        reports: 0,
        reportsResolved: 0
    });

    // History
    const [history, setHistory] = useState<CreditHistory[]>([]);

    // Modals
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [scoreAdjustAmount, setScoreAdjustAmount] = useState(0);
    const [scoreAdjustReason, setScoreAdjustReason] = useState('');

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isBanMode, setIsBanMode] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [transferContent, setTransferContent] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Credit Modal
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [creditAdjustAmount, setCreditAdjustAmount] = useState(0);
    const [creditAdjustReason, setCreditAdjustReason] = useState('');

    // Role Management
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);

    useEffect(() => {
        loadUser();
    }, [userId]);

    const loadUser = async () => {
        setLoading(true);
        try {
            // 1. Load User
            const { data: userData, error } = await supabase.from('users').select('*').eq('id', userId).single();
            if (error) throw error;

            // Map DB fields to Type
            const mappedUser: User = {
                id: userData.id,
                email: userData.email,
                nickname: userData.nickname,
                gender: userData.gender as Gender,
                role: userData.role as UserRole,
                credits: userData.credits,
                status: userData.status as UserStatus,
                activityScore: userData.activity_score,
                level: userData.level,
                levelOverride: userData.level_override,
                createdAt: userData.created_at,
                lastLogin: userData.last_login,
                referrerId: userData.referrer_id
            };
            setUser(mappedUser);

            // 1.5 Load Referrer if exists
            if (mappedUser.referrerId) {
                const { data: refData } = await supabase.from('users').select('email').eq('id', mappedUser.referrerId).single();
                if (refData) setReferrerEmail(refData.email);
            }

            // 2. Load Stats (Using the View we created)
            const { data: statsData } = await supabase.from('user_activity_stats').select('*').eq('user_id', userId).single();
            if (statsData) {
                setStats({
                    toilets: statsData.toilet_count || 0,
                    reviews: statsData.review_count || 0,
                    reports: statsData.report_total_count || 0,
                    reportsResolved: statsData.report_success_count || 0
                });
            }

            // 3. Load History
            const { data: historyData } = await supabase
                .from('credit_history')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (historyData) {
                setHistory(historyData.map((h: any) => ({
                    id: h.id,
                    userId: h.user_id,
                    amount: h.amount,
                    type: h.type,
                    referenceType: h.reference_type,
                    referenceId: h.reference_id,
                    description: h.description,
                    createdAt: h.created_at
                })));
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleScoreAdjust = async () => {
        if (!user || scoreAdjustAmount === 0) return;
        setProcessing(true);
        try {
            await db.updateActivityScore(user.id, scoreAdjustAmount, scoreAdjustReason || '관리자 수동 조정');
            // Refresh
            await loadUser();
            setShowScoreModal(false);
            setScoreAdjustAmount(0);
            setScoreAdjustReason('');
            alert('점수가 조정되었습니다.');
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        } finally {
            setProcessing(false);
        }
    };

    const handleCreditAdjust = async () => {
        if (!user || creditAdjustAmount === 0) return;
        setProcessing(true);
        try {
            if (creditAdjustAmount > 0) {
                // Use giveUserPoints for positive amounts (Triggers Notification)
                await db.giveUserPoints(
                    user.id,
                    creditAdjustAmount,
                    creditAdjustReason || '관리자 수동 지급'
                );
            } else {
                // Standard deduction (No Gift Notification)
                await db.updateUserCredits(user.id, creditAdjustAmount);
                await db.logCreditTransaction(
                    user.id,
                    creditAdjustAmount,
                    'admin_adjust',
                    'admin',
                    'manual',
                    creditAdjustReason || '관리자 수동 차감'
                );
            }

            await loadUser();
            setShowCreditModal(false);
            setCreditAdjustAmount(0);
            setCreditAdjustReason('');
            alert('크래딧이 조정되었습니다.');
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!user) return;
        setProcessing(true);
        try {
            await db.deleteUserWithContentHandler(user.id, transferContent, isBanMode, banReason); // Type definition in db_supabase needs to match this usage
            alert(isBanMode ? '사용자가 차단되었습니다.' : '사용자가 삭제되었습니다.');
            onBack();
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다.');
        } finally {
            setProcessing(false);
        }
    };

    const handleRoleUpdate = async (newRole: UserRole) => {
        if (!user) return;
        // Confirmation removed as per request for immediate update

        setIsUpdatingRole(true);
        try {
            await db.updateUserRole(user.id, newRole);
            await loadUser(); // Refresh
            alert('권한이 변경되었습니다.');
        } catch (e) {
            console.error(e);
            alert('권한 변경에 실패했습니다.');
        } finally {
            setIsUpdatingRole(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (!user) {
        return <div className="p-8 text-center text-red-500">사용자를 찾을 수 없습니다.</div>;
    }

    return (
        <div className="w-full bg-gray-50 h-screen overflow-y-auto pb-20">
            {/* Header */}
            <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <span>{user.nickname || '익명'}</span>
                        <span className="text-sm font-normal text-gray-500">({user.email})</span>
                        {user.status === 'banned' && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold">차단됨</span>}
                        {user.status === 'withdrawn' && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold">탈퇴</span>}
                    </h1>
                    <div className="text-xs text-gray-400 mt-1">
                        가입일: {new Date(user.createdAt!).toLocaleDateString()} | 최근 접속: {new Date(user.lastLogin!).toLocaleDateString()}
                    </div>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    {/* Role Selector */}
                    <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border">
                        <span className="text-xs font-bold text-gray-500">권한 설정:</span>
                        <select
                            value={user.role}
                            onChange={(e) => handleRoleUpdate(e.target.value as UserRole)}
                            disabled={isUpdatingRole}
                            className={`text-xs font-bold px-2 py-1 rounded border-none outline-none cursor-pointer ${user.role === UserRole.ADMIN ? 'text-red-600 bg-red-50' :
                                user.role === UserRole.VIP ? 'text-purple-600 bg-purple-50' : 'text-gray-700 bg-white'
                                }`}
                        >
                            <option value={UserRole.USER}>USER</option>
                            <option value={UserRole.VIP}>VIP</option>
                            <option value={UserRole.ADMIN}>ADMIN</option>
                        </select>
                        {isUpdatingRole && <Loader2 className="w-3 h-3 animate-spin text-gray-400" />}
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-5xl mx-auto space-y-6">

                {/* 1. Level & Score Card */}
                <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col md:flex-row gap-8 items-center md:items-start">
                    <div className="flex flex-col items-center">
                        <LevelIcon
                            level={user.level || 0}
                            size="xl"
                            className="mb-3"
                        />
                        <div className="text-lg font-black text-gray-800">{LEVEL_NAMES[user.level || 0]}</div>
                        {user.levelOverride && <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full mt-1">관리자 고정</span>}
                    </div>

                    <div className="flex-1 w-full space-y-4">
                        <div>
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-sm font-bold text-gray-500">활동 점수 (Cleaning Class)</label>
                                <span className="text-2xl font-black text-blue-600">{user.activityScore?.toFixed(1) || 0} <span className="text-sm text-gray-400 font-normal">점</span></span>
                            </div>
                            <div className="relative pt-1">
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mb-1">
                                    <div
                                        className="bg-blue-500 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, ((user.activityScore || 0) / 400) * 100)}%` }}
                                    />
                                </div>
                                {/* Level Ticks */}
                                <div className="relative h-4 text-[10px] text-gray-400 font-bold mt-1">
                                    <div className="absolute left-0 transform -translate-x-0">0</div>
                                    <div className="absolute left-[2.5%] transform -translate-x-1/2">1</div>
                                    <div className="absolute left-[7.5%] transform -translate-x-1/2">2</div>
                                    <div className="absolute left-[17.5%] transform -translate-x-1/2">3</div>
                                    <div className="absolute left-[37.5%] transform -translate-x-1/2">4</div>
                                    <div className="absolute left-[62.5%] transform -translate-x-1/2">5</div>
                                    <div className="absolute right-0 transform translate-x-0">6</div>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 text-right">다음 레벨까지 열심히 활동하게 독려해주세요!</p>
                        </div>

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowScoreModal(true)} className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" /> 점수 조정
                            </button>
                            {/* <button className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1">
                                <Award className="w-3 h-3" /> 레벨 변경 (점수 기반 자동)
                            </button> */}
                        </div>
                    </div>
                </div>

                {/* 2. Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div
                        onClick={() => window.location.hash = `#/admin?section=toilets&search=${user.email}`}
                        className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                        <div className="text-gray-400 text-xs font-bold mb-1 group-hover:text-blue-600">등록한 화장실</div>
                        <div className="text-2xl font-black text-gray-800 group-hover:text-blue-600 flex items-center gap-2">
                            {stats.toilets}
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div
                        onClick={() => window.location.hash = `#/admin?section=reviews&search=${user.email}`}
                        className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                        <div className="text-gray-400 text-xs font-bold mb-1 group-hover:text-blue-600">작성한 리뷰</div>
                        <div className="text-2xl font-black text-gray-800 group-hover:text-blue-600 flex items-center gap-2">
                            {stats.reviews}
                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <div
                        onClick={() => setShowCreditModal(true)}
                        className="bg-white p-4 rounded-xl border shadow-sm cursor-pointer hover:bg-amber-50 hover:border-amber-200 transition-all group"
                    >
                        <div className="text-gray-400 text-xs font-bold mb-1 group-hover:text-amber-600 transition-colors">보유 크래딧 (클릭하여 조정)</div>
                        <div className="text-2xl font-black text-amber-500 group-hover:scale-105 transition-transform origin-left">{user.credits}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                        <div className="text-gray-400 text-xs font-bold mb-1">신고 성공률</div>
                        <div className="text-2xl font-black text-green-600">
                            {stats.reports > 0 ? Math.round((stats.reportsResolved / stats.reports) * 100) : 0}%
                            <span className="text-xs text-gray-300 ml-1 font-normal">({stats.reportsResolved}/{stats.reports})</span>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b">
                    <button onClick={() => setActiveTab('info')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        상세 정보
                    </button>
                    <button onClick={() => setActiveTab('history')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        활동 내역
                    </button>
                    <button onClick={() => setActiveTab('danger')} className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'danger' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-400 hover:text-red-400'}`}>
                        위험 구역
                    </button>
                </div>

                {/* Tab Content */}
                <div className="min-h-[300px]">
                    {activeTab === 'info' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Shortcuts */}
                                <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                                    <h3 className="font-bold text-gray-800 mb-2">바로가기</h3>
                                    <a href={`#/admin?section=toilets&search=${user.id}`} className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex justify-between">
                                        <span>🚽 사용자가 등록한 화장실 보기</span>
                                        <span className="font-bold">{stats.toilets}건</span>
                                    </a>
                                    <a href={`#/admin?section=reviews&userId=${user.id}`} className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex justify-between">
                                        <span>📝 사용자가 작성한 리뷰 보기</span>
                                        <span className="font-bold">{stats.reviews}건</span>
                                    </a>
                                    <a href={`#/admin?section=reports&reporterId=${user.id}`} className="block w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors flex justify-between">
                                        <span>🚨 신고 내역 보기</span>
                                        <span className="font-bold">{stats.reports}건</span>
                                    </a>
                                </div>
                            </div>

                            {/* Referrer Info */}
                            <div className="bg-white rounded-xl shadow-sm border p-4 space-y-3">
                                <h3 className="font-bold text-gray-800 mb-2">가입 정보</h3>
                                <div className="text-sm">
                                    <span className="text-gray-500 block mb-1">추천인 (Referrer)</span>
                                    {referrerEmail ? (
                                        <div className="font-bold text-blue-600 flex items-center gap-2">
                                            <span className="bg-blue-50 px-2 py-1 rounded">{referrerEmail}</span>
                                            <span className="text-xs text-gray-400 font-normal">님을 통해 가입</span>
                                        </div>
                                    ) : (
                                        <div className="text-gray-400">-</div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'history' && (
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                                    <tr>
                                        <th className="px-4 py-3">일시</th>
                                        <th className="px-4 py-3">유형</th>
                                        <th className="px-4 py-3">내용</th>
                                        <th className="px-4 py-3 text-right">변동</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {history.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-gray-500 text-xs">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                {item.type === 'score_change' ? (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-600">활동 점수</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-600">크래딧</span>
                                                )}
                                                <div className="text-[10px] text-gray-400 mt-0.5 font-normal">{item.type}</div>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {item.description}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-bold ${item.amount > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                {item.amount > 0 ? '+' : ''}{item.amount}
                                                <span className="text-xs ml-0.5 text-gray-400">
                                                    {item.type === 'score_change' ? '점' : 'C'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-gray-400">내역이 없습니다.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <div className="bg-red-50 rounded-xl border border-red-100 p-6 space-y-6">
                            <div>
                                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5" />
                                    위험 구역
                                </h3>
                                <p className="text-sm text-red-600 mt-1">
                                    사용자 계정 삭제 및 차단은 되돌릴 수 없거나 복구가 어렵습니다. 신중하게 진행해주세요.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button onClick={() => { setIsBanMode(true); setShowDeleteModal(true); }} className="w-full bg-white border border-red-200 text-red-600 px-4 py-3 rounded-lg font-bold hover:bg-red-50 text-left flex items-center gap-3 transition-colors">
                                    <Ban className="w-5 h-5" />
                                    <div>
                                        <div>사용자 정지 (Ban)</div>
                                        <div className="text-xs font-normal opacity-70">로그인을 차단하고 접근을 제한합니다. 데이터는 유지됩니다.</div>
                                    </div>
                                </button>
                                <button onClick={() => { setIsBanMode(false); setShowDeleteModal(true); }} className="w-full bg-red-600 border border-red-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-red-700 text-left flex items-center gap-3 transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                    <div>
                                        <div>계정 삭제 (Delete)</div>
                                        <div className="text-xs font-normal opacity-80">계정을 영구적으로 삭제합니다. 작성한 콘텐츠는 '관리자'에게 이관됩니다.</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div >

            {
                showScoreModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">활동 점수 조정</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">조정 점수 (+/-)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={scoreAdjustAmount || ''}
                                            onChange={(e) => setScoreAdjustAmount(Number(e.target.value))}
                                            className="w-full border rounded-lg p-3 text-center font-bold text-lg"
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">사유</label>
                                    <input
                                        type="text"
                                        value={scoreAdjustReason}
                                        onChange={(e) => setScoreAdjustReason(e.target.value)}
                                        placeholder="예: 우수 리뷰 보상"
                                        className="w-full border rounded-lg p-2 text-sm"
                                    />
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setShowScoreModal(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-xl">취소</button>
                                    <button onClick={handleScoreAdjust} disabled={processing} className="flex-1 py-3 bg-blue-600 font-bold text-white rounded-xl">확인</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Credit Adjust Modal */}
            {
                showCreditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="text-amber-500">💰</span> 크래딧 조정
                            </h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">조정 금액 (추가/차감)</label>
                                    <div className="space-y-2">
                                        <input
                                            type="number"
                                            value={creditAdjustAmount || ''}
                                            onChange={(e) => setCreditAdjustAmount(Number(e.target.value))}
                                            className={`w-full border rounded-lg p-3 text-center font-black text-2xl ${creditAdjustAmount > 0 ? 'text-green-600 border-green-200 bg-green-50' :
                                                creditAdjustAmount < 0 ? 'text-red-600 border-red-200 bg-red-50' : 'text-gray-400'
                                                }`}
                                            placeholder="0"
                                            autoFocus
                                        />
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => setCreditAdjustAmount(prev => prev + 10)} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-bold hover:bg-green-100">+10</button>
                                            <button onClick={() => setCreditAdjustAmount(prev => prev + 100)} className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-bold hover:bg-green-100">+100</button>
                                            <button onClick={() => setCreditAdjustAmount(prev => prev - 10)} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-bold hover:bg-red-100">-10</button>
                                            <button onClick={() => setCreditAdjustAmount(prev => prev - 100)} className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-bold hover:bg-red-100">-100</button>
                                        </div>
                                        <p className="text-center text-xs text-gray-400">
                                            {creditAdjustAmount > 0 ? '사용자에게 크래딧을 지급합니다.' :
                                                creditAdjustAmount < 0 ? '사용자의 크래딧을 차감합니다.' : '금액을 입력해주세요.'}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">사유</label>
                                    <input
                                        type="text"
                                        value={creditAdjustReason}
                                        onChange={(e) => setCreditAdjustReason(e.target.value)}
                                        placeholder="예: 이벤트 당첨, 오지급 회수"
                                        className="w-full border rounded-lg p-2 text-sm"
                                    />
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setShowCreditModal(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-xl">취소</button>
                                    <button onClick={handleCreditAdjust} disabled={processing || creditAdjustAmount === 0} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 font-bold text-white rounded-xl transition-colors shadow-lg shadow-amber-200">
                                        확인
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete/Ban User Modal */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                            <div className="flex justify-center mb-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isBanMode ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                    {isBanMode ? <Ban className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                                {isBanMode ? '사용자 차단' : '사용자 삭제'}
                            </h3>
                            <p className="text-sm text-gray-500 text-center mb-6">
                                {user?.email} 님을<br />
                                {isBanMode ? '영구 차단하시겠습니까?' : '삭제하시겠습니까?'}
                            </p>

                            <div className="space-y-4">
                                {isBanMode && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">차단 사유 (필수)</label>
                                        <textarea
                                            value={banReason}
                                            onChange={(e) => setBanReason(e.target.value)}
                                            className="w-full border rounded-lg p-2 text-sm h-20 resize-none"
                                            placeholder="악성 리뷰 반복 작성 등..."
                                        />
                                    </div>
                                )}

                                <div className="bg-gray-50 p-3 rounded-lg flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        id="transferContent"
                                        checked={transferContent}
                                        onChange={(e) => setTransferContent(e.target.checked)}
                                        className="mt-1"
                                    />
                                    <label htmlFor="transferContent" className="text-xs text-gray-600 cursor-pointer select-none">
                                        <span className="font-bold text-gray-800">작성 콘텐츠 이관 (권장)</span><br />
                                        사용자가 작성한 리뷰, 화장실 정보를 관리자 계정으로 이관합니다. 체크 해제 시 모두 삭제됩니다.
                                    </label>
                                </div>

                                <div className="flex gap-2 mt-2">
                                    <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-xl">취소</button>
                                    <button onClick={handleDeleteUser} disabled={processing || (isBanMode && !banReason)} className={`flex-1 py-3 font-bold text-white rounded-xl ${isBanMode ? 'bg-red-600' : 'bg-orange-600'}`}>
                                        {isBanMode ? '차단하기' : '삭제하기'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
