import React, { useState, useEffect } from 'react';
import { Menu, ArrowLeft } from 'lucide-react';
import { User } from '../../types';
import { AdminMenu } from '../../components/admin/AdminMenu';
import { AdminDashboard } from './AdminDashboard';
import { UserManagement } from './UserManagement';
import { ToiletManagement } from './ToiletManagement';
import AdManagement from './AdManagement';
import { ReportManagement } from './ReportManagement';
import { ReviewManagement } from './ReviewManagement';
import { VisitorStatistics } from './VisitorStatistics';
import { DataManagement } from './DataManagement';
import { CreditPolicyManagement } from './CreditPolicyManagement';
import { CreditStatistics } from './CreditStatistics';
import PushNotificationManagement from './PushNotificationManagement';
import { VersionManagement } from './VersionManagement';
import { BulkReviewPage } from './BulkReviewPage';
import { BulkUploadPage } from './BulkUploadPage';
import { BulkFileConversionPage } from './BulkFileConversionPage';
import { AutoNotificationManagement } from './AutoNotificationManagement';
import { NoticeManagement } from './NoticeManagement';

interface AdminPageProps {
    user: User;
    setUser: (user: User) => void;
    refreshTrigger: number;
    setRefreshTrigger: (cb: (prev: number) => number) => void;
}

// PageContainer - Responsive layout container
const PageContainer = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-hidden pt-[env(safe-area-inset-top)]">
        <div
            className={`w-full max-w-md md:max-w-4xl lg:max-w-7xl mx-auto bg-white h-full overflow-y-auto no-scrollbar shadow-2xl ${className}`}
            ref={(el) => {
                if (el) {
                    console.log(`[SCROLL_DEBUG] AdminPage Container: clientH=${el.clientHeight}, scrollH=${el.scrollHeight}, overflowY=${window.getComputedStyle(el).overflowY}`);
                }
            }}
        >
            {children}
        </div>
    </div>
);

export const AdminPage: React.FC<AdminPageProps> = ({ user, setUser, refreshTrigger, setRefreshTrigger }) => {
    const [activeSection, setActiveSection] = useState<'dashboard' | 'users' | 'toilets' | 'reports' | 'reviews' | 'ads' | 'data' | 'credit-management' | 'notifications' | 'version'>('dashboard');
    const [subSection, setSubSection] = useState<string>('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [returnToSection, setReturnToSection] = useState<string | null>(null);
    const [editingToiletId, setEditingToiletId] = useState<string | null>(null);

    // Sync state with URL hash parameters
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash.includes('?')) {
                const queryPart = hash.split('?')[1];
                const params = new URLSearchParams(queryPart);
                const section = params.get('section');
                const sub = params.get('sub');

                if (section) {
                    setActiveSection(section as any);
                } else {
                    setActiveSection('dashboard');
                }
                if (sub) {
                    setSubSection(sub);
                } else {
                    setSubSection('');
                }
            } else {
                // No query params - Default to dashboard
                setActiveSection('dashboard');
                setSubSection('');
            }
        };

        // Initial check
        handleHashChange();

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return (
        <PageContainer>
            {/* Header */}
            <div className="sticky top-0 z-40 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 shadow-lg">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.history.back()}
                            className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </button>
                        <div>
                            <div className="text-white font-black text-xl flex items-center gap-2">
                                <span>
                                    {activeSection === 'dashboard' && '📊 대시보드'}
                                    {activeSection === 'users' && !subSection && '👥 회원 통계'}
                                    {activeSection === 'users' && subSection === 'visitor-stats' && '📊 방문자 통계'}
                                    {activeSection === 'users' && subSection === 'banned-users' && '🚫 영구 차단 회원'}
                                    {activeSection === 'users' && subSection === 'withdrawn-users' && '🗑️ 탈퇴 회원 리스트'}
                                    {activeSection === 'users' && subSection !== 'visitor-stats' && subSection !== 'banned-users' && subSection !== 'withdrawn-users' && subSection && '👥 회원 통계'}
                                    {activeSection === 'toilets' && (
                                        subSection === 'toilet-map' ? '📊 지역별 등록현황' :
                                            subSection === 'toilet-chart' ? '📊 화장실 통계' :
                                                subSection === 'toilet-bulk' ? '📤 화장실 대량등록' :
                                                    subSection === 'bulk-conversion' ? '🛠️ 대량등록 파일변환' :
                                                        '🚽 화장실 리스트'
                                    )}
                                    {activeSection === 'reports' && '🚨 신고 관리'}
                                    {activeSection === 'reviews' && '⭐ 리뷰 관리'}
                                    {activeSection === 'ads' && (
                                        subSection === 'ad-performance' ? '📊 광고 실적' : '📺 광고 정책'
                                    )}
                                    {activeSection === 'notifications' && (
                                        subSection === 'auto-notifications' ? '📢 자동 알림 관리' :
                                            subSection === 'notices' ? '📢 공지사항 관리' :
                                                '🔔 푸시 알림 발송'
                                    )}
                                    {activeSection === 'version' && '📱 앱 버전 관리'}
                                    {activeSection === 'credit-management' && (
                                        subSection === 'credit-stats' ? '📊 크래딧 통계' : '💰 크래딧 정책'
                                    )}
                                    {activeSection === 'data' && '💾 데이터 관리'}
                                </span>
                            </div>
                        </div>
                    </div>
                    {/* Menu button - visible on all screen sizes */}
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    >
                        <Menu className="w-6 h-6 text-white" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeSection === 'dashboard' && (
                    <AdminDashboard
                        setActiveSection={setActiveSection}
                    />
                )}

                {activeSection === 'users' && (
                    <UserManagement
                        subSection={subSection}
                        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                    />
                )}




                {activeSection === 'toilets' && (
                    <>
                        {subSection === 'bulk-review' ? (
                            <BulkReviewPage />
                        ) : subSection === 'toilet-bulk' ? (
                            <BulkUploadPage />
                        ) : subSection === 'bulk-conversion' ? (
                            <BulkFileConversionPage />
                        ) : (
                            <ToiletManagement
                                subSection={subSection}
                                setRefreshTrigger={setRefreshTrigger}
                                initialEditToiletId={editingToiletId}
                                onBackToReports={returnToSection ? () => {
                                    setEditingToiletId(null);
                                    const prevSection = returnToSection as any;
                                    setReturnToSection(null);
                                    setActiveSection(prevSection);
                                    setSubSection('');
                                } : undefined}
                            />
                        )}
                    </>
                )}

                {activeSection === 'ads' && (
                    <AdManagement
                        subSection={subSection}
                        refreshTrigger={refreshTrigger}
                    />
                )}

                {activeSection === 'reports' && (
                    <ReportManagement
                        setRefreshTrigger={setRefreshTrigger}
                        currentUser={user}
                        onNavigateToToilet={(toiletId, returnTo) => {
                            setEditingToiletId(toiletId);
                            setReturnToSection(returnTo);
                            setActiveSection('toilets');
                            setSubSection('toilet-list');
                        }}
                    />
                )}

                {activeSection === 'reviews' && (
                    <ReviewManagement
                        onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                        onNavigateToToilet={(toiletId, returnTo) => {
                            setEditingToiletId(toiletId);
                            setReturnToSection(returnTo);
                            setActiveSection('toilets');
                            setSubSection('toilet-list');
                        }}
                    />
                )}

                {activeSection === 'credit-management' && (
                    <>
                        {(subSection === 'credit-stats') ? (
                            <CreditStatistics />
                        ) : (
                            <CreditPolicyManagement />
                        )}
                    </>
                )}

                {activeSection === 'notifications' && (
                    <>
                        {subSection === 'auto-notifications' ? (
                            <AutoNotificationManagement />
                        ) : subSection === 'notices' ? (
                            <NoticeManagement user={user} />
                        ) : (
                            <PushNotificationManagement
                                onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                            />
                        )}
                    </>
                )}

                {activeSection === 'version' && (
                    <VersionManagement />
                )}

                {activeSection === 'data' && (
                    <DataManagement setRefreshTrigger={setRefreshTrigger} />
                )}
            </div>

            {/* Menu Sidebar - Overlay on all screen sizes */}
            <AdminMenu
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                subSection={subSection}
                setSubSection={setSubSection}
            />
        </PageContainer>
    );
};

export default AdminPage;
