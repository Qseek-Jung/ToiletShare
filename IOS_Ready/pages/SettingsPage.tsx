import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Moon, Sun, Bell } from 'lucide-react';
import { notificationService } from '../services/notification_service';

interface SettingsPageProps {
    onBack: () => void;
    darkMode: boolean;
    onToggleDarkMode: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onBack, darkMode, onToggleDarkMode }) => {
    const { t, i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    const languages = [
        { code: 'ko', label: '한국어' },
        { code: 'en', label: 'English' },
        { code: 'ja', label: '日本語' },
        { code: 'zh', label: '中文' },
    ];

    // Helper to check language match (handling region codes like en-US)
    const isCurrentLang = (code: string) => i18n.language.startsWith(code);

    const [nightlifeEnabled, setNightlifeEnabled] = React.useState(true);

    React.useEffect(() => {
        const saved = localStorage.getItem('nightlife_notifications_enabled');
        if (saved !== null) {
            setNightlifeEnabled(saved !== 'false');
        }
    }, []);

    const toggleNightlife = async () => {
        const newValue = !nightlifeEnabled;
        setNightlifeEnabled(newValue);
        localStorage.setItem('nightlife_notifications_enabled', String(newValue));
        // Re-configure service
        await notificationService.configureNightlifeReminder();
    };

    return (
        <PageLayout className="p-0 pb-20 relative bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-20 border-b border-gray-100 dark:border-gray-700">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="font-bold text-lg text-gray-900 dark:text-white">{t('settings', '설정')}</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Theme Section */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">{t('theme', '테마')}</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-700 text-yellow-400' : 'bg-orange-100 text-orange-500'}`}>
                                    {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100">{darkMode ? t('dark_mode', '다크 모드') : t('light_mode', '라이트 모드')}</div>
                                    <div className="text-xs text-gray-500">{t('theme_description', '화면 스타일을 변경합니다')}</div>
                                </div>
                            </div>
                            <button
                                onClick={onToggleDarkMode}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${darkMode ? 'bg-indigo-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${darkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Notifications Section */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">{t('notifications', '알림')}</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 dark:text-gray-100">야간/주말 활동 알림</div>
                                    <div className="text-xs text-gray-500">
                                        금요일 저녁 등 활동 시간대에 유용한 화장실 정보를 알려드려요.
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={toggleNightlife}
                                className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${nightlifeEnabled ? 'bg-indigo-500' : 'bg-gray-300'}`}
                            >
                                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${nightlifeEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Language Section */}
                <section>
                    <h2 className="text-sm font-bold text-gray-500 mb-2 px-2 uppercase tracking-wider">{t('language', '언어')}</h2>
                    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 divide-y divide-gray-50 dark:divide-gray-700">
                        {languages.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => changeLanguage(lang.code)}
                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{lang.code === 'ko' ? '🇰🇷' : lang.code === 'en' ? '🇺🇸' : lang.code === 'ja' ? '🇯🇵' : '🇨🇳'}</span>
                                    <span className={`font-medium ${isCurrentLang(lang.code) ? 'text-primary' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {lang.label}
                                    </span>
                                </div>
                                {isCurrentLang(lang.code) && <Check className="w-5 h-5 text-primary" />}
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </PageLayout>
    );
};

export default SettingsPage;
