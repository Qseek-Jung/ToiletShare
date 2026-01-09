#!/bin/bash

# iOS Setup Automation Script for Beginners (Improved)
# Mac 전용 자동 설정 스크립트입니다.

echo "🍎 iOS 프로젝트 설정을 시작합니다..."

# 0. 필수 프로그램 확인 함수
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ '$1' 프로그램이 설치되어 있지 않습니다."
        echo "⬇️  설치 방법:"
        if [ "$1" == "brew" ]; then
             echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        elif [ "$1" == "node" ] || [ "$1" == "npm" ]; then
             echo "brew install node"
             echo "(또는 https://nodejs.org 에서 LTS 버전을 설치하세요)"
        elif [ "$1" == "pod" ]; then
             echo "brew install cocoapods"
        fi
        exit 1
    fi
}

echo "🔍 0. 환경 점검 중..."
check_command "npm"
check_command "node"

# Homebrew 설치 여부 확인 (권장)
if ! command -v brew &> /dev/null; then
    echo "⚠️ Homebrew가 없습니다. 가능하면 설치를 권장합니다. (Ruby 에러 해결에 도움됨)"
fi

# 1. 의존성 설치 (Node Modules)
echo "📦 1. 프로젝트 패키지 설치 중..."
npm install || { echo "❌ npm install 실패! Node.js를 다시 설치해보세요."; exit 1; }

# 2. iOS 폴더가 없으면 추가
if [ ! -d "ios" ]; then
    echo "📲 2. iOS 플랫폼 추가 중..."
    npx cap add ios || { echo "❌ iOS 플랫폼 추가 실패!"; exit 1; }
else
    echo "✅ iOS 폴더가 이미 존재합니다."
fi

# 3. CocoaPods 의존성 설치
echo "☕ 3. CocoaPods 설치 및 업데이트 중..."
if ! command -v pod &> /dev/null; then
    echo "⚠️ CocoaPods가 없습니다. Homebrew로 설치를 시도합니다..."
    if command -v brew &> /dev/null; then
        brew install cocoapods
    else
        echo "❌ Homebrew가 없어서 CocoaPods를 설치할 수 없습니다."
        echo "터미널에 다음을 입력해서 Homebrew를 먼저 설치하세요:"
        echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
        exit 1
    fi
fi

# 4. 웹 자산 빌드
echo "🏗️ 4. 웹 소스 빌드 중..."
npm run build || { echo "❌ 빌드 실패!"; exit 1; }

# 5. Capacitor 동기화
echo "🔄 5. iOS 프로젝트와 동기화 중..."
npx cap sync ios || { echo "❌ 동기화 실패!"; exit 1; }

echo "🎉 설정이 완료되었습니다!"
echo "이제 다음 명령어로 Xcode를 실행하세요:"
echo "npx cap open ios"
