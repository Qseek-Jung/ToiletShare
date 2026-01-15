
import path from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, replaceContent, loadEnv } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env using internal utility
const env = loadEnv(path.join(__dirname, '../.env'));
// Mimic keys - using direct env access for script stability
const Config = {
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
            androidKey: env.VITE_GOOGLE_MAPS_API_KEY_ANDROID || '',
        },
        admob: {
            appId: env.VITE_ADSENSE_PUB_ID || '',
        }
    }
};

console.log('🤖 Android Patcher Started...');

const replacements = {
    'KAKAO_APP_KEY_PLACEHOLDER': Config.auth.kakao.apiKey,
    'NAVER_CLIENT_ID_PLACEHOLDER': Config.auth.naver.clientId,
    'NAVER_CLIENT_SECRET_PLACEHOLDER': Config.auth.naver.clientSecret,
    'GOOGLE_SERVER_CLIENT_ID_PLACEHOLDER': Config.auth.google.clientId,
    'GOOGLE_WEB_CLIENT_ID_PLACEHOLDER': Config.auth.google.clientId,
    'GOOGLE_MAPS_ANDROID_KEY_PLACEHOLDER': Config.auth.google.androidKey,
    'ADMOB_APP_ID_PLACEHOLDER': Config.auth.admob.appId,
};

// 1. Patch strings.xml
const stringsPath = path.resolve(__dirname, '../android/app/src/main/res/values/strings.xml');
try {
    let content = readFile(stringsPath);
    const result = replaceContent(content, replacements);
    if (result.count > 0) {
        writeFile(stringsPath, result.content);
        console.log(`✅ strings.xml patched (${result.count} replacements)`);
    } else {
        console.log('ℹ️ strings.xml already patched or no placeholders found.');
    }
} catch (e) {
    console.error('❌ Failed to patch strings.xml:', e.message);
}

// 2. Patch capacitor.config.ts
const capConfigPath = path.resolve(__dirname, '../capacitor.config.ts');
try {
    let content = readFile(capConfigPath);
    const result = replaceContent(content, replacements);
    if (result.count > 0) {
        writeFile(capConfigPath, result.content);
        console.log(`✅ capacitor.config.ts patched (${result.count} replacements)`);
    } else {
        console.log('ℹ️ capacitor.config.ts already patched.');
    }
} catch (e) {
    console.error('❌ Failed to patch capacitor.config.ts:', e.message);
}

console.log('🤖 Android Patcher Finished.');
