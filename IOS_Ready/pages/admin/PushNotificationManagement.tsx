import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Send, Filter, Users, TrendingUp, CheckCircle, XCircle, User as UserIcon, Loader2 } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { UserRole, Gender, PushNotification, User, NotificationType } from '../../types';
import { AlertModal } from '../../components/AlertModal';

interface PushNotificationManagementProps {
    onRefresh: () => void;
}

export const PushNotificationManagement: React.FC<PushNotificationManagementProps> = ({ onRefresh }) => {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [allNotifications, setAllNotifications] = useState<PushNotification[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [sending, setSending] = useState(false);

    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [filterGender, setFilterGender] = useState<'all' | Gender>('all');
    const [filterRole, setFilterRole] = useState<'all' | UserRole>('all');
    const [filterCreditsMin, setFilterCreditsMin] = useState<number>(0);
    const [filterCreditsMax, setFilterCreditsMax] = useState<number>(1000);
    const [searchEmail, setSearchEmail] = useState('');
    const [messageTitle, setMessageTitle] = useState('');
    const [messageContent, setMessageContent] = useState('');
    const [showPreview, setShowPreview] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean;
        message: string;
        type: 'success' | 'confirm' | 'error';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        message: '',
        type: 'success'
    });

    const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

    const loadData = async () => {
        setLoadingData(true);
        try {
            const [users, notifications] = await Promise.all([
                db.getUsers(),
                db.getAllNotifications()
            ]);
            setAllUsers(users.filter(u => u.role !== UserRole.GUEST));
            setAllNotifications(notifications);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter users
    const filteredUsers = useMemo(() => {
        return allUsers.filter(user => {
            if (searchEmail && !user.email.toLowerCase().includes(searchEmail.toLowerCase())) {
                return false;
            }
            if (filterGender !== 'all' && user.gender !== filterGender) {
                return false;
            }
            if (filterRole !== 'all' && user.role !== filterRole) {
                return false;
            }
            if (user.credits < filterCreditsMin || user.credits > filterCreditsMax) {
                return false;
            }
            return true;
        });
    }, [allUsers, searchEmail, filterGender, filterRole, filterCreditsMin, filterCreditsMax]);

    // Statistics
    const stats = {
        totalSent: allNotifications.length,
        successRate: allNotifications.length > 0
            ? Math.round((allNotifications.filter(n => n.deliveryStatus === 'sent').length / allNotifications.length) * 100)
            : 0,
        totalUsers: allUsers.filter(u => u.notificationEnabled).length,
    };

    const handleSelectAll = () => {
        if (selectedUsers.length === filteredUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(filteredUsers.map(u => u.id));
        }
    };

    const handleToggleUser = (userId: string) => {
        if (selectedUsers.includes(userId)) {
            setSelectedUsers(selectedUsers.filter(id => id !== userId));
        } else {
            setSelectedUsers([...selectedUsers, userId]);
        }
    };

    const executeSend = async () => {
        console.log("[PushMgmt] executeSend started");
        setSending(true);
        try {
            console.log(`[PushMgmt] Sending to ${selectedUsers.length} users:`, selectedUsers);
            const results = await Promise.all(selectedUsers.map(async (userId) => {
                try {
                    console.log(`[PushMgmt] Creating notification for ${userId}...`);
                    const newNotif = await db.createNotification(
                        NotificationType.ADMIN_MESSAGE,
                        userId,
                        messageTitle,
                        messageContent
                    );
                    console.log(`[PushMgmt] Created DB record: ${newNotif.id}. Triggering push...`);
                    const success = await db.sendPushNotification(newNotif);
                    console.log(`[PushMgmt] Push trigger result for ${userId}:`, success);
                    return success;
                } catch (e) {
                    console.error(`[PushMgmt] Failed to send to ${userId}`, e);
                    return false;
                }
            }));

            const sentCount = results.filter(r => r === true).length;
            console.log(`[PushMgmt] Finished sending. Success count: ${sentCount}`);

            if (sentCount > 0) {
                setModalConfig({
                    isOpen: true,
                    message: `✅ ${sentCount}명에게 푸시 알림이 발송되었습니다.`,
                    type: 'success'
                });
                setMessageTitle('');
                setMessageContent('');
                setSelectedUsers([]);
            } else {
                setModalConfig({
                    isOpen: true,
                    message: '발송에 실패했습니다. (성공 0건)\n사용자의 푸시 토큰이 없거나 서버 오류일 수 있습니다.',
                    type: 'error'
                });
            }
            // Always refresh history since at least the DB records were created
            onRefresh();
            loadData();
        } catch (error: any) {
            setModalConfig({
                isOpen: true,
                message: `푸시 알림 발송 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
                type: 'error'
            });
            console.error(error);
        } finally {
            setSending(false);
        }
    };

    const handleSendClick = () => {
        if (!messageTitle.trim() || !messageContent.trim()) {
            setModalConfig({
                isOpen: true,
                message: '제목과 내용을 입력해주세요.',
                type: 'error'
            });
            return;
        }

        if (selectedUsers.length === 0) {
            setModalConfig({
                isOpen: true,
                message: '발송할 사용자를 선택해주세요.',
                type: 'error'
            });
            return;
        }

        setModalConfig({
            isOpen: true,
            message: `${selectedUsers.length}명의 사용자에게 푸시 알림을 발송하시겠습니까?`,
            type: 'confirm',
            onConfirm: () => {
                console.log("[PushMgmt] Confirm modal - confirmed");
                executeSend();
            }
        });
    };

    if (loadingData) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Statistics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Bell className="w-8 h-8 opacity-80" />
                        <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="text-3xl font-black">{stats.totalSent}</div>
                    <div className="text-sm opacity-90">총 발송 알림</div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-8 h-8 opacity-80" />
                    </div>
                    <div className="text-3xl font-black">{stats.successRate}%</div>
                    <div className="text-sm opacity-90">발송 성공률</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 opacity-80" />
                    </div>
                    <div className="text-3xl font-black">{stats.totalUsers}</div>
                    <div className="text-sm opacity-90">알림 허용 사용자</div>
                </div>
            </div>

            {/* Manual Send Section */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Send className="w-6 h-6 text-blue-600" />
                    수동 푸시 알림 발송
                </h2>

                {/* User Filters */}
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Filter className="w-5 h-5 text-gray-600" />
                        <span className="font-bold text-sm">사용자 필터</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Email Search */}
                        <div>
                            <label className="block text-xs font-bold mb-1">이메일 검색</label>
                            <input
                                type="text"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                placeholder="이메일 입력..."
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>

                        {/* Gender Filter */}
                        <div>
                            <label className="block text-xs font-bold mb-1">성별</label>
                            <select
                                value={filterGender}
                                onChange={(e) => setFilterGender(e.target.value as any)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="all">전체</option>
                                <option value={Gender.MALE}>남성</option>
                                <option value={Gender.FEMALE}>여성</option>
                            </select>
                        </div>

                        {/* Role Filter */}
                        <div>
                            <label className="block text-xs font-bold mb-1">등급</label>
                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value as any)}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            >
                                <option value="all">전체</option>
                                <option value={UserRole.USER}>USER</option>
                                <option value={UserRole.VIP}>VIP</option>
                                <option value={UserRole.ADMIN}>ADMIN</option>
                            </select>
                        </div>

                        {/* Credits Range */}
                        <div>
                            <label className="block text-xs font-bold mb-1">크래딧 범위</label>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    value={filterCreditsMin}
                                    onChange={(e) => setFilterCreditsMin(Number(e.target.value))}
                                    placeholder="최소"
                                    className="w-1/2 px-2 py-2 border rounded-lg text-xs"
                                />
                                <input
                                    type="number"
                                    value={filterCreditsMax}
                                    onChange={(e) => setFilterCreditsMax(Number(e.target.value))}
                                    placeholder="최대"
                                    className="w-1/2 px-2 py-2 border rounded-lg text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                            필터링된 사용자: <strong>{filteredUsers.length}명</strong> | 선택됨: <strong>{selectedUsers.length}명</strong>
                        </span>
                        <button
                            onClick={handleSelectAll}
                            className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                        >
                            {selectedUsers.length === filteredUsers.length ? '전체 해제' : '전체 선택'}
                        </button>
                    </div>
                </div>

                {/* User List */}
                <div className="bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {filteredUsers.map(user => (
                            <label
                                key={user.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedUsers.includes(user.id) ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200'
                                    } border`}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => handleToggleUser(user.id)}
                                    className="w-4 h-4"
                                />
                                <UserIcon className="w-4 h-4 text-gray-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{user.email}</div>
                                    <div className="text-xs text-gray-500">
                                        {user.role} | {user.credits} 크래딧
                                    </div>
                                </div>
                            </label>
                        ))}
                        {filteredUsers.length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-400 text-sm">
                                필터 조건에 맞는 사용자가 없습니다.
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Composer */}
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-bold mb-2">📢 알림 제목</label>
                        <input
                            type="text"
                            value={messageTitle}
                            onChange={(e) => setMessageTitle(e.target.value)}
                            placeholder="예: 이벤트 안내, 시스템 공지 등..."
                            className="w-full px-4 py-3 border rounded-xl text-sm"
                            maxLength={50}
                        />
                        <div className="text-xs text-gray-400 mt-1 text-right">{messageTitle.length}/50</div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold mb-2">✍️ 알림 내용</label>
                        <textarea
                            value={messageContent}
                            onChange={(e) => setMessageContent(e.target.value)}
                            placeholder="푸시 알림 메시지 내용을 입력하세요..."
                            className="w-full px-4 py-3 border rounded-xl text-sm resize-none"
                            rows={4}
                            maxLength={200}
                        />
                        <div className="text-xs text-gray-400 mt-1 text-right">{messageContent.length}/200</div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
                        >
                            {showPreview ? '미리보기 닫기' : '미리보기'}
                        </button>
                        <button
                            onClick={handleSendClick}
                            disabled={selectedUsers.length === 0 || !messageTitle || !messageContent || sending}
                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            {selectedUsers.length}명에게 발송
                        </button>
                    </div>

                    {/* Preview */}
                    {showPreview && messageTitle && messageContent && (
                        <div className="bg-gray-900 text-white p-4 rounded-xl">
                            <div className="text-xs text-gray-400 mb-2">📱 푸시 알림 미리보기</div>
                            <div className="bg-gray-800 rounded-lg p-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                                        💩
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-sm mb-1">{messageTitle}</div>
                                        <div className="text-xs text-gray-300">{messageContent}</div>
                                        <div className="text-xs text-gray-500 mt-1">지금</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification History */}
            <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Bell className="w-6 h-6 text-purple-600" />
                        발송 내역
                    </h2>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700"
                    >
                        {showHistory ? '접기' : '펼치기'}
                    </button>
                </div>

                {showHistory && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left font-bold">타입</th>
                                    <th className="px-4 py-3 text-left font-bold">제목</th>
                                    <th className="px-4 py-3 text-left font-bold">수신자</th>
                                    <th className="px-4 py-3 text-center font-bold">상태</th>
                                    <th className="px-4 py-3 text-center font-bold">발송일시</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {allNotifications.slice(0, 50).map(notif => {
                                    const user = allUsers.find(u => u.id === notif.userId);
                                    return (
                                        <tr key={notif.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold">
                                                    {notif.type === 'admin_message' ? '수동' : '자동'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{notif.title}</td>
                                            <td className="px-4 py-3 text-gray-600">{user?.email || '알 수 없음'}</td>
                                            <td className="px-4 py-3 text-center">
                                                {notif.deliveryStatus === 'sent' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-600 inline" />
                                                ) : notif.deliveryStatus === 'failed' ? (
                                                    <XCircle className="w-4 h-4 text-red-600 inline" />
                                                ) : (
                                                    <span className="text-yellow-600 text-xs">대기중</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center text-xs text-gray-500">
                                                {new Date(notif.sentAt).toLocaleString('ko-KR')}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {allNotifications.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                            발송 내역이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            {/* Modal */}
            <AlertModal
                isOpen={modalConfig.isOpen}
                message={modalConfig.message}
                type={modalConfig.type}
                onClose={closeModal}
                onConfirm={modalConfig.onConfirm}
            />
        </div>
    );
};

export default PushNotificationManagement;
