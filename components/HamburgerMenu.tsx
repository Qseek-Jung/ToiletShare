import React, { useState } from 'react';
import { Share2, Info, MessageSquare, AlertTriangle, LogOut, ChevronRight, Gift, BookOpen, PenTool, ExternalLink, X, FileText } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { User, UserRole } from '../types';
import { SUPERVISOR_EMAIL } from '../config';
import { shareService } from '../services/shareService';
import { APP_VERSION } from '../constants/version';


interface HamburgerMenuProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
    onLogout: () => void;
    onWithdraw: () => void;
    onOpenContact: () => void;
    onShareApp: () => void;
    onNavigate: (path: string) => void;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
    isOpen,
    onClose,
    user,
    onLogout,
    onWithdraw,
    onOpenContact,
    onShareApp,
    onNavigate
}) => {
    const isDev = user.role === UserRole.ADMIN || user.email === SUPERVISOR_EMAIL;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Side Drawer */}
            <div className="fixed top-0 right-0 bottom-0 w-[80%] max-w-[320px] bg-white dark:bg-gray-900 z-[2000] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="font-bold text-lg text-gray-900 dark:text-white">전체 메뉴</h2>
                        <p className="text-xs text-gray-500 mt-1">대똥단결 v1.0.0</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto py-2">
                    {/* Section 1: Customer Support */}
                    <div className="px-4 py-2">
                        <div className="text-xs font-bold text-gray-400 mb-2 px-2">고객 지원</div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                            <MenuItem
                                icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
                                label="문의하기 / 제보"
                                onClick={() => { onClose(); onOpenContact(); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
                                label="광고 문의"
                                onClick={() => { onClose(); onOpenContact(); }} // Re-use contact modal for now, or specific logic
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<LogOut className="w-5 h-5 text-gray-400" />}
                                label="로그아웃"
                                onClick={() => { onClose(); onLogout(); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                                label="회원 탈퇴"
                                onClick={() => { onClose(); onWithdraw(); }}
                            />
                        </div>
                    </div>

                    {/* Section 2: Service Guide */}
                    <div className="px-4 py-2">
                        <div className="text-xs font-bold text-gray-400 mb-2 px-2">서비스 안내</div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                            <MenuItem
                                icon={<BookOpen className="w-5 h-5 text-purple-500" />}
                                label="이용 안내"
                                onClick={() => { onClose(); onNavigate('#/guide'); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<Gift className="w-5 h-5 text-pink-500" />}
                                label="크레딧 적립/사용 가이드"
                                onClick={() => { onClose(); onNavigate('#/guide/credit'); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<PenTool className="w-5 h-5 text-emerald-500" />}
                                label="화장실 등록 가이드"
                                onClick={() => { onClose(); onNavigate('#/guide/registration'); }}
                            />
                        </div>
                    </div>

                    {/* Section 3: Together */}
                    <div className="px-4 py-2">
                        <div className="text-xs font-bold text-gray-400 mb-2 px-2">함께하기</div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                            <MenuItem
                                icon={<ExternalLink className="w-5 h-5 text-indigo-500" />}
                                label="개발자 후원하기 (준비중)"
                                onClick={() => { alert("마음만 감사히 받겠습니다! 🙇‍♂️ (기능 준비중)"); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<Share2 className="w-5 h-5 text-cyan-500" />}
                                label="앱 공유하기"
                                onClick={() => { onClose(); onShareApp(); }}
                            />
                        </div>
                    </div>

                    {/* Section 4: App Info */}
                    <div className="px-4 py-2 pb-10">
                        <div className="text-xs font-bold text-gray-400 mb-2 px-2">앱 정보</div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
                            <MenuItem
                                icon={<FileText className="w-5 h-5 text-gray-400" />}
                                label="서비스 이용약관"
                                onClick={() => { onClose(); onNavigate('#/terms'); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            <MenuItem
                                icon={<FileText className="w-5 h-5 text-gray-400" />}
                                label="개인정보 처리방침"
                                onClick={() => { onClose(); onNavigate('#/privacy'); }}
                            />
                            <div className="h-[1px] bg-gray-50 dark:bg-gray-800 mx-4" />
                            {Capacitor.isNativePlatform() ? (
                                <div className="w-full px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left cursor-default">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <Info className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">버전 정보</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{APP_VERSION}</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => { onClose(); onNavigate('#/app-info'); }}
                                    className="w-full px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <Info className="w-5 h-5 text-gray-500" />
                                        </div>
                                        <span className="font-medium text-sm text-gray-700 dark:text-gray-200">앱 정보</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{APP_VERSION}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

interface MenuItemProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="w-full px-4 py-3 flex justify-between items-center bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
    >
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center">
                {icon}
            </div>
            <span className="font-medium text-sm text-gray-700 dark:text-gray-200">{label}</span>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300" />
    </button>
);
