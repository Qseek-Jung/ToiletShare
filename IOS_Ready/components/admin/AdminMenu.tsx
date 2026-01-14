import React from 'react';
import {
    LayoutDashboard, Users, MapPin, AlertTriangle, Star,
    Settings, Database, CreditCard, Bell, X, BarChart2,
    LogOut, ChevronRight, Menu, UserMinus, BarChart3,
    PlayCircle, Coins, Smartphone
} from 'lucide-react';

interface AdminMenuProps {
    isMenuOpen: boolean;
    setIsMenuOpen: (open: boolean) => void;
    activeSection: 'dashboard' | 'users' | 'toilets' | 'reports' | 'reviews' | 'ads' | 'data' | 'credit-management' | 'notifications' | 'version';
    setActiveSection: (section: 'dashboard' | 'users' | 'toilets' | 'reports' | 'reviews' | 'ads' | 'data' | 'credit-management' | 'notifications' | 'version') => void;
    subSection: string;
    setSubSection: (section: string) => void;
}

export const AdminMenu: React.FC<AdminMenuProps> = ({
    isMenuOpen,
    setIsMenuOpen,
    activeSection,
    setActiveSection,
    subSection,
    setSubSection
}) => {
    // Define menu structure with sub-items
    const menuStructure = [
        { id: 'dashboard', icon: BarChart3, label: '대시보드', subItems: null },
        {
            id: 'users',
            icon: Users,
            label: '회원 관리',
            subItems: [
                { id: 'user-list', label: '회원 조회' },
                { id: 'user-stats', label: '회원 통계' },
                { id: 'visitor-stats', label: '방문자 통계' },
                { id: 'banned-users', label: '영구 차단 회원' },
                { id: 'withdrawn-users', label: '탈퇴 회원 리스트' },
            ]
        },
        {
            id: 'toilets',
            icon: MapPin,
            label: '화장실 관리',
            subItems: [
                { id: 'toilet-map', label: '지역별 등록 현황' },
                { id: 'toilet-chart', label: '화장실 통계' },
                { id: 'toilet-bulk', label: '화장실 대량등록' },
                { id: 'toilet-bulk-conversion', label: '대량등록 파일변환' },
                { id: 'toilet-list', label: '화장실 리스트' },
            ]
        },
        {
            id: 'ads',
            icon: PlayCircle,
            label: '광고 관리',
            subItems: [
                { id: 'ad-config', label: '광고 설정' },
                { id: 'ad-performance', label: '광고 실적' },
            ]
        },
        { id: 'reports', icon: AlertTriangle, label: '신고 관리', subItems: null },
        { id: 'reviews', icon: Star, label: '리뷰 관리', subItems: null },
        {
            id: 'notifications',
            icon: Bell,
            label: '알림 관리',
            subItems: [
                { id: 'auto-notifications', label: '자동 알림 관리' },
                { id: 'push-notifications', label: '푸시 알림 발송' },
            ]
        },
        { id: 'version', icon: Smartphone, label: '앱 버전 관리', subItems: null },
        {
            id: 'credit-management',
            icon: Coins,
            label: '크래딧 관리',
            subItems: [
                { id: 'policy-settings', label: '크래딧 정책' },
                { id: 'credit-stats', label: '크래딧 통계' },
            ]
        },
        { id: 'data', icon: Settings, label: '데이터 관리', subItems: null },
    ];

    const updateHash = (sectionId: string, subId?: string) => {
        if (subId) {
            // For withdrawn-users, we have a special route
            window.location.hash = `#/admin?section=${sectionId}&sub=${subId}`;
        } else {
            window.location.hash = `#/admin?section=${sectionId}`;
        }
    };

    return (
        <>
            {/* Overlay sidebar from right - All screen sizes */}
            <div className={`fixed inset-y-0 right-0 w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-4 border-b flex justify-between items-center bg-gray-900 text-white">
                    <span className="font-bold">관리자 메뉴</span>
                    <button onClick={() => setIsMenuOpen(false)}><X className="w-6 h-6" /></button>
                </div>
                <div className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-120px)]">
                    {menuStructure.map((item) => (
                        <div key={item.id}>
                            {/* Main menu button */}
                            <button
                                onClick={() => {
                                    if (item.subItems) {
                                        // If asking for same section, toggle or do nothing?
                                        // Logic: if active, toggle. If not active, go to first sub item.
                                        if (activeSection === item.id) {
                                            // If we are already here, we might want to toggle visibility of subs? 
                                            // But consistent behavior requested was "click header -> go to first sub".
                                            // If we are already at a sub, clicking header again could just stay or redirect to first.
                                            // Let's redirect to first sub if not already there?
                                            // Or if we interpret "toggling" as just showing/hiding...
                                            // But we are using URL hash driving state.

                                            // If I am at users/stats, and I click "Users", I expect nothing or maybe reset to first.
                                            // Let's implement: if click header, go to first sub item.
                                            if (!subSection) {
                                                const firstSub = item.subItems[0].id;
                                                updateHash(item.id, firstSub);
                                            }
                                            // If subsection is present, clicking header again... user might want to collapse? 
                                            // But this is a sidebar navigation. Usually clicking header expands/collapses.
                                            // Given the structure, let's keep it simple: Click -> Go to first sub item.
                                            else {
                                                // already open. Do nothing or go to first?
                                                // The prompt previously asked to navigate to first item.
                                                // If I wanna close it, I click something else.
                                            }
                                        } else {
                                            // Not active, navigate to first sub-item
                                            const firstSub = item.subItems[0].id;
                                            updateHash(item.id, firstSub);
                                        }
                                    } else {
                                        // No sub-items, just navigate
                                        updateHash(item.id);
                                        setSubSection('');
                                        setIsMenuOpen(false);
                                    }
                                }}
                                className={`w-full flex items-center justify-between gap-3 p-3 rounded-xl font-medium transition-colors ${activeSection === item.id ? 'bg-amber-100 text-amber-800' : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <item.icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </div>
                                {item.subItems && (
                                    <ChevronRight
                                        className={`w-4 h-4 transition-transform ${activeSection === item.id ? 'rotate-90' : ''
                                            }`}
                                    />
                                )}
                            </button>

                            {/* Sub-menu items */}
                            {item.subItems && activeSection === item.id && (
                                <div className="ml-8 mt-1 space-y-1">
                                    {item.subItems.map((subItem) => (
                                        <button
                                            key={subItem.id}
                                            onClick={() => {
                                                if (subItem.id === 'toilet-bulk-conversion') {
                                                    updateHash(item.id, 'bulk-conversion');
                                                } else {
                                                    updateHash(item.id, subItem.id);
                                                }
                                                setIsMenuOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${subSection === subItem.id
                                                ? 'bg-amber-50 text-amber-700 font-medium'
                                                : 'text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {subItem.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    <div className="border-t border-gray-100 my-2 pt-2">
                        <button onClick={() => window.location.hash = '#/my'} className="w-full flex items-center gap-3 p-3 text-gray-500 hover:bg-gray-50 rounded-xl">
                            <LogOut className="w-5 h-5" /> 나가기
                        </button>
                    </div>
                </div>
            </div>

            {/* Backdrop overlay when menu is open - All screen sizes */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}
        </>
    );
};

export default AdminMenu;
