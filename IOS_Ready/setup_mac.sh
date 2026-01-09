#!/bin/bash

# iOS Setup Automation Script for Beginners
# Mac 전용 자동 설정 스크립트입니다.

echo "🍎 iOS 프로젝트 설정을 시작합니다..."

# 1. 의존성 설치 (Node Modules)
echo "📦 1. 프로젝트 패키지 설치 중..."
npm install

# 2. iOS 폴더가 없으면 추가
if [ ! -d "ios" ]; then
    echo "📲 2. iOS 플랫폼 추가 중..."
    npx cap add ios
else
    echo "✅ iOS 폴더가 이미 존재합니다."
fi

# 3. CocoaPods 의존성 설치 (가장 자주 실패하는 부분)
echo "☕ 3. CocoaPods 설치 및 업데이트 중..."
if ! command -v pod &> /dev/null; then
    echo "⚠️ CocoaPods가 없습니다. 설치를 시도합니다 (비밀번호 입력이 필요할 수 있습니다)..."
    sudo gem install cocoapods
fi

# 4. 웹 자산 빌드
echo "🏗️ 4. 웹 소스 빌드 중..."
npm run build

# 5. Capacitor 동기화
echo "🔄 5. iOS 프로젝트와 동기화 중..."
npx cap sync ios

echo "🎉 설정이 완료되었습니다!"
echo "이제 다음 명령어로 Xcode를 실행하세요:"
echo "npx cap open ios"
