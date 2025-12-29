import React, { useState } from 'react';
import { Home, User, Plus, Camera, Image as ImageIcon, PenTool, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Or hook for hash navigation if not using router

// Using Hash navigation from App.tsx context usually, but here we can just use window.location
// interface Props {
//     user: any;
//     darkMode: boolean;
// }

export default function PhotoTestPage({ user, darkMode, onToggleDarkMode }: { user: any, darkMode: boolean, onToggleDarkMode: () => void }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Mock Navigation
    const goHome = () => window.location.hash = '#/';

    // Fan Menu Items
    const menuItems = [
        { id: 'gallery', icon: ImageIcon, label: '앨범', angle: 60, color: 'bg-emerald-500' },
        { id: 'camera', icon: Camera, label: '촬영', angle: 90, color: 'bg-blue-500' }, // Center - Primary
        { id: 'manual', icon: PenTool, label: '직접', angle: 120, color: 'bg-orange-500' },
    ];

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <div className={`flex flex-col h-screen w-full ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} overflow-hidden transition-colors duration-300`}>

            {/* Header for Test Page */}
            <header className="flex-none h-14 border-b border-border/10 flex items-center px-4 bg-surface dark:bg-surface-dark z-10">
                <button onClick={goHome} className="p-2 mr-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg">사진 등록 테스트 (v3)</h1>
                <div className="ml-auto">
                    <button onClick={onToggleDarkMode} className="text-xs border px-2 py-1 rounded">
                        {darkMode ? 'Light' : 'Dark'}
                    </button>
                </div>
            </header>

            {/* Main Content Area (Placeholder) */}
            <main className="flex-1 overflow-y-auto p-4 relative">
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                    <p>여기에서 카메라/앨범 연동 및 OCR을 테스트합니다.</p>
                    <p className="text-sm">하단 (+) 버튼을 눌러 메뉴를 펼쳐보세요.</p>
                </div>

                {/* Overlay for Menu (Backdrop) */}
                {isMenuOpen && (
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
                        onClick={() => setIsMenuOpen(false)}
                    />
                )}
            </main>

            {/* Custom Bottom Bar Area */}
            {/* Wrapper to handle FAB sticking out */}
            <div className="flex-none relative h-[64px] z-50">

                {/* 1. Bar Background */}
                <div className={`absolute bottom-0 left-0 right-0 h-[64px] flex items-center justify-between px-8 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]
                    ${darkMode ? 'bg-[#111820] border-t border-[#1F2630]' : 'bg-white border-t border-gray-200'}
                `}>
                    {/* Left Tab: Home */}
                    <button className="flex flex-col items-center justify-center space-y-1 w-12 opacity-60 hover:opacity-100 transition-opacity">
                        <Home className="w-6 h-6" />
                        <span className="text-[10px] font-medium">홈</span>
                    </button>

                    {/* Right Tab: My Info */}
                    <button className="flex flex-col items-center justify-center space-y-1 w-12 opacity-60 hover:opacity-100 transition-opacity">
                        <User className="w-6 h-6" />
                        <span className="text-[10px] font-medium">내 정보</span>
                    </button>
                </div>

                {/* 2. Center FAB Container (Overlapping the bar) */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 flex items-center justify-center">

                    {/* Fan Menu Buttons */}
                    {menuItems.map((item) => {
                        // Calculate positions based on angle
                        // Radius = 90px from center
                        const radian = (item.angle * Math.PI) / 180;
                        const radius = 90;
                        // x = r * cos(theta), y = -r * sin(theta) (upward)
                        // Adjust for CSS: bottom/left relative to center
                        // Actually easier to use transform: translate
                        const tx = Math.cos(radian) * radius;
                        const ty = -Math.sin(radian) * radius;

                        return (
                            <button
                                key={item.id}
                                onClick={() => { console.log('Clicked:', item.label); setIsMenuOpen(false); }}
                                className={`absolute w-[52px] h-[52px] rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-300 ease-out border-2 border-white/20
                                    ${darkMode ? 'bg-[#1C2430] text-white' : 'bg-[#F3F4F6] text-gray-700'}
                                    hover:scale-110 active:scale-95
                                `}
                                style={{
                                    transform: isMenuOpen
                                        ? `translate(${tx}px, ${ty}px) scale(1)`
                                        : `translate(0px, 0px) scale(0.5)`,
                                    opacity: isMenuOpen ? 1 : 0,
                                    zIndex: -1 // Behind FAB when closed
                                }}
                            >
                                <item.icon className="w-5 h-5 mb-0.5" />
                                <span className="text-[9px] font-bold whitespace-nowrap">{item.label}</span>
                            </button>
                        );
                    })}

                    {/* Main FAB (+ Button) */}
                    <button
                        onClick={toggleMenu}
                        className={`w-16 h-16 rounded-full shadow-[0_8px_16px_rgba(0,0,0,0.3)] flex items-center justify-center transition-transform duration-300 z-50
                            bg-[#00B0F0] text-white border-4 ${darkMode ? 'border-[#111820]' : 'border-white'}
                        `}
                        style={{
                            transform: isMenuOpen ? 'rotate(45deg)' : 'rotate(0deg)'
                        }}
                    >
                        <Plus className="w-8 h-8" strokeWidth={3} />
                    </button>
                </div>

            </div>
        </div>
    );
}
