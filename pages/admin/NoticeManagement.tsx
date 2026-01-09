import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { dbSupabase as db } from '../../services/db_supabase';
import { AppNotice, User } from '../../types';
import { Edit2, Trash2, Plus, X, Search, CheckCircle, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from '../../utils';

interface NoticeManagementProps {
    user: User;
}

export const NoticeManagement: React.FC<NoticeManagementProps> = ({ user }) => {
    const [notices, setNotices] = useState<AppNotice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [noticeToDelete, setNoticeToDelete] = useState<AppNotice | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Editor State
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [priority, setPriority] = useState(0);

    useEffect(() => {
        loadNotices();
    }, []);

    const loadNotices = async () => {
        setIsLoading(true);
        const data = await db.getAllNoticesAdmin();
        setNotices(data);
        setIsLoading(false);
    };

    const handleCreate = () => {
        setEditId(null);
        setTitle('');
        setContent('');
        setIsActive(true);
        setPriority(0);
        setIsEditing(true);
    };

    const handleEdit = (notice: AppNotice) => {
        setEditId(notice.id);
        setTitle(notice.title);
        setContent(notice.content);
        setIsActive(notice.isActive);
        setPriority(notice.priority);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        try {
            if (editId) {
                await db.updateAppNotice(editId, {
                    title,
                    content,
                    isActive,
                    priority
                });
            } else {
                await db.createAppNotice({
                    title,
                    content,
                    isActive,
                    priority,
                    type: 'notice'
                }, user.id);
            }
            setIsEditing(false);
            loadNotices();
        } catch (error) {
            console.error(error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    const handleDelete = async () => {
        if (!noticeToDelete) return;
        setIsProcessing(true);
        try {
            console.log('[NoticeManagement] Attempting to delete notice:', noticeToDelete.id);
            await db.deleteAppNotice(noticeToDelete.id);
            console.log('[NoticeManagement] Deletion successful');
            setNotices(prev => prev.filter(n => n.id !== noticeToDelete.id));
            setNoticeToDelete(null);
        } catch (error: any) {
            console.error('[NoticeManagement] Deletion failed:', error);
            alert(`삭제 중 오류가 발생했습니다: ${error.message || error.toString()}`);
        } finally {
            setIsProcessing(false);
        }
    };

    // Quill Modules for custom toolbar
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
            ['link', 'image'],
            ['clean'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }]
        ],
    };

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike', 'blockquote',
        'list', 'indent',
        'link', 'image',
        'color', 'background', 'align'
    ];

    if (isEditing) {
        return (
            <div className="space-y-4 animate-in fade-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setIsEditing(false)}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900"
                    >
                        <X className="w-5 h-5" />
                        <span>목록으로 돌아가기</span>
                    </button>
                    <h2 className="text-xl font-bold">{editId ? '공지사항 수정' : '새 공지사항 등록'}</h2>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">제목</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="공지사항 제목을 입력하세요"
                        />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">공개 여부 (활성)</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">우선순위 (0=기본, 1=상단고정)</label>
                            <input
                                type="number"
                                value={priority}
                                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                                className="w-20 p-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    <div className="min-h-[400px]">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">내용</label>
                        <div className="bg-white text-black rounded-xl overflow-hidden border border-gray-200">
                            <ReactQuill
                                theme="snow"
                                value={content}
                                onChange={setContent}
                                modules={modules}
                                formats={formats}
                                style={{ height: '350px' }}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">* 이미지를 복사 붙여넣기하거나 툴바의 이미지 버튼을 사용하세요.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200"
                        >
                            저장하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">공지사항 관리</h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    새 공지사항 등록
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                        <tr>
                            <th className="p-4 text-sm font-medium text-gray-500">상태</th>
                            <th className="p-4 text-sm font-medium text-gray-500">우선순위</th>
                            <th className="p-4 text-sm font-medium text-gray-500 w-1/2">제목</th>
                            <th className="p-4 text-sm font-medium text-gray-500">작성일</th>
                            <th className="p-4 text-sm font-medium text-gray-500">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {notices.map((n) => (
                            <tr key={n.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="p-4">
                                    {n.isActive ? (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                            <Eye className="w-3 h-3" /> 공개
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                                            <EyeOff className="w-3 h-3" /> 비공개
                                        </span>
                                    )}
                                </td>
                                <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                    {n.priority > 0 ? <span className="text-amber-500 font-bold">상단고정</span> : '일반'}
                                </td>
                                <td className="p-4">
                                    <div className="font-medium text-gray-900 dark:text-white line-clamp-1">{n.title}</div>
                                </td>
                                <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                                    {formatDistanceToNow(new Date(n.createdAt))}
                                </td>
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(n)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="수정"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNoticeToDelete(n);
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4 pointer-events-none" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {notices.length === 0 && !isLoading && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    등록된 공지사항이 없습니다.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Deletion Confirmation Modal */}
            {noticeToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-white">공지사항 삭제</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                            "<span className="font-bold text-gray-700 dark:text-gray-200">{noticeToDelete.title}</span>"<br />
                            공지사항을 정말 삭제하시겠습니까?<br />
                            이 작업은 되돌릴 수 없습니다.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setNoticeToDelete(null)}
                                className="py-3.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isProcessing}
                                className="py-3.5 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-red-200 dark:shadow-none"
                            >
                                {isProcessing && <Loader2 className="w-4 h-4 animate-spin" />}
                                삭제하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
