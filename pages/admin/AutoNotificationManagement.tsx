import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, MessageSquare } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';

export const AutoNotificationManagement: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    // State
    const [settings, setSettings] = useState({
        msg_review_reminder: '',
        msg_review_received: '',
        msg_report_received: '',
        msg_nightlife_mon: '',
        msg_nightlife_tue: '',
        msg_nightlife_wed: '',
        msg_nightlife_thu: '',
        msg_nightlife_fri: '',
        msg_nightlife_sat: '',
        msg_nightlife_sun: '',
        msg_milestone_reached: '',
        milestone_threshold: '',
        msg_level_up: '',
        msg_point_gift: '',
        msg_new_toilet_nearby: '',
        new_toilet_radius: ''
    });

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const keys = Object.keys(settings);
            const values = await Promise.all(keys.map(k => db.getSystemSetting(k, '')));

            const newSettings: any = {};
            keys.forEach((k, i) => newSettings[k] = values[i]);

            // Set defaults if empty (Optional based on your preference, or rely on placeholder)
            setSettings(newSettings);
        } catch (e) {
            console.error(e);
            alert('설정을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const handleChange = (key: string, value: string) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async (key: string, desc: string) => {
        const val = (settings as any)[key];
        setIsLoading(true);
        try {
            await db.setSystemSetting(key, val, desc);
            alert('저장되었습니다.');
        } catch (e) {
            console.error(e);
            alert('저장에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const renderInput = (key: string, label: string, desc: string, placeholder: string, type: 'text' | 'textarea' = 'textarea') => (
        <div className="mb-6">
            <div className="mb-2">
                <label className="block text-sm font-bold text-gray-900 mb-1">{label}</label>
                <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <div className="flex gap-4">
                {type === 'textarea' ? (
                    <textarea
                        value={(settings as any)[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 min-h-[80px] text-sm"
                    />
                ) : (
                    <input
                        type="text"
                        value={(settings as any)[key]}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={placeholder}
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                )}
                <button
                    onClick={() => handleSave(key, label)}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 h-fit self-end shrink-0 text-sm"
                >
                    저장
                </button>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-8">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="w-8 h-8 text-blue-600" />
                    자동 알림 관리
                </h2>
                <button
                    onClick={loadSettings}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Section 1: Reviews & Reports */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">📝 리뷰 및 신고</h3>
                {renderInput('msg_review_reminder', '리뷰 작성 유도 (퇴장 5분 후)', '사용자가 화장실 상세 조회 후 5분 뒤 발송', '방금 이용하신 화장실은 어떠셨나요?')}
                {renderInput('msg_review_received', '내 화장실 리뷰 등록 알림', '내 화장실에 새 리뷰가 달렸을 때 (변수: [name])', '[name] 화장실에 새로운 리뷰가 등록되었습니다.')}
                {renderInput('msg_report_received', '내 화장실 신고 접수 알림', '내 화장실에 신고가 접수되었을 때 (변수: [name], [reason])', '[name] 화장실에 대한 신고가 접수되었습니다. (사유: [reason])')}
            </div>

            {/* Section 2: Nightlife (Daily) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">🌙 야간/주말 알림 (요일별)</h3>
                <p className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg">
                    고정형(랜덤 요일 1회) 및 스마트형(이동 감지 시) 모두 이 메시지를 사용합니다.
                </p>
                {renderInput('msg_nightlife_mon', '월요일 메시지', '월요일 발송 문구', '월요병엔...')}
                {renderInput('msg_nightlife_tue', '화요일 메시지', '화요일 발송 문구', '화요일엔...')}
                {renderInput('msg_nightlife_wed', '수요일 메시지', '수요일 발송 문구', '수요일엔...')}
                {renderInput('msg_nightlife_thu', '목요일 메시지', '목요일 발송 문구', '목요일엔...')}
                {renderInput('msg_nightlife_fri', '금요일 메시지', '금요일 발송 문구', '불금엔...')}
                {renderInput('msg_nightlife_sat', '토요일 메시지', '토요일 발송 문구 (스마트 모드)', '즐거운 토요일...')}
                {renderInput('msg_nightlife_sun', '일요일 메시지', '일요일 발송 문구 (스마트 모드)', '일요일 마무리...')}
            </div>

            {/* Section 3: Milestone & Rewards */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">🏆 성과 및 보상</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderInput('milestone_threshold', '조회수 달성 기준 (명)', '몇 명 단위로 알림을 보낼지 설정 (예: 10)', '10', 'text')}
                    {renderInput('new_toilet_radius', '신규 화장실 알림 반경 (km)', '주변 신규 화장실 검색 반경 (예: 2.0)', '2.0', 'text')}
                </div>
                {renderInput('msg_milestone_reached', '조회수 달성 알림', '조회수 달성 시 (변수: [name], [count])', '축하합니다! [name] 화장실이 [count]명 돌파!')}
                {renderInput('msg_level_up', '레벨 업 알림', '사용자 레벨 상승 시 (변수: [old], [new], [reward])', '축하합니다! [new] 등급이 되셨습니다!')}
                {renderInput('msg_point_gift', '포인트 선물 알림', '관리자 포인트 지급 시 (변수: [amount], [reason])', '관리자로부터 [amount]크레딧 선물이 도착했습니다! (사유: [reason])')}
                {renderInput('msg_new_toilet_nearby', '주변 신규 화장실 알림', '주변에 새 화장실 등록 시 (변수: [radius], [count])', '내 주변 [radius]km 내에 [count]개의 새 화장실이!')}
            </div>
        </div>
    );
};
