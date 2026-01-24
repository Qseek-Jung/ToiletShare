---
name: AdMob 동영상 광고 통합 가이드
description: AdMob Interstitial/Reward 광고 설정, Supabase 구성, App Store 개인정보 설정 완벽 가이드
---

# AdMob 동영상 광고 통합 Skill

이 skill은 AdMob 동영상 광고(Interstitial/Reward)를 완벽하게 통합하는 방법을 설명합니다.

## 📋 전제 조건

- `@capacitor-community/admob` 설치됨
- Supabase `app_config` 테이블 존재
- iOS/Android 프로젝트 설정 완료

---

## 1️⃣ AdMob 광고 단위 ID 받기

### iOS App
```
App ID: ca-app-pub-XXXXXXXX~YYYYYY (예: ~9190025429)
Interstitial: ca-app-pub-XXXXXXXX/ZZZZZZ (예: /7259536047)
Reward: ca-app-pub-XXXXXXXX/WWWWWW (예: /3994421919)
```

### Android App
```
App ID: ca-app-pub-XXXXXXXX~YYYYYY (예: ~9342907044)
Interstitial: ca-app-pub-XXXXXXXX/ZZZZZZ (예: /6481640998)
Reward: ca-app-pub-XXXXXXXX/WWWWWW (예: /1560486806)
```

---

## 2️⃣ Supabase SQL 쿼리

### AdMob ID 설정 (필수!)

```sql
-- app_config 테이블의 ad_config 업데이트
UPDATE app_config
SET value = jsonb_set(
  jsonb_set(
    COALESCE(value, '{}'::jsonb),
    '{adMobIdsIOS}',
    '{"appId": "ca-app-pub-XXXXXXXX~YYYYYY", "interstitial": "ca-app-pub-XXXXXXXX/ZZZZZZ", "reward": "ca-app-pub-XXXXXXXX/WWWWWW"}'::jsonb
  ),
  '{adMobIdsAndroid}',
  '{"appId": "ca-app-pub-XXXXXXXX~YYYYYY", "interstitial": "ca-app-pub-XXXXXXXX/ZZZZZZ", "reward": "ca-app-pub-XXXXXXXX/WWWWWW"}'::jsonb
)
WHERE key = 'ad_config';
```

### 광고 소스 설정

```sql
-- interstitialSource 설정 (admob 또는 youtube)
UPDATE app_config
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{interstitialSource}',
  '"admob"'::jsonb
)
WHERE key = 'ad_config';
```

### 테스트 모드 설정

```sql
-- 개발 중: testMode = true
UPDATE app_config
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{testMode}',
  'true'::jsonb
)
WHERE key = 'ad_config';

-- 프로덕션: testMode = false
UPDATE app_config
SET value = jsonb_set(
  COALESCE(value, '{}'::jsonb),
  '{testMode}',
  'false'::jsonb
)
WHERE key = 'ad_config';
```

---

## 3️⃣ TypeScript Types 업데이트

### `types.ts` - AdConfig 인터페이스

```typescript
export interface AdConfig {
  // ... 기존 필드들 ...
  
  // AdMob 광고 소스
  interstitialSource?: 'admob' | 'youtube';
  bannerSource?: 'admob' | 'custom';
  testMode?: boolean;
  
  // iOS AdMob IDs (동영상 광고만)
  adMobIdsIOS?: {
    appId?: string;
    interstitial?: string;
    reward?: string;
  };
  
  // Android AdMob IDs (동영상 광고만)
  adMobIdsAndroid?: {
    appId?: string;
    interstitial?: string;
    reward?: string;
  };
}
```

**중요:** Banner와 Native는 제거! (Custom Banner 사용)

---

## 4️⃣ AdMob Service 구현

### `services/admob.ts` - 핵심 포인트

```typescript
class AdMobService {
  async initialize(config: AdConfig): Promise<void> {
    this.adConfig = config;
    const ids = this.getAdUnitIds();
    
    await AdMob.initialize({
      requestTrackingAuthorization: true, // iOS ATT
      testingDevices: config.testMode ? ['DEVICE_ID'] : [],
      initializeForTesting: config.testMode || false
    });
  }
  
  // ⚠️ 중요: Prepare 먼저 호출!
  async prepareInterstitial(): Promise<void> {
    const ids = this.getAdUnitIds();
    await AdMob.prepareInterstitial({
      adId: ids.interstitial,
      isTesting: this.adConfig?.testMode || false
    });
  }
  
  async showInterstitial(): Promise<boolean> {
    await AdMob.showInterstitial();
    return true;
  }
  
  async prepareRewardVideo(): Promise<void> {
    const ids = this.getAdUnitIds();
    await AdMob.prepareRewardVideoAd({
      adId: ids.reward,
      isTesting: this.adConfig?.testMode || false
    });
  }
  
  async showRewardVideo(): Promise<AdMobRewardItem | null> {
    // Listener + Show 구현
  }
}
```

---

## 5️⃣ AdManager 컴포넌트 수정

### `components/AdManager.tsx` - handleAdMobFallback

**절대 잊지 말 것: Prepare → Wait → Show 순서!**

```typescript
const handleAdMobFallback = async (testMode: boolean) => {
  try {
    // 1. 초기화 (Config 로드)
    await adMobService.initialize(config);
    
    if (adType === 'reward') {
      // 2. 준비 (광고 로드)
      await adMobService.prepareRewardVideo();
      // 3. 대기 (로딩 시간)
      await new Promise(resolve => setTimeout(resolve, 1000));
      // 4. 표시
      const result = await adMobService.showRewardVideo();
      if (result && onReward) onReward();
    } else {
      await adMobService.prepareInterstitial();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await adMobService.showInterstitial();
    }
  } catch (error) {
    console.error("AdMob Playback Failed:", error);
  } finally {
    onClose();
  }
};
```

**실수하지 말 것:**
- ❌ `showRewardVideo()` 바로 호출 → 무한 로딩
- ✅ `prepareRewardVideo()` → 대기 → `showRewardVideo()`

---

## 6️⃣ iOS Info.plist 설정

### `ios/App/App/Info.plist`

```xml
<!-- AdMob App ID -->
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXX~YYYYYY</string>

<!-- ATT (App Tracking Transparency) -->
<key>NSUserTrackingUsageDescription</key>
<string>맞춤형 광고를 제공하기 위해 사용됩니다.</string>

<!-- SKAdNetwork IDs (광고 네트워크) -->
<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
  <!-- Google AdMob 공식 가이드 참고하여 추가 -->
</array>
```

---

## 7️⃣ Android 설정

### `android/app/src/main/AndroidManifest.xml`

```xml
<manifest>
  <application>
    <!-- AdMob App ID -->
    <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-XXXXXXXX~YYYYYY"/>
  </application>
</manifest>
```

---

## 8️⃣ App Store Connect 개인정보 설정

### 필수 추가 항목 (2개)

#### A. 사용자를 추적하는 데 사용되는 데이터
1. "편집" 클릭
2. "+ 데이터 유형 추가"
3. **"식별자"** 선택
4. **"광고주의 기기 ID"** 체크 ✓
5. 목적: **"광고 또는 마케팅"**
6. 추적 사용: **"예"**

#### B. 사용자에게 연결된 데이터 (선택사항)
- Reward 광고로 크레딧 지급한다면:
  1. "+ 데이터 유형 추가"
  2. **"구매 내역"** 선택
  3. 목적: "앱 기능", "분석"
  4. 사용자 ID 연결: "예"

---

## 9️⃣ 테스트 체크리스트

### 개발 환경
- [ ] Supabase SQL 실행 (AdMob ID 설정)
- [ ] `testMode: true` 설정
- [ ] iOS/Android 디바이스 빌드
- [ ] 테스트 광고 표시 확인

### 프로덕션 환경
- [ ] `testMode: false` 변경
- [ ] 실제 AdMob ID 입력 확인
- [ ] App Store/Play Store 개인정보 설정
- [ ] 실제 디바이스 테스트
- [ ] 리워드 지급 동작 확인

---

## 🚨 트러블슈팅

### "잠시만 기다려주세요..." 무한 로딩
**원인:** `prepare` 없이 `show` 호출  
**해결:** `handleAdMobFallback` 수정 (위 5️⃣ 참고)

### 광고가 아예 안 나옴
**원인 1:** AdMob ID 미설정  
**해결:** Supabase SQL 재실행

**원인 2:** 새 광고 단위 (활성화 대기)  
**해결:** 1-24시간 대기

**원인 3:** 지역 광고 인벤토리 부족  
**해결:** `testMode: true`로 테스트

### iOS 빌드 실패 (Pod 충돌)
**원인:** `@capacitor-community/admob` 버전  
**해결:** v7.0.3 사용 (v8.0.0은 SDK 12.14 요구)

---

## 📝 빠른 참조

### Supabase에서 현재 설정 확인
```sql
SELECT value->>'interstitialSource' as source,
       value->>'testMode' as test_mode,
       value->'adMobIdsIOS'->>'appId' as ios_app,
       value->'adMobIdsAndroid'->>'appId' as android_app
FROM app_config WHERE key = 'ad_config';
```

### 관리자 페이지 경로
```
/admin → AdMob 광고 단위 ID 탭
```

---

## ✅ 완료 후 확인

- [ ] Supabase에 AdMob ID 저장됨
- [ ] iOS/Android Info.plist/Manifest 설정
- [ ] AdManager.tsx에서 Prepare → Wait → Show 순서
- [ ] App Store Connect 개인정보 설정 (IDFA)
- [ ] 테스트 광고 정상 표시
- [ ] 실제 광고 정상 표시 (프로덕션)

끝! 🎉
