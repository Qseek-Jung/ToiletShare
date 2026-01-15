
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
            appId: env.VITE_ADMOB_APP_ID_IOS || '',
        }
    }
};

const getReversedClientId = (clientId) => {
    if (!clientId) return '';
    return clientId.split('.').reverse().join('.');
};

// Attempt to read Client ID from GoogleService-Info.plist (Source of Truth for iOS)
const googleServicePath = path.resolve(__dirname, '../ios/App/App/GoogleService-Info.plist');
if (fs.existsSync(googleServicePath)) {
    try {
        const plistContent = readFile(googleServicePath);
        // Simple regex to extract <key>CLIENT_ID</key><string>VALUE</string>
        const match = plistContent.match(/<key>CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);
        if (match && match[1]) {
            console.log(`ℹ️  Found Client ID in GoogleService-Info.plist: ${match[1]}`);
            Config.auth.google.clientId = match[1]; // Override with iOS specific ID
        }
    } catch (e) {
        console.warn('⚠️ Could not read GoogleService-Info.plist:', e.message);
    }
}

console.log('🍎 iOS Patcher Started...');

// Validate AdMob App ID
if (Config.auth.admob.appId) {
    if (!Config.auth.admob.appId.startsWith('ca-app-pub-')) {
        console.error('❌ CRITICAL ERROR: Invalid iOS AdMob App ID detected!');
        console.error(`   Current value: "${Config.auth.admob.appId}"`);
        console.error('   The App ID MUST start with "ca-app-pub-".');
        console.error('   Please check your .env file or GitHub Secrets for VITE_ADMOB_APP_ID_IOS.');
        process.exit(1);
    }
} else {
    console.warn('⚠️ WARNING: VITE_ADMOB_APP_ID_IOS is missing. AdMob may not function correctly.');
}

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

        // Inject Privacy Keys if missing
        if (!result.content.includes('NSCameraUsageDescription')) {
            console.log('➕ Injecting missing Privacy Keys...');
            const privacyKeys = `
    <key>NSCameraUsageDescription</key>
    <string>화장실 제보를 위해 카메라 접근 권한이 필요합니다.</string>
    <key>NSPhotoLibraryUsageDescription</key>
    <string>화장실 사진 등록을 위해 앨범 접근 권한이 필요합니다.</string>
    <key>NSPhotoLibraryAddUsageDescription</key>
    <string>이미지 저장을 위해 앨범 접근 권한이 필요합니다.</string>`;

            // Insert before the last </dict>
            const lastDictIndex = result.content.lastIndexOf('</dict>');
            if (lastDictIndex !== -1) {
                result.content = result.content.substring(0, lastDictIndex) + privacyKeys + '\n' + result.content.substring(lastDictIndex);
                console.log('✅ Privacy Keys injected.');
            } else {
                console.error('❌ Could not find closing </dict> tag to inject Privacy Keys.');
            }
        }

        if (result.count > 0 || !content.includes('NSCameraUsageDescription')) {
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
