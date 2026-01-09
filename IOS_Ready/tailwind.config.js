/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./index.tsx",
        "./pages/**/*.{js,ts,jsx,tsx}",
        "./components/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Sans KR"', 'sans-serif'],
            },
            colors: {
                // Theme: "Sanitary Sky & Urgent Coral"

                // Primary: Cleanliness, Hygiene, Trust (Sky Blue)
                primary: {
                    DEFAULT: '#38BDF8', // Sky 400
                    foreground: '#FFFFFF',
                    50: '#F0F9FF',
                    100: '#E0F2FE',
                    200: '#BAE6FD',
                    300: '#7DD3FC',
                    400: '#38BDF8',
                    500: '#0EA5E9', // Hover
                    600: '#0284C7',
                    700: '#0369A1',
                    800: '#075985',
                    900: '#0C4A6E',
                },

                // Urgency: Emergency, Action, Alert (Soft Coral/Rose)
                urgency: {
                    DEFAULT: '#FB7185', // Rose 400
                    foreground: '#FFFFFF',
                    50: '#FFF1F2',
                    100: '#FFE4E6',
                    200: '#FECDD3',
                    300: '#FDA4AF',
                    400: '#FB7185',
                    500: '#F43F5E', // Hover / Critical
                    600: '#E11D48',
                    700: '#BE123C',
                    800: '#9F1239',
                    900: '#881337',
                },

                // Backgrounds: Clean White / Deep Slate
                background: {
                    DEFAULT: '#F8FAFC', // Slate 50
                    dark: '#0F172A',    // Slate 900
                },

                // Surface: Cards, Modals (Pure White / Soft Dark Slate)
                surface: {
                    DEFAULT: '#FFFFFF',
                    dark: '#1E293B',    // Slate 800
                },

                // Text Colors
                text: {
                    main: '#334155',    // Slate 700
                    muted: '#64748B',   // Slate 500
                    light: '#F1F5F9',   // Slate 100 (for dark mode)
                },

                // Border
                border: {
                    DEFAULT: '#E2E8F0', // Slate 200
                    dark: '#334155',    // Slate 700
                }
            },
            animation: {
                'bounce-slow': 'bounce 3s infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'zoom-in': 'zoomIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                zoomIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
}
