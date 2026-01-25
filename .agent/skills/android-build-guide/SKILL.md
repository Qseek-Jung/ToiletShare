---
name: Android Build & Validation Guide
description: Android 빌드 시 발생할 수 있는 문제 예방 및 검증 체크리스트
---

# Android Build & Validation Guide

Android 빌드 시 코드 꼬임, 빌드 에러, UI 이상 동작을 방지하는 완벽 가이드

## 📋 목차

1. [Pre-Build Checklist](#pre-build-checklist)
2. [Common Android Issues](#common-android-issues)
3. [UI/UX Validation](#uiux-validation)
4. [Build Process](#build-process)
5. [Post-Build Testing](#post-build-testing)

---

## ✅ Pre-Build Checklist

### 1. Platform Detection 확인

```typescript
// ✅ 올바른 Android 분기 처리
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

if (platform === 'android') {
  // Android 전용 로직
}
```

**확인 위치**:
- `components/AdManager.tsx` (line 155)
- `services/admob.ts` (line 18, 83)
- `pages/DetailPage.tsx` (line 300)

### 2. CSS Padding 처리

```tsx
// ❌ iOS Safe Area는 Android에서 안됨
className="pb-safe"  // iOS 전용!

// ✅ Android는 고정 패딩
className="pb-24"  // Android는 Navigation Bar 고정 높이
```

**확인 파일**:
- `DetailPage.tsx` - Platform별 padding 분기

### 3. YouTube 광고 설정

```typescript
// AdManager.tsx - Android는 YouTube 사용
if (platform === 'android') {
  const android = config.interstitialAndroid || { 
    youtubeUrls: [],  // YouTube URL/ID 배열
    clickUrls: [],
    durationUnlock: 15,
    durationPoint: 15,
    durationNavigation: 5 
  };
  
  // YouTube player 표시
  setShowYoutube(true);
}
```

### 4. Android-Specific Plugins

**필수 플러그인 확인**:
- `@capacitor/push-notifications` - FCM 푸시
- `@capacitor-firebase/messaging` - Firebase Messaging
- `@capacitor-community/admob` - AdMob
- Google Play Services (자동 포함)

### 5. AndroidManifest.xml 설정

**필수 권한**:
```xml
<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- AdMob -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXX~YYYYYY"/>
```

**확인 파일**: `android/app/src/main/AndroidManifest.xml`

---

## 🚨 Common Android Issues

### Issue 1: 스크롤이 안됨 ❌

**증상**: Android에서 페이지 스크롤이 작동하지 않음

**원인**:
1. `overscroll-behavior-y: none` 설정
2. `overflow-y: hidden` 설정
3. Fixed height 제한

**해결책**:

```tsx
// 컴포넌트에서
<div className="h-full overflow-y-auto">
  {/* 스크롤 컨텐츠 */}
</div>
```

```css
/* Android에서도 스크롤 작동 */
.overflow-y-auto {
  overflow-y: auto;
  overscroll-behavior-y: contain;
}
```

**검증 방법**:
- Android Emulator에서 스와이프 스크롤 테스트
- 긴 리스트 페이지 확인

---

### Issue 2: 클릭이 안됨 ❌

**증상**: 버튼/링크 터치가 반응 없음

**원인**:
1. Touch target 크기 너무 작음 (Android는 48dp 권장)
2. z-index 겹침
3. `pointer-events: none`

**해결책**:

```tsx
// 최소 터치 영역 확보
<button className="min-h-[48px] min-w-[48px]">  // Material Design 권장
  클릭
</button>
```

```css
/* Touch feedback */
button {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

**검증 방법**:
- Navigation Bar 모든 버튼 클릭 테스트
- 작은 아이콘 버튼 확인
- Ripple effect 표시 확인

---

### Issue 3: Keyboard가 레이아웃을 깨뜨림 ❌

**증상**: 키보드 올라올 때 화면 레이아웃이 망가짐

**원인**:
1. Android manifest `windowSoftInputMode` 미설정
2. Viewport height 계산 오류

**해결책**:

```xml
<!-- AndroidManifest.xml -->
<activity
    android:windowSoftInputMode="adjustResize">
</activity>
```

```typescript
// capacitor.config.ts
plugins: {
  Keyboard: {
    resize: "body",
    resizeOnFullScreen: true,
  }
}
```

**검증 방법**:
- SubmitPage에서 모든 입력 필드 테스트
- 키보드 show/hide 시 레이아웃 확인

---

### Issue 4: Status Bar/Navigation Bar 겹침 ❌

**증상**: Status Bar 또는 Navigation Bar 영역에 컨텐츠가 가려짐

**원인**:
1. System UI 영역 고려 안함
2. Fullscreen 모드 설정 오류

**해결책**:

```tsx
// Android는 pb-24로 Navigation Bar 공간 확보
<nav className="pb-24">  // Android Bottom Navigation
  {/* Navigation */}
</nav>
```

```typescript
// capacitor.config.ts - Android specific
android: {
  allowMixedContent: true,
  captureInput: true
}
```

**검증 방법**:
- Various Android 디바이스 (Gesture Navigation vs 3-Button Navigation)
- 하단 네비게이션 바 위치 확인

---

### Issue 5: YouTube 광고 재생 안됨 ❌

**증상**: Android에서 YouTube 광고가 재생되지 않음

**원인**:
1. YouTube URL/ID 설정 오류
2. YouTube iframe API 로드 실패
3. Network 권한 없음

**해결책**:

1. **관리자 설정 확인**:
```
Admin → 광고설정 → Android 영상 광고
→ YouTube URL/ID 입력
   - 11자리 ID: 2S47kMBvbDg
   - 또는 전체 URL: https://www.youtube.com/watch?v=2S47kMBvbDg
```

2. **YouTube API 로드**:
```typescript
// index.html에 YouTube iframe API 포함
<script src="https://www.youtube.com/iframe_api"></script>
```

3. **네트워크 권한**:
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.INTERNET" />
```

**검증 방법**:
- 화장실 잠금 해제 시 YouTube 광고 플레이
- 영상 로딩/재생/종료 플로우 확인

---

### Issue 6: Google 로그인 안됨 ❌

**증상**: Google 로그인 버튼 눌러도 반응 없음

**원인**:
1. SHA-1 fingerprint 미등록
2. OAuth Client ID 미설정
3. google-services.json 누락

**해결책**:

1. **SHA-1 Fingerprint 등록**:
```bash
# Debug SHA-1
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Release SHA-1
keytool -list -v -keystore your-release-key.keystore -alias your-alias
```

2. **Firebase Console**:
   - Project Settings → Add App → Android
   - SHA-1 fingerprint 추가
   - google-services.json 다운로드 → `android/app/`

3. **capacitor.config.ts**:
```typescript
plugins: {
  GoogleAuth: {
    scopes: ["profile", "email"],
    serverClientId: "YOUR-WEB-CLIENT-ID.apps.googleusercontent.com",
    forceCodeForRefreshToken: true
  }
}
```

**검증 방법**:
- Google 로그인 버튼 클릭
- Google 계정 선택 화면 표시
- 로그인 완료 후 프로필 확인

---

### Issue 7: AdMob 광고 안나옴 ❌

**증상**: Android에서 AdMob 광고가 표시되지 않음

**원인**:
1. Android AdMob ID 미설정
2. AndroidManifest.xml에 APPLICATION_ID 없음
3. 테스트 디바이스 미등록

**해결책**:

1. **Admin 설정 확인**:
```
Admin → 광고설정 → AdMob 설정
→ Android AdMob ID 입력
   - App ID: ca-app-pub-XXXXXXXX~YYYYYY
   - Reward: ca-app-pub-XXXXXXXX/1111111111
   - Interstitial: ca-app-pub-XXXXXXXX/2222222222
```

2. **AndroidManifest.xml**:
```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXX~YYYYYY"/>
```

3. **테스트 디바이스 등록**:
- AdMob Console → Settings → Test devices
- 디바이스 ID 추가

**검증 방법**:
- 테스트 광고 표시 확인
- 실제 광고 로드 → 표시 → 닫기

---

### Issue 8: FCM 푸시 알림 안옴 ❌

**증상**: Push 알림이 디바이스에 도착하지 않음

**원인**:
1. google-services.json 누락
2. FCM Server Key 미설정
3. 권한 미허용

**해결책**:

1. **google-services.json**:
```bash
# 파일 위치 확인
ls android/app/google-services.json
```

2. **권한 요청**:
```typescript
// App.tsx
import { PushNotifications } from '@capacitor/push-notifications';

await PushNotifications.requestPermissions();
await PushNotifications.register();
```

3. **FCM Token 확인**:
```typescript
PushNotifications.addListener('registration', (token) => {
  console.log('FCM Token:', token.value);
});
```

**검증 방법**:
- Firebase Console에서 테스트 알림 전송
- 앱 foreground/background 모두 확인

---

## 🎨 UI/UX Validation

### 1. 스크롤 테스트

**테스트 페이지**:
- ✅ HomePage - 화장실 리스트
- ✅ DetailPage - 리뷰 목록
- ✅ MyPage - 전체 페이지 스크롤
- ✅ NotificationPage - 알림 목록

**체크리스트**:
- [ ] 위아래 스와이프 스크롤 작동
- [ ] Edge 스크롤 효과 (glow effect)
- [ ] Fling 제스처 작동
- [ ] 스크롤 시 화면 떨림 없음

### 2. 터치/클릭 테스트

**테스트 요소**:
- ✅ Bottom Navigation Bar
- ✅ FAB (Floating Action Button)
- ✅ List Items
- ✅ 북마크 버튼
- ✅ Modal 닫기 버튼

**체크리스트**:
- [ ] 모든 버튼 터치 반응
- [ ] Ripple effect 표시
- [ ] 중복 터치 방지
- [ ] 최소 48dp 터치 영역

### 3. Material Design 가이드라인

**체크 항목**:
- [ ] 일관된 elevation (그림자)
- [ ] 적절한 색상 대비
- [ ] Typography 일관성
- [ ] 애니메이션 부드러움

### 4. 다크 모드 테스트

**테스트 항목**:
- [ ] 설정에서 다크 모드 토글 작동
- [ ] System Dark Mode 감지 (선택사항)
- [ ] 모든 페이지 다크 모드 적용
- [ ] Text 가독성 확인

### 5. 키보드 테스트

**테스트 페이지**:
- SubmitPage (등록 폼)
- DetailPage (리뷰 작성)
- SearchPage (검색창)

**체크리스트**:
- [ ] 키보드 올라올 때 레이아웃 adjustResize
- [ ] IME Action (Next, Done, Search) 작동
- [ ] 키보드 내려갈 때 복원
- [ ] 텍스트 자동완성 작동

---

## 🔨 Build Process

### 1. 빌드 전 준비

```bash
# 1. 의존성 최신화
npm install

# 2. Android 웹 빌드
npm run build:android

# 3. Capacitor Sync (중요!)
npx cap sync android
```

### 2. Android Studio 빌드

1. **Android Studio 열기**:
```bash
npx cap open android
```

2. **Gradle Sync**:
   - File → Sync Project with Gradle Files
   - 에러 없는지 확인

3. **Build Variant 선택**:
   - Build → Select Build Variant
   - Debug 또는 Release 선택

4. **빌드 실행**:
   - `⇧F10` (Run) 또는 Build → Build Bundle(s) / APK(s)

### 3. 빌드 에러 확인

**자주 발생하는 에러**:

| 에러 | 원인 | 해결책 |
|------|------|--------|
| "Duplicate class..." | 중복 라이브러리 | `build.gradle` 의존성 정리 |
| "SDK location not found" | Android SDK 경로 없음 | `local.properties` 설정 |
| "Execution failed..." | Gradle 버전 불일치 | Gradle 업데이트 |
| "Manifest merger failed..." | Manifest 충돌 | AndroidManifest.xml 확인 |

### 4. 서명 (Signing)

**Debug Keystore**:
```bash
# 자동 사용 (비밀번호: android)
~/.android/debug.keystore
```

**Release Keystore**:
```bash
# Keystore 생성
keytool -genkey -v -keystore my-release-key.keystore -alias my-alias -keyalg RSA -keysize 2048 -validity 10000

# build.gradle에 설정
android {
  signingConfigs {
    release {
      storeFile file('my- release-key.keystore')
      storePassword 'PASSWORD'
      keyAlias 'my-alias'
      keyPassword 'PASSWORD'
    }
  }
}
```

### 5. APK/AAB 생성

**APK (테스트용)**:
```bash
cd android
./gradlew assembleRelease
# 출력: android/app/build/outputs/apk/release/app-release.apk
```

**AAB (Play Store 배포용)**:
```bash
cd android
./gradlew bundleRelease
# 출력: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🧪 Post-Build Testing

### 1. Emulator 테스트

**테스트 Emulator**:
- Pixel 6 (최신)
- Pixel 4a (중간)
- Galaxy S21 (삼성)
- OnePlus 9 (다양성)

**API Level**:
- Android 13 (API 33)
- Android 12 (API 31)
- Android 11 (API 30)

**테스트 플로우**:
1. 앱 실행 → 스플래시
2. 로그인 (Google/Kakao/Naver)
3. 권한 요청 (Location)
4. 메인 화면 → 화장실 목록
5. 화장실 상세 → 리뷰 작성
6. 마이페이지
7. 설정 → 다크 모드

### 2. 실제 디바이스 테스트

**USB 디버깅**:
1. 디바이스에서 Developer Options 활성화
2. USB Debugging ON
3. USB 연결 → 인증
4. Android Studio에서 디바이스 선택 → Run

**테스트 항목**:
- [ ] GPS 위치 정확도
- [ ] 카메라 사진 업로드
- [ ] FCM 푸시 수신
- [ ] 네트워크 속도
- [ ] 배터리 소모

### 3. Google Play Internal Testing

**업로드**:
1. Google Play Console
2. Testing → Internal Testing
3. Create Release → Upload AAB
4. Review → Start Rollout

**베타 테스터 초대**:
- Testing → Testers
- Email 리스트 또는 Google Group

**테스트 항목**:
- [ ] Play Store에서 정상 설치
- [ ] 실제 AdMob 광고 표시
- [ ] In-App Billing (미래)
- [ ] 모든 기능 정상 작동

---

## 📊 Performance Checklist

### 1. 시작 시간

- [ ] Cold Start: < 3초
- [ ] Warm Start: < 1초
- [ ] Splash Screen 표시

### 2. 메모리 사용

- [ ] 평균 메모리: < 300MB
- [ ] 최대 메모리: < 500MB
- [ ] GC 빈도 적절

### 3. 네트워크

- [ ] API 응답 시간: < 2초
- [ ] 이미지 캐싱 작동
- [ ] 오프라인 처리

### 4. 배터리

- [ ] 1시간 사용 시 배터리 소모: < 10%
- [ ] Background service 최소화
- [ ] Wakelock 적절히 사용

---

## 🎯 Final Checklist

### 빌드 전

- [ ] Platform detection 코드 확인
- [ ] Android padding (pb-24) 처리
- [ ] AndroidManifest.xml 권한 확인
- [ ] google-services.json 포함
- [ ] AdMob Android ID 설정
- [ ] YouTube URL 설정 (자체 영상)
- [ ] Version Code/Name 증가

### 빌드 후

- [ ] Emulator에서 모든 페이지 확인
- [ ] 실제 디바이스에서 테스트
- [ ] 스크롤/클릭/키보드 이슈 없음
- [ ] Navigation Bar 겹침 없음
- [ ] YouTube 광고 정상 작동
- [ ] Google 로그인 정상 작동
- [ ] FCM 푸시 수신 확인

이 체크리스트를 따르면 Android 빌드 시 문제없이 안정적인 앱을 배포할 수 있습니다! 🎉
