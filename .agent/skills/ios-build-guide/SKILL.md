---
name: iOS Build & Validation Guide
description: iOS 빌드 시 발생할 수 있는 문제 예방 및 검증 체크리스트
---

# iOS Build & Validation Guide

iOS 빌드 시 코드 꼬임, 빌드 에러, UI 이상 동작을 방지하는 완벽 가이드

## 📋 목차

1. [Pre-Build Checklist](#pre-build-checklist)
2. [Common iOS Issues](#common-ios-issues)
3. [UI/UX Validation](#uiux-validation)
4. [Build Process](#build-process)
5. [Post-Build Testing](#post-build-testing)

---

## ✅ Pre-Build Checklist

### 1. Platform Detection 확인

```typescript
// ✅ 올바른 iOS 분기 처리
const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

if (platform === 'ios') {
  // iOS 전용 로직
}
```

**확인 위치**:
- `components/AdManager.tsx` (line 155, 164, 206, 230)
- `services/admob.ts` (line 18, 41, 76)
- `App.tsx` (line 133, 200, 2667)

### 2. CSS Safe Area 처리

```tsx
// ✅ iOS Safe Area 반영
className="pb-safe"  // Safe area bottom padding

// ❌ 잘못된 하드코딩
className="pb-24"  // Android용, iOS는 pb-safe 사용!
```

**확인 파일**:
- `index.css` - `--safe-bottom: env(safe-area-inset-bottom, 20px)`
- `App.tsx` - `pb-safe` 클래스 사용
- `DetailPage.tsx` - Platform별 padding 분기

### 3. WebView Background

```typescript
// capacitor.config.ts
backgroundColor: "#38bdf8"  // 스플래시와 동일한 색상

ios: {
  contentInset: 'never',  // iOS 컨텐츠 시프트 방지
  scheme: 'http'
}
```

### 4. iOS-Specific Plugins

**필수 플러그인 확인**:
- `@capacitor-community/apple-sign-in` - Sign in with Apple
- `@capacitor/push-notifications` - 푸시 알림
- `capacitor-plugin-app-tracking-transparency` - ATT
- `@capacitor-community/admob` - AdMob

### 5. Info.plist 설정

**필수 항목**:
```xml
<!-- App Tracking Transparency -->
<key>NSUserTrackingUsageDescription</key>
<string>맞춤형 광고를 제공하기 위해 사용됩니다.</string>

<!-- Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>주변 화장실을 찾기 위해 위치 정보가 필요합니다.</string>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>화장실 사진 등록을 위해 카메라 권한이 필요합니다.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>화장실 사진을 선택하기 위해 앨범 접근 권한이 필요합니다.</string>
```

**확인 파일**: `ios/App/App/Info.plist`

---

## 🚨 Common iOS Issues

### Issue 1: 스크롤이 안됨 ❌

**증상**: iOS에서 페이지 스크롤이 작동하지 않음

**원인**:
1. `-webkit-overflow-scrolling: touch` 누락
2. `overscroll-behavior-y: none` 설정
3. Fixed 포지션 요소가 스크롤 막음

**해결책**:

```css
/* index.css */
.overflow-y-auto {
  -webkit-overflow-scrolling: touch;
}

html {
  overscroll-behavior-y: none;
  -webkit-overflow-scrolling: touch;
}
```

```tsx
// 컴포넌트에서
<div 
  className="overflow-y-auto" 
  style={{ WebkitOverflowScrolling: 'touch' }}
>
  {/* 스크롤 컨텐츠 */}
</div>
```

**검증 방법**:
- Xcode Simulator에서 스와이프 스크롤 테스트
- 긴 리스트 페이지 (ReviewManagement, UserManagement) 확인

---

### Issue 2: 클릭이 안됨 ❌

**증상**: 버튼/링크 터치가 반응 없음

**원인**:
1. `pointer-events: none` 설정
2. z-index 겹침 문제
3. Touch target 크기 너무 작음

**해결책**:

```css
/* index.css - iOS Touch Event Fixes */
@supports (-webkit-touch-callout: none) {
  button, a, [role="button"] {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }
}
```

```tsx
// 최소 터치 영역 확보
<button className="min-h-[44px] min-w-[44px]">  // iOS HIG 권장
  클릭
</button>
```

**검증 방법**:
- Navigation Bar 모든 버튼 클릭 테스트
- Modal 닫기 버튼 확인
- 오버레이 백드롭 클릭 확인

---

### Issue 3: Keyboard가 화면을 가림 ❌

**증상**: 키보드 올라올 때 입력 필드가 가려짐

**원인**:
1. `contentInset: 'never'` 미설정
2. Keyboard resize 설정 잘못됨

**해결책**:

```typescript
// capacitor.config.ts
ios: {
  contentInset: 'never',  // 필수!
},
plugins: {
  Keyboard: {
    resize: "body",
    resizeOnFullScreen: true,
  }
}
```

**검증 방법**:
- SubmitPage에서 모든 입력 필드 테스트
- 리뷰 작성 textarea 테스트
- 검색창 테스트

---

### Issue 4: Safe Area 깨짐 ❌

**증상**: 노치/홈 인디케이터 영역에 컨텐츠가 가려짐

**원인**:
1. `pb-safe` 누락
2. Safe area inset 변수 미사용

**해결책**:

```css
/* index.css */
--safe-bottom: env(safe-area-inset-bottom, 20px);
```

```tsx
// 하단 고정 요소
<nav className="pb-safe">
  {/* Navigation */}
</nav>
```

**검증 방법**:
- iPhone 11/12/13/14/15 시뮬레이터 확인
- 하단 네비게이션 바 위치 확인
- 모달 하단 버튼 위치 확인

---

### Issue 5: MP4 광고 재생 안됨 ❌

**증상**: iOS에서 자체 영상 광고가 재생되지 않음

**원인**:
1. MP4 URL이 설정되지 않음 (YouTube URL만 있음)
2. R2/CDN 설정 오류
3. Video element autoplay 제한

**해결책**:

```typescript
// AdManager.tsx - iOS는 MP4 사용
if (platform === 'ios') {
  const ios = config.interstitialIOS || { 
    videoUrls: [],  // MP4 URL 배열
    clickUrls: [],
    durationUnlock: 15,
    durationPoint: 15,
    durationNavigation: 5
  };
  
  // MP4 플레이어 표시
  setShowMP4(true);
}
```

**관리자 설정**:
- Admin → 광고설정 → iOS 영상 광고
- MP4 URL 입력 (예: `https://cdn.example.com/ad01.mp4`)

**검증 방법**:
- 화장실 잠금 해제 시 광고 플레이
- 포인트 획득 광고 플레이
- 영상 로딩/재생/종료 플로우 확인

---

### Issue 6: Sign in with Apple 안됨 ❌

**증상**: Apple 로그인 버튼 눌러도 반응 없음

**원인**:
1. App ID에서 Sign in with Apple 미활성화
2. Entitlements 누락
3. Bundle ID 불일치

**해결책**:

1. **Apple Developer Portal**:
   - Certificates, Identifiers & Profiles → Identifiers
   - App ID 선택 → Sign in with Apple 체크
   - Save

2. **Xcode**:
   - Target → Signing & Capabilities
   - "+ Capability" → Sign in with Apple 추가

3. **App.entitlements** 확인:
```xml
<key>com.apple.developer.applesignin</key>
<array>
  <string>Default</string>
</array>
```

**검증 방법**:
- 로그인 화면에서 Sign in with Apple 버튼 클릭
- Apple ID 선택 화면 표시 확인
- 로그인 완료 후 프로필 확인

---

### Issue 7: AdMob 광고 안나옴 ❌

**증상**: iOS에서 AdMob 광고가 표시되지 않음

**원인**:
1. iOS AdMob ID 미설정
2. ATT 권한 미허용
3. 테스트 모드 ON 상태에서 실제 광고 ID 사용

**해결책**:

1. **Admin 설정 확인**:
```
Admin → 광고설정 → AdMob 설정
→ iOS AdMob ID 입력
   - App ID: ca-app-pub-XXXXXXXX~YYYYYY
   - Reward: ca-app-pub-XXXXXXXX/1111111111
   - Interstitial: ca-app-pub-XXXXXXXX/2222222222
```

2. **ATT 권한 확인**:
```typescript
// App.tsx - ATT 요청이 먼저 실행되어야 함
await AppTrackingTransparency.requestPermission();
await adMobService.initialize(config);
```

3. **테스트 모드 확인**:
- 개발: testMode = true (테스트 광고 ID)
- 운영: testMode = false (실제 광고 ID)

**검증 방법**:
- TestFlight 빌드에서 실제 광고 표시 확인
- 광고 로드 → 표시 → 닫기 플로우 테스트

---

## 🎨 UI/UX Validation

### 1. 스크롤 테스트

**테스트 페이지**:
- ✅ HomePage - 화장실 리스트
- ✅ DetailPage - 리뷰 목록
- ✅ MyPage - 전체 페이지 스크롤
- ✅ NotificationPage - 알림 목록
- ✅ Admin 페이지 - 모든 관리 페이지

**체크리스트**:
- [ ] 위아래 스와이프 스크롤 작동
- [ ] 바운스 효과 자연스러움
- [ ] Momentum scrolling 작동
- [ ] 스크롤 시 화면 떨림 없음

### 2. 터치/클릭 테스트

**테스트 요소**:
- ✅ Bottom Navigation Bar (5개 버튼)
- ✅ 화장실 마커 클릭
- ✅ 북마크 버튼
- ✅ 리뷰 작성 버튼
- ✅ Modal 닫기 버튼
- ✅ 필터 버튼

**체크리스트**:
- [ ] 모든 버튼 터치 반응
- [ ] 터치 하이라이트 표시
- [ ] 중복 터치 방지 작동
- [ ] 제스처 충돌 없음

### 3. Safe Area 테스트

**테스트 디바이스**:
- iPhone SE (Home Button)
- iPhone 12/13/14/15 (Notch/Dynamic Island)
- iPhone 15 Pro Max (최대 크기)

**체크리스트**:
- [ ] 상단 Status Bar 영역 깨지지 않음
- [ ] 하단 Home Indicator 영역 깨지지 않음
- [ ] Navigation Bar가 가려지지 않음
- [ ] Modal 하단 버튼이 가려지지 않음

### 4. 다크 모드 테스트

**테스트 항목**:
- [ ] 설정에서 다크 모드 토글 작동
- [ ] 모든 페이지 다크 모드 적용
- [ ] Text 가독성 확인
- [ ] Background/Foreground 대비 확인

### 5. 키보드 테스트

**테스트 페이지**:
- SubmitPage (등록 폼)
- DetailPage (리뷰 작성)
- SearchPage (검색창)

**체크리스트**:
- [ ] 키보드 올라올 때 입력 필드 보임
- [ ] 키보드 내려갈 때 레이아웃 복원
- [ ] Return 키 작동
- [ ] Next/Done 버튼 작동

---

## 🔨 Build Process

### 1. 빌드 전 준비

```bash
# 1. 의존성 최신화
npm install

# 2. 웹 빌드
npm run build:ios

# 3. Capacitor Sync (중요!)
npx cap sync ios
```

### 2. Xcode 빌드

1. **Xcode 열기**:
```bash
npx cap open ios
```

2. **Signing 확인**:
   - Target → Signing & Capabilities
   - Team 선택
   - Bundle ID 확인

3. **Build Configuration**:
   - Scheme: App
   - Target: 실제 디바이스 또는 시뮬레이터
   - Build Configuration: Debug 또는 Release

4. **빌드 실행**:
   - `⌘R` (Run) 또는 `⌘B` (Build)

### 3. 빌드 에러 확인

**자주 발생하는 에러**:

| 에러 | 원인 | 해결책 |
|------|------|--------|
| "Signing requires..." | Provisioning Profile 없음 | Team 선택 또는 프로파일 생성 |
| "No such module..." | 플러그인 미설치 | `pod install` 실행 |
| "Duplicate symbols..." | 중복 라이브러리 | Podfile.lock 삭제 후 재설치 |
| "Undefined symbol..." | Native 코드 링크 오류 | Clean Build Folder (⇧⌘K) |

### 4. GitHub Actions 빌드

**워크플로우**: `.github/workflows/ios_build.yml`

**빌드 트리거**:
```bash
# Commit & Push
git add -A
git commit -m "feat: iOS build v135"
git push origin main
```

**빌드 확인**:
- https://github.com/Qseek-Jung/ToiletShare/actions
- iOS Build 워크플로우 상태 확인
- TestFlight에 자동 업로드

---

## 🧪 Post-Build Testing

### 1. 시뮬레이터 테스트

**테스트 시뮬레이터**:
- iPhone 15 Pro Max (최대 크기)
- iPhone SE (최소 크기)
- iPad Air (태블릿)

**테스트 플로우**:
1. 앱 실행 → 스플래시 화면
2. 로그인 (Apple/Kakao/Naver)
3. 권한 요청 (Location, ATT)
4. 메인 화면 → 화장실 목록
5. 화장실 상세 → 리뷰 작성
6. 마이페이지 → 프로필 확인
7. 설정 → 다크 모드 토글

### 2. 실제 디바이스 테스트

**Xcode 연결**:
1. iPhone을 Mac에 USB 연결
2. Xcode에서 디바이스 선택
3. `⌘R` 실행

**테스트 항목**:
- [ ] GPS 위치 정확도
- [ ] 카메라 사진 업로드
- [ ] 푸시 알림 수신
- [ ] 네트워크 속도 (4G/5G/WiFi)
- [ ] 배터리 소모량

### 3. TestFlight 테스트

**TestFlight 설치**:
1. App Store에서 TestFlight 앱 다운로드
2. 초대 링크 클릭 또는 코드 입력
3. 앱 설치

**베타 테스트 항목**:
- [ ] 실제 AdMob 광고 표시
- [ ] Sign in with Apple 로그인
- [ ] 모든 주요 기능 정상 작동
- [ ] 크래시 없음

---

## 📊 Performance Checklist

### 1. 시작 시간

- [ ] Cold Start: < 3초
- [ ] Warm Start: < 1초

### 2. 메모리 사용

- [ ] 평균 메모리: < 300MB
- [ ] 최대 메모리: < 500MB
- [ ] 메모리 릭 없음

### 3. 네트워크

- [ ] API 응답 시간: < 2초
- [ ] 이미지 로딩: < 1초
- [ ] 오프라인 처리 적절

### 4. 배터리

- [ ] 1시간 사용 시 배터리 소모: < 10%
- [ ] Background usage 최소화

---

## 🎯 Final Checklist

### 빌드 전

- [ ] Platform detection 코드 확인
- [ ] iOS Safe Area 처리 확인
- [ ] Info.plist 권한 설명 입력
- [ ] AdMob iOS ID 설정
- [ ] Sign in with Apple 활성화
- [ ] Build Number 증가

### 빌드 후

- [ ] 시뮬레이터에서 모든 페이지 확인
- [ ] 실제 디바이스에서 테스트
- [ ] TestFlight에서 베타 테스트
- [ ] 스크롤/클릭/키보드 이슈 없음
- [ ] Safe Area 깨지지 않음
- [ ] 광고 정상 작동
- [ ] 로그인 정상 작동

이 체크리스트를 따르면 iOS 빌드 시 문제없이 안정적인 앱을 배포할 수 있습니다! 🎉
