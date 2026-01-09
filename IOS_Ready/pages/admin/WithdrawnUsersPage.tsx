import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, UserX } from 'lucide-react';
import { dbSupabase as db } from '../../services/db_supabase';
import { User } from '../../types';
import { formatDate } from '../../utils';

interface WithdrawnUsersPageProps {
    onBack: () => void;
}

export const WithdrawnUsersPage: React.FC<WithdrawnUsersPageProps> = ({ onBack }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadWithdrawnUsers();
    }, []);

    const loadWithdrawnUsers = async () => {
        setLoading(true);
        try {
            const data = await db.getWithdrawnUsers();
            setUsers(data);
        } catch (error) {
            console.error(error);
            alert('정보를 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        (user.nickname?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-4">
            {/* Statistics Card */}
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-4 py-3 rounded-xl shadow-sm text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <UserX className="w-5 h-5 text-gray-200" />
                    </div>
                    <span className="text-sm font-bold">탈퇴한 회원</span>
                </div>
                <span className="text-2xl font-black">{users.length}명</span>
            </div>

            {/* Search Bar */}
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="이메일 또는 닉네임 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                />
            </div>

            {/* List Container */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 font-bold text-sm text-gray-600 dark:text-gray-300 flex justify-between items-center">
                    <span>탈퇴 회원 목록</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{filteredUsers.length}명</span>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-[600px] overflow-y-auto">
                        {filteredUsers.map(user => (
                            <div key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900 dark:text-white">
                                                {user.nickname || 'Unknown'}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {user.email}
                                            </span>
                                        </div>

                                        <div className="bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-lg mb-2">
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">탈퇴 사유</div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                                {user.withdrawalReason || '사유 없음'}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                                            <span>가입: {formatDate(user.createdAt)}</span>
                                            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                                            <span className="text-red-500 dark:text-red-400 font-medium">탈퇴: {formatDate(user.deletedAt)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredUsers.length === 0 && (
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                                {searchQuery ? '검색 결과가 없습니다.' : '탈퇴한 회원이 없습니다.'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
