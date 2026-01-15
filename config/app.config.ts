import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(process.cwd(), '.env') });

const env = process.env;

export const AppConfig = {
    app: {
        id: 'com.toiletshare.app',
        name: '대똥단결', // Great Poop Unity
        scheme: 'com.toiletshare.app',
        version: '1.0.7',
    },
    api: {
        supabaseUrl: env.VITE_SUPABASE_URL || '',
        supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
    },
    auth: {
        kakao: {
            apiKey: env.VITE_KAKAO_API_KEY || '',
            jsKey: env.VITE_KAKAO_JAVASCRIPT_KEY || env.VITE_KAKAO_API_KEY || '',
        },
        naver: {
            clientId: env.VITE_NAVER_CLIENT_ID || '',
            clientSecret: env.VITE_NAVER_CLIENT_SECRET || '',
        },
        google: {
            clientId: env.VITE_GOOGLE_CLIENT_ID || '',
            serverClientId: env.VITE_GOOGLE_CLIENT_ID || '',
            iosClientId: env.VITE_GOOGLE_CLIENT_ID || '',
        }
    },
    maps: {
        webKey: env.VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST || env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW || '',
        androidKey: env.VITE_GOOGLE_MAPS_API_KEY_ANDROID || '',
        iosKey: env.VITE_GOOGLE_MAPS_API_KEY_IOS || '',
    },
    ads: {
        admobAppId: env.VITE_ADSENSE_PUB_ID || '', // Assuming this maps to AdMob App ID per previous usage
    },
    contact: {
        email: env.VITE_SUPERVISOR_EMAIL || 'qseek77@gmail.com',
    }
};
