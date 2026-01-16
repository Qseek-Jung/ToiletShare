
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
            nativeKey: env.VITE_KAKAO_NATIVE_KEY || '',
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

// Validation & Debugging
console.log('🔍 Validating Cloud Configuration...');
if (!Config.auth.google.clientId) {
    throw new Error('❌ FATAL: VITE_GOOGLE_CLIENT_ID is missing! Check GitHub Secrets.');
} else {
    console.log(`✅ Loaded Google Client ID: ${Config.auth.google.clientId.substring(0, 15)}...`);
}

if (!env.VITE_GOOGLE_MAPS_API_KEY_WEBVIEW && !env.VITE_GOOGLE_MAPS_API_KEY) {
    console.warn('⚠️ WARNING: Map Web Key is missing. Maps might not load.');
} else {
    console.log('✅ Loaded Map Web Key.');
}
if (!Config.auth.kakao.nativeKey) {
    console.warn('⚠️ WARNING: VITE_KAKAO_NATIVE_KEY is missing. Kakao Login might fail.');
} else {
    console.log('✅ Loaded Kakao Native Key.');
}

const getReversedClientId = (clientId) => {
    if (!clientId) return '';
    return clientId.split('.').reverse().join('.');
};

// Attempt to read Client ID from GoogleService-Info.plist (Source of Truth for iOS)
const googleServicePath = path.resolve(__dirname, '../ios/App/App/GoogleService-Info.plist');
if (fs.existsSync(googleServicePath)) {
    try {
        let plistContent = readFile(googleServicePath);
        // Simple regex to extract <key>CLIENT_ID</key><string>VALUE</string>
        const match = plistContent.match(/<key>CLIENT_ID<\/key>\s*<string>([^<]+)<\/string>/);

        if (match && match[1]) {
            console.log(`ℹ️  Found Client ID in GoogleService-Info.plist: ${match[1]}`);

            // Only override if not already set via Env (User Request to prioritize VITE_GOOGLE_CLIENT_ID)
            if (!Config.auth.google.clientId) {
                Config.auth.google.clientId = match[1];
                console.log('   -> Using ID from plist');
            } else {
                console.log('   -> Keeping ID from .env (VITE_GOOGLE_CLIENT_ID)');

                // CRITICAL: Ensure plist matches the Env ID (prevent crash due to mismatch)
                if (match[1] !== Config.auth.google.clientId) {
                    console.log(`⚠️  Mismatch detected! Updating GoogleService-Info.plist to match Env ID...`);

                    // 1. Update CLIENT_ID
                    let finalContent = plistContent.replace(
                        new RegExp(`<key>CLIENT_ID</key>\\s*<string>${match[1]}<\/string>`),
                        `<key>CLIENT_ID</key>\n\t<string>${Config.auth.google.clientId}</string>`
                    );

                    // 2. Update REVERSED_CLIENT_ID
                    const reversedOld = getReversedClientId(match[1]);
                    const reversedNew = getReversedClientId(Config.auth.google.clientId);
                    finalContent = finalContent.replace(
                        new RegExp(`<key>REVERSED_CLIENT_ID</key>\\s*<string>${reversedOld}<\/string>`),
                        `<key>REVERSED_CLIENT_ID</key>\n\t<string>${reversedNew}</string>`
                    );

                    writeFile(googleServicePath, finalContent);
                    console.log('✅ GoogleService-Info.plist updated (CLIENT_ID & REVERSED_CLIENT_ID).');
                }
            }
        }
    } catch (e) {
        console.warn('⚠️ Could not read/patch GoogleService-Info.plist:', e.message);
    }
}

// 3. Patch capacitor.config.ts (Ensure sync)
const capConfigPath = path.resolve(__dirname, '../capacitor.config.ts');
try {
    if (fs.existsSync(capConfigPath)) {
        let capContent = readFile(capConfigPath);
        if (Config.auth.google.clientId) {
            // Regex to find iosClientId: "..." and replace it
            const newCapContent = capContent.replace(
                /iosClientId:\s*"[^"]*"/,
                `iosClientId: "${Config.auth.google.clientId}"`
            );
            if (newCapContent !== capContent) {
                writeFile(capConfigPath, newCapContent);
                console.log(`✅ capacitor.config.ts updated with iosClientId: ${Config.auth.google.clientId}`);
            }
        }
    }
} catch (e) {
    console.warn('⚠️ Failed to patch capacitor.config.ts:', e.message);
}

console.log('🍎 iOS Patcher Started...');

console.log('🍎 iOS Patcher Started...');

const replacements = {
    'KAKAO_APP_KEY_PLACEHOLDER': Config.auth.kakao.nativeKey || Config.auth.kakao.apiKey,
    'kakaoKAKAO_APP_KEY_PLACEHOLDER': `kakao${Config.auth.kakao.nativeKey || Config.auth.kakao.apiKey}`,
    'GOOGLE_IOS_CLIENT_ID_PLACEHOLDER': Config.auth.google.clientId,
    'GOOGLE_REVERSED_CLIENT_ID_PLACEHOLDER': getReversedClientId(Config.auth.google.clientId),
    'GOOGLE_MAPS_IOS_KEY_PLACEHOLDER': Config.auth.google.iosKey
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
