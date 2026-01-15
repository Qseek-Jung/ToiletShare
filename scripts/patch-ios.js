
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { readFile, writeFile, replaceContent, loadEnv } from './utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env using internal utility
const env = loadEnv(path.join(__dirname, '../.env'));

const Config = {
    auth: {
        kakao: {
            apiKey: env.VITE_KAKAO_API_KEY || '',
        },
        google: {
            clientId: env.VITE_GOOGLE_CLIENT_ID || '',
            iosKey: env.VITE_GOOGLE_MAPS_API_KEY_IOS || '',
        },
        admob: {
            appId: env.VITE_ADSENSE_PUB_ID || '',
        }
    }
};

const getReversedClientId = (clientId) => {
    if (!clientId) return '';
    return clientId.split('.').reverse().join('.');
};

console.log('🍎 iOS Patcher Started...');

const replacements = {
    'KAKAO_APP_KEY_PLACEHOLDER': Config.auth.kakao.apiKey,
    'kakaoKAKAO_APP_KEY_PLACEHOLDER': `kakao${Config.auth.kakao.apiKey}`,
    'GOOGLE_IOS_CLIENT_ID_PLACEHOLDER': Config.auth.google.clientId,
    'GOOGLE_REVERSED_CLIENT_ID_PLACEHOLDER': getReversedClientId(Config.auth.google.clientId),
    'GOOGLE_MAPS_IOS_KEY_PLACEHOLDER': Config.auth.google.iosKey,
    'ADMOB_APP_ID_PLACEHOLDER': Config.auth.admob.appId,
};

// 1. Patch Info.plist
const plistPath = path.resolve(__dirname, '../ios/App/App/Info.plist');
try {
    if (fs.existsSync(plistPath)) {
        let content = readFile(plistPath);
        const result = replaceContent(content, replacements);
        if (result.count > 0) {
            writeFile(plistPath, result.content);
            console.log(`✅ Info.plist patched (${result.count} replacements)`);
        } else {
            console.log('ℹ️ Info.plist already patched or no placeholders found.');
        }
    } else {
        console.log('⚠️ Info.plist not found (Skipping iOS patch)');
    }
} catch (e) {
    console.error('❌ Failed to patch Info.plist:', e.message);
}

// 2. Patch AppDelegate.swift
const appDelegatePath = path.resolve(__dirname, '../ios/App/App/AppDelegate.swift');
try {
    if (fs.existsSync(appDelegatePath)) {
        let content = readFile(appDelegatePath);
        const result = replaceContent(content, replacements);
        if (result.count > 0) {
            writeFile(appDelegatePath, result.content);
            console.log(`✅ AppDelegate.swift patched (${result.count} replacements)`);
        }
    }
} catch (e) {
    console.error('❌ Failed to patch AppDelegate.swift:', e.message);
}

console.log('🍎 iOS Patcher Finished.');
