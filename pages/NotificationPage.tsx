import React from 'react';
import { ArrowLeft, Bell } from 'lucide-react';
import { PageLayout } from '../components/PageLayout';

export const NotificationPage: React.FC = () => {
    return (
        <PageLayout className="pb-24">
            <div className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
                <button onClick={() => window.history.back()} className="p-2 -ml-2 text-gray-900 dark:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">알림 센터</h1>
            </div>

            <div className="pt-16 px-4">
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                        <Bell className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">새로운 알림이 없습니다</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-[200px]">
                        내 화장실 리뷰, 공지사항 등 다양한 소식을 이곳에서 알려드릴게요.
                    </p>
                </div>

                {/* Mock Item for Preview */}
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 mb-3 bg-white dark:bg-gray-800 shadow-sm opacity-50">
                    <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-primary bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded">공지</span>
                        <span className="text-xs text-gray-400">2024.01.01</span>
                    </div>
                    <h4 className="font-bold text-sm mb-1 dark:text-gray-200">대똥단결 서비스 오픈!</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        안녕하세요, 대똥단결입니다. 여러분의 급한 불을 꺼드리기 위해 서비스가 런칭되었습니다.
                    </p>
                </div>
            </div>
        </PageLayout>
    );
};

export default NotificationPage;
