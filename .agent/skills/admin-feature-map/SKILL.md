---
name: Admin Feature Mapping
description: 관리자 기능 전체 매핑 - 프론트엔드/백엔드 연결 가이드
---

# Admin Feature Mapping

프론트엔드 개발 시 관리자 항목을 빠뜨리지 않도록 하는 완전한 매핑 가이드

## 📋 목차

1. [Database Schema](#database-schema)
2. [Admin Pages](#admin-pages)
3. [Configuration Fields](#configuration-fields)
4. [Backend Functions](#backend-functions)
5. [Integration Checklist](#integration-checklist)

---

## 🗄️ Database Schema

### app_config Table

```sql
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**설정 키 목록:**
- `ad_config` - 광고 설정
- `version_policy` - 버전 정책
- `credit_policy` - 크레딧 정책

---

## 📄 Admin Pages

### 전체 관리자 페이지 (22개)

| 파일명 | 경로 | 기능 | DB 함수 |
|--------|------|------|---------|
| `AdminDashboard.tsx` | `/admin` | 대시보드 통계 | `getDashboardStats()` |
| `UserManagement.tsx` | `/admin/users` | 사용자 관리 | `getAdminUsers()` |
| `ToiletManagement.tsx` | `/admin/toilets` | 화장실 관리 | `getAdminToilets()` |
| `ReportManagement.tsx` | `/admin/reports` | 신고 관리 | `getAdminReports()` |
| `ReviewManagement.tsx` | `/admin/reviews` | 리뷰 관리 | `getAdminReviews()` |
| `AdManagement.tsx` | `/admin/ads` | 광고 설정 | `getAdConfig()`, `saveAdConfig()` |
| `NoticeManagement.tsx` | `/admin/notices` | 공지사항 관리 | `getAllNoticesAdmin()` |
| `PushNotificationManagement.tsx` | `/admin/push` | 푸시 알림 | - |
| `CreditPolicyManagement.tsx` | `/admin/credit` | 크레딧 정책 | `getCreditPolicy()`, `saveCreditPolicy()` |
| `VersionManagement.tsx` | `/admin/version` | 버전 관리 | `getVersionPolicy()`, `saveVersionPolicy()` |
| `DataManagement.tsx` | `/admin/data` | 데이터 관리 | - |
| `BulkUploadPage.tsx` | `/admin/bulk-upload` | 대량 업로드 | - |
| `BulkReviewPage.tsx` | `/admin/bulk-review` | 대량 리뷰 | - |
| `RegionalStats.tsx` | `/admin/stats/regional` | 지역 통계 | - |
| `ToiletStats.tsx` | `/admin/stats/toilets` | 화장실 통계 | - |
| `CreditStatistics.tsx` | `/admin/stats/credits` | 크레딧 통계 | - |
| `VisitorStatistics.tsx` | `/admin/stats/visitors` | 방문자 통계 | - |
| `UserDetailPage.tsx` | `/admin/users/:id` | 사용자 상세 | - |
| `WithdrawnUsersPage.tsx` | `/admin/withdrawn` | 탈퇴 사용자 | - |
| `AutoNotificationManagement.tsx` | `/admin/auto-notify` | 자동 알림 | - |
| `BulkFileConversionPage.tsx` | `/admin/bulk-convert` | 파일 변환 | - |

---

## ⚙️ Configuration Fields

### 1. Ad Config (`ad_config`)

**타입**: `AdConfig`

```typescript
interface AdConfig {
  // 광고 소스
  interstitialSource: 'admob' | 'youtube';  // 전면 광고 소스
  bannerSource: 'admob' | 'custom';         // 배너 광고 소스
  testMode: boolean;                        // 테스트 모드
  bannersEnabled: boolean;                  // 배너 활성화
  
  // AdMob IDs
  adMobIds: {
    banner: string;
    interstitial: string;
    reward: string;
    rewardInterstitial: string;
    appOpen: string;
    native: string;
  };
  
  // 플랫폼별 AdMob IDs
  adMobIdsIOS?: {
    appId: string;
    interstitial: string;
    reward: string;
  };
  
  adMobIdsAndroid?: {
    appId: string;
    interstitial: string;
    reward: string;
  };
  
  // 자체 영상 광고 - Android (YouTube)
  interstitialAndroid: {
    youtubeUrls: string[];       // YouTube URL 목록
    clickUrls: string[];         // 클릭 URL 목록
    durationUnlock: number;      // 잠금 해제용 광고 길이 (초)
    durationPoint: number;       // 포인트 획득용 광고 길이 (초)
    durationNavigation: number;  // 내비게이션용 광고 길이 (초)
  };
  
  // 자체 영상 광고 - iOS (MP4)
  interstitialIOS: {
    videoUrls: string[];         // MP4 URL 목록 (R2/CDN)
    clickUrls: string[];         // 클릭 URL 목록
    durationUnlock: number;
    durationPoint: number;
    durationNavigation: number;
  };
  
  // 커스텀 배너
  customBanners: Array<{
    id: string;
    type: CustomBannerType;      // 'NATIVE_MODAL' | 'IMAGE' | 'VIDEO'
    imageUrl?: string;           // 이미지/동영상 URL
    clickUrl?: string;           // 클릭 시 이동 URL
    ratio?: number;              // 가로/세로 비율
    width?: number;
    height?: number;
  }>;
  
  // Legacy (하위 호환)
  youtubeUrls?: string[];
  durationUnlock?: number;
  durationPoint?: number;
  durationNavigation?: number;
}
```

**프론트엔드 페이지**: `pages/admin/AdManagement.tsx`

**주요 설정 섹션**:
1. **광고 소스 선택** - AdMob vs 자체 영상
2. **테스트 모드** - 개발/운영 전환
3. **AdMob 설정** - App ID, 광고 단위 ID
4. **자체 영상 설정 (Android)** - YouTube URL, 재생 시간
5. **자체 영상 설정 (iOS)** - MP4 URL, 재생 시간
6. **커스텀 배너** - 이미지/동영상 배너

### 2. Version Policy (`version_policy`)

```typescript
interface VersionPolicy {
  supportedVersions: Array<{
    platform: 'ios' | 'android';
    minVersion: string;
    optionalVersion: string;
    latestVersion: string;
  }>;
}
```

**프론트엔드 페이지**: `pages/admin/VersionManagement.tsx`

**주요 항목**:
- `minVersion` - 최소 지원 버전 (강제 업데이트)
- `optionalVersion` - 권장 버전 (선택적 업데이트)
- `latestVersion` - 최신 버전

### 3. Credit Policy (`credit_policy`)

```typescript
interface CreditPolicy {
  actions: {
    [key: string]: {
      credits: number;
      cooldown?: number;  // 쿨다운 (초)
      maxPerDay?: number; // 일일 최대 횟수
    }
  };
}
```

**프론트엔드 페이지**: `pages/admin/CreditPolicyManagement.tsx`

**주요 액션**:
- `toilet_add` - 화장실 등록
- `review_add` - 리뷰 작성
- `photo_add` - 사진 업로드
- `daily_check` - 출석 체크
- `share_app` - 앱 공유
- `ad_reward` - 광고 시청

---

## 🔌 Backend Functions

### DBSupabase Service (`services/db_supabase.ts`)

#### Admin 조회 함수

```typescript
// 사용자 관리
async getAdminUsers(page, limit, filters)
async getTotalUserCount(filters)

// 화장실 관리
async getAdminToilets(page, limit, filters)

// 신고 관리
async getAdminReports(page, limit, filters)

// 리뷰 관리
async getAdminReviews(page, limit, filters)

// 통계
async getDashboardStats()

// 공지사항
async getAllNoticesAdmin()
```

#### 설정 관리 함수

```typescript
// 광고 설정
async getAdConfig(forceRefresh = false): Promise<AdConfig>
async saveAdConfig(config: AdConfig): Promise<void>
async clearAdConfigCache(): Promise<void>

// 버전 정책
async getVersionPolicy(): Promise<VersionPolicy>
async saveVersionPolicy(policy: VersionPolicy): Promise<void>

// 크레딧 정책
async getCreditPolicy(): Promise<CreditPolicy>
async saveCreditPolicy(policy: CreditPolicy): Promise<void>
```

#### 관리자 권한 확인

```typescript
async getAdminAccountId(): Promise<string>
```

---

## ✅ Integration Checklist

### 새로운 관리자 기능 추가 시

#### 1. Database 준비

- [ ] `app_config` 테이블에 새 키 추가?
  - Yes → `key`와 `value` JSONB 구조 정의
  - No → 별도 테이블 생성

#### 2. TypeScript 타입 정의

- [ ] `types/index.ts` 또는 관련 파일에 인터페이스 추가
- [ ] 모든 필수 필드 정의
- [ ] Optional 필드는 `?` 표시

```typescript
// Example:
interface MyNewConfig {
  enabled: boolean;
  settings: {
    field1: string;
    field2: number;
  };
}
```

#### 3. Backend 함수 구현

파일: `services/db_supabase.ts`

- [ ] **Get 함수 추가**
  ```typescript
  async getMyNewConfig(): Promise<MyNewConfig> {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'my_new_config')
      .single();
    
    return data?.value || defaultConfig;
  }
  ```

- [ ] **Save 함수 추가**
  ```typescript
  async saveMyNewConfig(config: MyNewConfig): Promise<void> {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        key: 'my_new_config',
        value: config,
        updated_at: new Date().toISOString()
      });
    
    if (error) throw error;
  }
  ```

- [ ] **캐시 추가 (성능 최적화)**
  ```typescript
  private myNewConfigCache: MyNewConfig | null = null;
  private myNewConfigTimestamp = 0;
  private readonly MY_NEW_CONFIG_TTL = 1000 * 60 * 5; // 5분
  ```

#### 4. Frontend 페이지 생성

파일: `pages/admin/MyNewManagement.tsx`

- [ ] 페이지 컴포넌트 생성
- [ ] `useEffect`로 설정 로드
  ```typescript
  useEffect(() => {
    const loadConfig = async () => {
      const config = await db.getMyNewConfig();
      setConfig(config);
    };
    loadConfig();
  }, []);
  ```

- [ ] 폼 UI 구현 (입력 필드, 토글, 선택기 등)
- [ ] 저장 버튼 핸들러
  ```typescript
  const handleSave = async () => {
    try {
      await db.saveMyNewConfig(config);
      alert('저장 완료!');
    } catch (error) {
      console.error(error);
      alert('저장 실패');
    }
  };
  ```

#### 5. Admin Dashboard 연결

파일: `pages/admin/AdminPage.tsx`

- [ ] 새 섹션 추가
  ```typescript
  type AdminSection = 
    | 'dashboard'
    | ... (existing)
    | 'my-new-feature';  // 추가
  ```

- [ ] 네비게이션 메뉴 항목 추가
  ```typescript
  <button 
    onClick={() => setActiveSection('my-new-feature')}
    className={/* 스타일 */}
  >
    <MyIcon /> 새 기능
  </button>
  ```

- [ ] 섹션 렌더링 추가
  ```typescript
  {activeSection === 'my-new-feature' && (
    <MyNewManagement />
  )}
  ```

#### 6. 검증 체크리스트

- [ ] 설정 로드 확인
- [ ] 설정 저장 확인
- [ ] 기본값 처리 확인
- [ ] 에러 핸들링 확인
- [ ] 타입 안전성 확인 (TypeScript 에러 없음)
- [ ] 캐시 작동 확인 (선택사항)
- [ ] UI 반응성 확인 (로딩 상태)

---

## 🚨 Common Pitfalls (자주 하는 실수)

### 1. ❌ TypeScript 타입 불일치

```typescript
// 잘못됨
const config = await db.getAdConfig();
config.newField = 'value';  // 타입 에러!

// 올바름
interface AdConfig {
  // ... existing fields
  newField?: string;  // 타입 정의에 추가
}
```

### 2. ❌ 기본값 처리 누락

```typescript
// 잘못됨
const config = await db.getAdConfig();
console.log(config.interstitialAndroid.youtubeUrls);  // null/undefined 에러!

// 올바름
const config = await db.getAdConfig();
const urls = config.interstitialAndroid?.youtubeUrls || [];
```

### 3. ❌ 플랫폼별 설정 누락

AdMob 설정 시 **iOS와 Android 모두** 확인:
- `adMobIds` - Legacy/공통
- `adMobIdsIOS` - iOS 전용
- `adMobIdsAndroid` - Android 전용

### 4. ❌ 캐시 무효화 누락

설정 저장 후 반드시:
```typescript
await db.saveAdConfig(newConfig);
await db.clearAdConfigCache();  // 캐시 무효화!
```

### 5. ❌ Frontend에서 직접 Supabase 호출

```typescript
// 잘못됨
import { supabase } from '../services/supabase';
const { data } = await supabase.from('app_config')...

// 올바름
import { dbSupabase as db } from '../services/db_supabase';
const config = await db.getAdConfig();
```

---

## 📚 Quick Reference

### 자주 사용하는 패턴

#### 1. 설정 불러오기

```typescript
const [config, setConfig] = useState<AdConfig | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const load = async () => {
    try {
      const cfg = await db.getAdConfig();
      setConfig(cfg);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  load();
}, []);
```

#### 2. 설정 저장하기

```typescript
const handleSave = async () => {
  if (!config) return;
  
  try {
    await db.saveAdConfig(config);
    await db.clearAdConfigCache();  // 캐시 클리어
    alert('✅ 저장 완료!');
  } catch (error) {
    console.error(error);
    alert('❌ 저장 실패: ' + error.message);
  }
};
```

#### 3. 배열 업데이트

```typescript
// 항목 추가
setConfig(prev => ({
  ...prev,
  interstitialAndroid: {
    ...prev.interstitialAndroid,
    youtubeUrls: [...prev.interstitialAndroid.youtubeUrls, newUrl]
  }
}));

// 항목 제거
setConfig(prev => ({
  ...prev,
  interstitialAndroid: {
    ...prev.interstitialAndroid,
    youtubeUrls: prev.interstitialAndroid.youtubeUrls.filter((_, i) => i !== index)
  }
}));

// 항목 수정
setConfig(prev => ({
  ...prev,
  interstitialAndroid: {
    ...prev.interstitialAndroid,
    youtubeUrls: prev.interstitialAndroid.youtubeUrls.map((url, i) => 
      i === index ? newValue : url
    )
  }
}));
```

---

## 🎯 Summary

**새 관리자 기능 추가 시 5단계**:

1. **타입 정의** (`types/index.ts`)
2. **DB 함수** (`services/db_supabase.ts`)
3. **페이지 생성** (`pages/admin/MyFeature.tsx`)
4. **메뉴 연결** (`pages/admin/AdminPage.tsx`)
5. **테스트** (로드/저장/에러 처리)

이 문서를 따르면 관리자 기능을 빠뜨리지 않고 완전하게 구현할 수 있습니다!
