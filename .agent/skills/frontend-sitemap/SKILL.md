---
name: Frontend Sitemap & Feature Map
description: 전체 프론트엔드 사이트맵 및 기능 매핑 - 개발 시 누락 방지 가이드
---

# Frontend Sitemap & Feature Map

프론트엔드 페이지 전체 사이트맵 및 기능 매핑으로 개발 시 한쪽만 반영되는 실수 방지

## 📋 목차

1. [Route Structure](#route-structure)
2. [Page Inventory](#page-inventory)
3. [Feature Matrix](#feature-matrix)
4. [Backend API Mapping](#backend-api-mapping)
5. [Development Checklist](#development-checklist)

---

## 🗺️ Route Structure

### Routing System

**Hash-based Routing**: `window.location.hash`

**Main Entry**: `App.tsx` (line 2115+)

### Route Categories

```
/                          → HomePage (화장실 지도)
/toilet/:id                → DetailPage (Overlay)
/my                        → MyPage (마이페이지)
/submit                    → SubmitPage (화장실 등록)
/edit/:id                  → SubmitPage (수정 모드)
/notifications             → NotificationPage
/notice/:id                → NoticePage (단일 공지)
/settings                  → SettingsPage
/app-info                  → AppInfoPage
/terms                     → TermsOfService
/privacy                   → PrivacyPolicy
/guide                     → UsageGuidePage
/guide/credit              → CreditGuide
/guide/registration        → RegistrationGuide
/admin                     → AdminPage
/admin/users/:id           → UserDetailPage
/admin/users/withdrawn     → WithdrawnUsersPage
/test/photo-reg            → PhotoTestPage
```

---

## 📄 Page Inventory

### 총 37개 페이지

#### Main Pages (12개)

| 파일 | 경로 | 주요 기능 | Backend API |
|------|------|----------|-------------|
| `HomePage.tsx` | `#/` | 지도, 화장실 목록, 북마크 | `getToilets()`, `getBookmarks()` |
| `DetailPage.tsx` | `#/toilet/:id` | 상세 정보, 리뷰, 사진 | `getToiletById()`, `getReviews()` |
| `MyPage.tsx` | `#/my` | 프로필, 내 활동, 크레딧 | `getUserByEmail()`, `getMyReviews()` |
| `SubmitPage.tsx` | `#/submit`, `#/edit/:id` | 화장실 등록/수정 | `addToilet()`, `updateToilet()` |
| `NotificationPage.tsx` | `#/notifications` | 알림 목록 | `getNotifications()` |
| `NoticePage.tsx` | `#/notice/:id` | 공지 상세 | `getNoticeById()` |
| `SettingsPage.tsx` | `#/settings` | 설정, 계정 관리 | `deleteAccount()` |
| `AppInfoPage.tsx` | `#/app-info` | 앱 정보, 버전 | - |
| `PrivacyPolicy.tsx` | `#/privacy` | 개인정보 처리방침 | - |
| `TermsOfService.tsx` | `#/terms` | 이용약관 | - |
| `UsageGuidePage.tsx` | `#/guide` | 사용 가이드 | - |
| `DownloadPage.tsx` | Special | 앱 다운로드 (referral) | - |

#### Admin Pages (22개)

| 파일 | Admin Section | 기능 | Backend API |
|------|---------------|------|-------------|
| `AdminDashboard.tsx` | `dashboard` | 통계 대시보드 | `getDashboardStats()` |
| `UserManagement.tsx` | `users` | 사용자 관리 | `getAdminUsers()` |
| `ToiletManagement.tsx` | `toilets` | 화장실 관리 | `getAdminToilets()` |
| `ReportManagement.tsx` | `reports` | 신고 관리 | `getAdminReports()` |
| `ReviewManagement.tsx` | `reviews` | 리뷰 관리 | `getAdminReviews()` |
| `AdManagement.tsx` | `ads` | 광고 설정 | `getAdConfig()`, `saveAdConfig()` |
| `NoticeManagement.tsx` | `notices` | 공지사항 관리 | `getAllNoticesAdmin()` |
| `PushNotificationManagement.tsx` | `push-notifications` | 푸시 알림 | - |
| `CreditPolicyManagement.tsx` | `credit-policy` | 크레딧 정책 | `getCreditPolicy()`, `saveCreditPolicy()` |
| `VersionManagement.tsx` | `version` | 버전 관리 | `getVersionPolicy()`, `saveVersionPolicy()` |
| `DataManagement.tsx` | `data` | 데이터 관리 | - |
| `BulkUploadPage.tsx` | `bulk-upload` | CSV 대량 업로드 | `bulkUploadToilets()` |
| `BulkReviewPage.tsx` | `bulk-review` | 대량 리뷰 관리 | - |
| `RegionalStats.tsx` | `stats-regional` | 지역별 통계 | - |
| `ToiletStats.tsx` | `stats-toilets` | 화장실 통계 | - |
| `CreditStatistics.tsx` | `stats-credits` | 크레딧 통계 | - |
| `VisitorStatistics.tsx` | `stats-visitors` | 방문자 통계 | - |
| `UserDetailPage.tsx` | `/admin/users/:id` | 사용자 상세 | `getUserById()` |
| `WithdrawnUsersPage.tsx` | `/admin/users/withdrawn` | 탈퇴 사용자 | `getWithdrawnUsers()` |
| `AutoNotificationManagement.tsx` | `auto-notification` | 자동 알림 설정 | - |
| `BulkFileConversionPage.tsx` | `bulk-convert` | 파일 변환 | - |
| `AdminPage.tsx` | - | Admin 라우터 | - |

#### Guide Pages (2개)

| 파일 | 경로 | 기능 |
|------|------|------|
| `CreditGuide.tsx` | `#/guide/credit` | 크레딧 획득 가이드 |
| `RegistrationGuide.tsx` | `#/guide/registration` | 등록 가이드 |

#### Test Pages (2개)

| 파일 | 경로 | 기능 |
|------|------|------|
| `PhotoTestPage.tsx` | `#/test/photo-reg` | 사진 등록 테스트 |
| `TestSubmitPage.tsx` | - | 테스트용 등록 |

---

## 🎯 Feature Matrix

### HomePage (`#/`)

**주요 기능**:
- ✅ Google Maps 표시
- ✅ 화장실 마커 렌더링
- ✅ 필터 (성별, 평점, 유형)
- ✅ 검색 (주소, 이름)
- ✅ 북마크 관리
- ✅ 현재 위치 추적
- ✅ 클러스터링

**Backend Dependencies**:
```typescript
// 화장실 데이터
const toilets = await db.getToilets(userLocation, radius);

// 북마크
const bookmarks = await db.getBookmarks(userId);
await db.toggleBookmark(userId, toiletId);
```

**Components**:
- `GoogleMapsProvider` - Maps 컨텍스트
- `FilterModal` - 필터 UI
- `BottomSheet` - 리스트 뷰
- `NavigationBar` - 하단 네비게이션

---

### DetailPage (`#/toilet/:id`)

**주요 기능**:
- ✅ 화장실 상세 정보
- ✅ 리뷰 목록 (페이징)
- ✅ 사진 갤러리
- ✅ 잠금 해제 (크레딧/광고)
- ✅ 길찾기 (네이버/카카오/구글)
- ✅ 공유하기
- ✅ 신고하기

**Backend Dependencies**:
```typescript
// 화장실 정보
const toilet = await db.getToiletById(id);

// 리뷰
const reviews = await db.getReviews(toiletId, page);

// 잠금 해제
await db.unlockToilet(userId, toiletId, method);

// 신고
await db.addReport(userId, toiletId, reason);
```

**Components**:
- `DetailHeader` - 상단 정보
- `ReviewSection` - 리뷰 목록
- `PhotoGallery` - 사진 갤러리
- `UnlockModal` - 잠금 해제 모달
- `AdManager` - 광고 관리

---

### MyPage (`#/my`)

**주요 기능**:
- ✅ 프로필 정보
- ✅ 크레딧 잔액
- ✅ 내 리뷰 목록
- ✅ 북마크 관리
- ✅ 등록한 화장실
- ✅ 출석 체크
- ✅ 계정 설정 이동

**Backend Dependencies**:
```typescript
// 사용자 정보
const user = await db.getUserByEmail(email);

// 내 리뷰
const myReviews = await db.getMyReviews(userId);

// 출석 체크
await db.checkDaily(userId);

// 크레딧 이력
const creditHistory = await db.getCreditHistory(userId);
```

**Components**:
- `ProfileHeader` - 프로필 카드
- `CreditDisplay` - 크레딧 표시
- `ReviewList` - 리뷰 목록
- `CheckInButton` - 출석 체크

---

### SubmitPage (`#/submit`, `#/edit/:id`)

**주요 기능**:
- ✅ 지도에서 위치 선택
- ✅ 주소 검색
- ✅ 화장실 정보 입력
- ✅ 사진 업로드 (다중)
- ✅ 크레딧 획득 계산
- ✅ 수정 모드 (editId)

**Backend Dependencies**:
```typescript
// 등록
await db.addToilet(toiletData);

// 수정
const existing = await db.getToiletById(editId);
await db.updateToilet(editId, updates);

// 크레딧 적립
await db.addCredit(userId, 'toilet_add', amount);
```

**Components**:
- `MapPicker` - 위치 선택 맵
- `AddressSearch` - 주소 검색
- `PhotoUploader` - 사진 업로드
- `FormFields` - 입력 폼

---

### NotificationPage (`#/notifications`)

**주요 기능**:
- ✅ 알림 목록 (페이징)
- ✅ 읽음 처리
- ✅ 알림 삭제
- ✅ 타입별 필터 (리뷰, 댓글, 시스템)

**Backend Dependencies**:
```typescript
// 알림 목록
const notifications = await db.getNotifications(userId, page);

// 읽음 처리
await db.markNotificationAsRead(notificationId);

// 삭제
await db.deleteNotification(notificationId);
```

---

### SettingsPage (`#/settings`)

**주요 기능**:
- ✅ 다크 모드 토글
- ✅ 언어 설정
- ✅ 알림 설정
- ✅ 계정 삭제
- ✅ 로그아웃
- ✅ 버전 정보

**Backend Dependencies**:
```typescript
// 계정 삭제
await db.deleteAccount(userId);

// 알림 설정
await db.updateNotificationSettings(userId, settings);
```

---

### Admin Pages

#### AdManagement (`#/admin` → `ads`)

**주요 기능**:
- ✅ 광고 소스 선택 (AdMob/자체 영상)
- ✅ 테스트 모드 토글
- ✅ AdMob ID 설정
- ✅ YouTube 영상 설정 (Android)
- ✅ MP4 영상 설정 (iOS)
- ✅ 커스텀 배너 설정
- ✅ 광고 통계

**Backend Dependencies**:
```typescript
// 설정 로드
const adConfig = await db.getAdConfig();

// 저장
await db.saveAdConfig(newConfig);
await db.clearAdConfigCache();

// 통계
const stats = await db.getAdStats();
```

**관련 문서**: `admin-feature-map/SKILL.md`

---

## 🔌 Backend API Mapping

### Auth & User

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `getUserByEmail()` | HomePage, MyPage, Settings | 사용자 조회 |
| `updateUser()` | MyPage, Settings | 프로필 수정 |
| `deleteAccount()` | Settings | 계정 삭제 |
| `getUsers()` | Admin - UserManagement | 전체 사용자 |
| `getUserById()` | Admin - UserDetailPage | 사용자 상세 |

### Toilet

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `getToilets()` | HomePage | 화장실 목록 (반경) |
| `getToiletById()` | DetailPage | 화장실 상세 |
| `addToilet()` | SubmitPage | 화장실 등록 |
| `updateToilet()` | SubmitPage (edit) | 화장실 수정 |
| `unlockToilet()` | DetailPage | 잠금 해제 |
| `getAdminToilets()` | Admin - ToiletManagement | 관리자용 목록 |

### Review

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `getReviews()` | DetailPage | 리뷰 목록 |
| `addReview()` | DetailPage | 리뷰 작성 |
| `getMyReviews()` | MyPage | 내 리뷰 |
| `deleteReview()` | MyPage, Admin | 리뷰 삭제 |
| `getAdminReviews()` | Admin - ReviewManagement | 관리자용 리뷰 |

### Bookmark

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `getBookmarks()` | HomePage, MyPage | 북마크 목록 |
| `toggleBookmark()` | HomePage, DetailPage | 북마크 추가/제거 |

### Credit

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `addCredit()` | SubmitPage, DetailPage (ad) | 크레딧 적립 |
| `spendCredit()` | DetailPage (unlock) | 크레딧 사용 |
| `getCreditHistory()` | MyPage | 크레딧 이력 |
| `getCreditPolicy()` | Admin - CreditPolicyManagement | 크레딧 정책 |

### Report

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `addReport()` | DetailPage | 신고 등록 |
| `getAdminReports()` | Admin - ReportManagement | 신고 관리 |

### Notification

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `getNotifications()` | NotificationPage | 알림 목록 |
| `markNotificationAsRead()` | NotificationPage | 읽음 처리 |

### Config

| API | 사용 페이지 | 기능 |
|-----|-----------|------|
| `getAdConfig()` | AdManager (frontend), HomePage | 광고 설정 |
| `saveAdConfig()` | Admin - AdManagement | 광고 설정 저장 |
| `getVersionPolicy()` | App.tsx (checkVersion) | 버전 정책 |
| `getCreditPolicy()` | App.tsx, Admin | 크레딧 정책 |

---

## ✅ Development Checklist

### 새 페이지/기능 추가 시

#### 1. Route 정의 (App.tsx)

- [ ] `currentHash === '#/my-new-page'` 조건 추가
- [ ] 컴포넌트 렌더링 로직 추가
- [ ] Navigation Bar 업데이트 (필요 시)
- [ ] 뒤로가기 처리

```typescript
// App.tsx line ~2200
if (currentHash === '#/my-new-page') {
  return <MyNewPage user={user} onBack={() => window.history.back()} />;
}
```

#### 2. 페이지 컴포넌트 생성

- [ ] `pages/MyNewPage.tsx` 파일 생성
- [ ] Props 타입 정의
- [ ] useState/useEffect 초기화
- [ ] 로딩 상태 처리
- [ ] 에러 핸들링

```typescript
// pages/MyNewPage.tsx
interface MyNewPageProps {
  user: User;
  onBack: () => void;
}

export const MyNewPage: React.FC<MyNewPageProps> = ({ user, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  // ...
};
```

#### 3. Backend API 연결

- [ ] `services/db_supabase.ts`에 함수 추가
- [ ] 페이지에서 API 호출
- [ ] 에러 처리
- [ ] 캐싱 (필요 시)

```typescript
// services/db_supabase.ts
async getMyNewData(): Promise<MyData[]> {
  const { data, error } = await supabase
    .from('my_table')
    .select('*');
  
  if (error) throw error;
  return data || [];
}

// pages/MyNewPage.tsx
const loadData = async () => {
  try {
    const result = await db.getMyNewData();
    setData(result);
  } catch (error) {
    console.error(error);
    alert('데이터 로드 실패');
  } finally {
    setLoading(false);
  }
};
```

#### 4. Navigation 업데이트

- [ ] Bottom Navigation Bar 업데이트 (필요 시)
- [ ] Menu에 링크 추가 (필요 시)
- [ ] Deep Link 지원 (필요 시)

```typescript
// App.tsx ~2450
{currentHash === '#/' || currentHash === '#/my-new-page' && (
  <nav className="...">
    {/* nav buttons */}
  </nav>
)}
```

#### 5. 상태 관리 확인

- [ ] URL 해시 변경 시 페이지 리렌더링 확인
- [ ] `useEffect` 의존성 배열 확인
- [ ] 뒤로가기/앞으로가기 동작 확인
- [ ] 새로고침 동작 확인

#### 6. 테스트

- [ ] 페이지 로드 테스트
- [ ] 데이터 표시 확인
- [ ] 에러 케이스 확인
- [ ] 로딩 상태 확인
- [ ] 모바일 반응형 확인
- [ ] 다크 모드 확인

---

## 🚨 Common Pitfalls

### 1. ❌ Route 조건 순서 문제

```typescript
// 잘못됨 - 더 구체적인 라우트가 위에 있어야 함
if (currentHash.startsWith('#/admin')) { ... }
if (currentHash === '#/admin/users/withdrawn') { ... }  // 절대 실행 안됨!

// 올바름
if (currentHash === '#/admin/users/withdrawn') { ... }
if (currentHash.startsWith('#/admin/users/')) { ... }
if (currentHash.startsWith('#/admin')) { ... }
```

### 2. ❌ useEffect 의존성 누락

```typescript
// 잘못됨
useEffect(() => {
  loadData(userId);  // userId가 변해도 재실행 안됨!
}, []);

// 올바름
useEffect(() => {
  if (userId) {
    loadData(userId);
  }
}, [userId]);
```

### 3. ❌ Backend API 에러 처리 누락

```typescript
// 잘못됨
const data = await db.getData();
setData(data);  // 에러 시 앱 크래시!

// 올바름
try {
  const data = await db.getData();
  setData(data);
} catch (error) {
  console.error(error);
  alert('데이터 로드 실패');
}
```

### 4. ❌ Navigation Bar 조건 불일치

```typescript
// 잘못됨 - 페이지는 있는데 네비게이션 바가 안 보임
// App.tsx line 2200
if (currentHash === '#/my-new-page') { return <MyNewPage />; }

// App.tsx line 2450 - 네비게이션 조건에 '#/my-new-page' 누락!
{(currentHash === '#/' || currentHash === '#/my') && (
  <nav>...</nav>
)}

// 올바름
{(currentHash === '#/' || currentHash === '#/my' || currentHash === '#/my-new-page') && (
  <nav>...</nav>
)}
```

### 5. ❌ Hash 변경 후 상태 업데이트 안됨

```typescript
// 잘못됨
window.location.hash = '#/new-page';
// myState는 업데이트 안됨!

// 올바름
useEffect(() => {
  const handleHashChange = () => {
    // 해시 변경 시 로직 실행
  };
  window.addEventListener('hashchange', handleHashChange);
  return () => window.removeEventListener('hashchange', handleHashChange);
}, []);
```

---

## 📚 Quick Reference

### Navigation Patterns

#### 1. 페이지 이동

```typescript
// Hash 변경
window.location.hash = '#/my';

// 뒤로가기
window.history.back();

// 프로그래밍 방식 (파라미터 포함)
window.location.hash = `#/toilet/${toiletId}`;
```

#### 2. 현재 라우트 확인

```typescript
const currentHash = window.location.hash;

if (currentHash === '#/my') { /* ... */ }
if (currentHash.startsWith('#/toilet/')) { /* ... */ }
```

#### 3. Bottom Navigation Active State

```typescript
<button 
  className={`${currentHash === '#/my' ? 'text-primary-500' : 'text-text-muted'}`}
  onClick={() => window.location.hash = '#/my'}
>
  마이페이지
</button>
```

### Component Communication

#### 1. Props Drilling (Parent → Child)

```typescript
// App.tsx
<MyPage user={user} onRefresh={() => setRefreshTrigger(prev => prev + 1)} />

// MyPage.tsx
interface MyPageProps {
  user: User;
  onRefresh: () => void;
}
```

#### 2. Callback (Child → Parent)

```typescript
// Parent
const handleUpdate = (newData) => {
  setData(newData);
};
<ChildComponent onUpdate={handleUpdate} />

// Child
props.onUpdate(updatedData);
```

#### 3. Global State (App.tsx)

App.tsx에서 관리하는 주요 상태:
- `user` - 현재 사용자
- `toilets` - 화장실 목록
- `bookmarks` - 북마크 Set
- `refreshTrigger` - 데이터 새로고침 트리거
- `darkMode` - 다크 모드

---

## 🎯 Summary

**새 페이지 추가 5단계**:

1. **Route 정의** (App.tsx ~line 2200)
2. **페이지 생성** (pages/MyNewPage.tsx)
3. **API 연결** (services/db_supabase.ts)
4. **Navigation 업데이트** (필요 시)
5. **테스트** (로드/에러/반응형/다크모드)

**체크 포인트**:
- ✅ Route 조건 순서 (구체적 → 일반적)
- ✅ useEffect 의존성 배열
- ✅ 에러 핸들링 (try-catch)
- ✅ Navigation Bar 조건 일치
- ✅ Hash 변경 이벤트 리스너

이 문서를 따르면 프론트엔드 페이지를 빠뜨리지 않고 완전하게 구현할 수 있습니다!
