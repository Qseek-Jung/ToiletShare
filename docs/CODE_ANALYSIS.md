# 대똥단결 (ToiletShare) 코드 분석

> 2026-10-01 기준 · repo `Qseek-Jung/ToiletShare` main (`3c2cedc`, v1.1.0 / Android versionCode 60)

## 1. 스택 개요
- **프론트**: React 19 + Vite + TypeScript + Tailwind 3. 진입점은 `index.tsx`, 본체는 `App.tsx`(2905줄).
- **네이티브**: Capacitor 6 (iOS CocoaPods, Android). 플랫폼별 차이는 `platform/` 어댑터에 있다.
- **백엔드**: Supabase(Postgres+PostGIS)를 클라이언트가 직접 호출한다. 별도 API 서버는 없다.
  - 유일한 서버 코드: Edge Function `supabase/functions/push-notification` (FCM 발송)
- **배포**: Vercel. `vercel.json`이 없어 Vite 자동 감지에 의존한다. iOS는 GitHub Actions(`.github/workflows/ios_build.yml`)로 빌드한다. Android CI는 없다.
- **잔재(미사용)**: `netlify.toml`, `wrangler.toml`(Cloudflare D1), `services/db.ts`·`db.backup.ts`(localStorage mock), `App_old.tsx`, `IOS_Ready/`(구 사본 377파일)

## 2. 프론트엔드 구조
- **라우팅**: react-router 없이 해시 기반으로 직접 구현했다.
  - 상태: `currentHash` (`App.tsx:562`)
  - 분기: `CurrentPage` IIFE의 if 체인 (`App.tsx:2087-2200`)
  - 관리자 화면 내부는 `AdminPage`의 `activeSection`/`subSection` 로컬 상태로 전환한다.

| 해시 | 페이지 |
|---|---|
| `#/`, `#/toilet/:id` | HomePage(지도) + DetailPage 오버레이 |
| `#/my` | MyPage |
| `#/submit`, `#/edit/:id` | SubmitPage |
| `#/notifications`, `#/notice/:id` | NotificationPage, NoticePage |
| `#/guide*`, `#/settings`, `#/app-info`, `#/terms`, `#/privacy` | 정적·설정 페이지 |
| `#/admin*`, `#/admin/users/:id` | AdminPage, UserDetailPage |
| `?ref=` | DownloadPage (레퍼럴) |

- **상태 관리**: 라이브러리 없이 App.tsx에 `useState` 약 40개를 두고 props로 내려준다. Context는 `GoogleMapsProvider` 하나뿐이다.
- **지도·위치**: Google Maps JS API(동적 로드)와 `@capacitor/geolocation`을 쓴다. 지오코딩은 Kakao·Google, 기본 위치는 서울시청이다.
- **i18n**: i18next로 ko/en/ja/zh를 지원한다. 관리자 페이지는 한글이 하드코딩되어 있고, 일부 사용자 페이지도 번역이 빠져 있다.
- **사용자 기능**: 주변 화장실 지도·검색, 도어락 비밀번호 열람(크레딧 또는 광고 시청으로 해제), 리뷰·신고·북마크·공유, 화장실 등록(EXIF·OCR·Gemini), 크레딧·레벨·레퍼럴, 푸시·공지, 강제 업데이트 모달, 회원 탈퇴
- **관리자 기능**: 대시보드, 회원·탈퇴·차단, 화장실 관리·지역통계·대량등록(CSV 변환기), 신고·리뷰, 광고 정책(AdManagement), 푸시·자동알림·공지, 크레딧 정책·통계, 버전, 데이터 관리

### 새 기능 추가 위치
1. 페이지 파일을 `pages/XxxPage.tsx`에 만든다.
2. `App.tsx`의 `CurrentPage`에 해시 분기를 추가한다.
3. 하단 네비 노출이 필요하면 `App.tsx:~2425`를 수정한다.
4. DB 접근은 `services/db_supabase.ts`(`dbSupabase`)에 메서드를 추가하고, 타입은 `types.ts`에 정의한다.
5. 문자열은 `locales/{ko,en,ja,zh}.json` 네 파일 모두에 추가한다.
6. 관리자 기능은 `pages/admin/`에 파일을 만들고 `AdminPage.tsx` 분기와 `components/admin/AdminMenu.tsx`에 등록한다.
7. 기존 개발 문서: `.agent/skills/*/SKILL.md` (admin-feature-map, frontend-sitemap, admob, ios/android build guide)

## 3. 데이터 레이어
- **주요 테이블**: users, toilets(`location geography` + GIST, `password` 평문), reviews, review_reactions, reports, bookmarks, notifications, banned_users/locations, credit_history/credit_logs, system_settings/app_config, app_notices, toilets_bulk, daily_stats, korea_geography
- **RPC**: get_toilets_nearby, check_is_on_land, increment_*, get_regional_stats, get_toilet_registration_stats, credit 관련 rpc, check_is_admin
- **마이그레이션**: 루트에 SQL 약 70개가 순서 관리 없이 흩어져 있다. `supabase_schema.sql`은 `DROP TABLE ... CASCADE`로 시작하므로 **실행 금지**.
- **인증**: Supabase Auth를 쓰지 않는다. Kakao·Naver OAuth를 클라이언트에서 직접 처리하고, Google·Apple은 Capacitor 플러그인으로 로그인한 뒤 `users`에 upsert하고 `localStorage['currentUser']`에 저장한다. 결과적으로 DB 입장에서 사용자는 전부 anon이다.

## 4. ⚠️ 보안 이슈 (우선순위순)
1. **공개 저장소에 서명 키·인증서가 커밋되어 있다.**
   - 대상: `cert/*.p8`, `cert/*.p12`, `cert/*.pem`, `cert/mykey.key`, `cert/*.mobileprovision`, `android/app/toiletshare-release.keystore`, `android/app/keystore.properties`, `tmp.b64`
   - 조치: 키 재발급(rotate)과 git 히스토리 정리가 필요하다.
2. **웹 관리자 로그인 ID·PW가 `App.tsx` 소스에 평문으로 하드코딩되어 있다** (`App.tsx:~1868`). 번들에도 그대로 포함된다.
3. **권한 검증이 클라이언트에만 있다.**
   - 관리자 함수(역할 변경, 차단, 전체 삭제 등)가 서버 검증 없이 실행된다.
   - 크레딧 증감과 잠금 해제 비용 차감을 클라이언트가 계산한다.
   - 소셜 토큰을 서버에서 검증하지 않아 계정 사칭이 가능하다.
4. **RLS 완화 SQL이 다수 존재한다** (mig 9·10·39, `fix_rls*.sql`, `fix_rls_v3_anon.sql`). 라이브 DB에 어떤 정책이 적용되어 있는지 확인이 필요하다.
5. **클라이언트에 시크릿이 노출되어 있다.**
   - Naver client secret: `android/.../strings.xml`, `services/naverOAuth.ts`
   - Kakao REST 키: `services/kakaoOAuth.ts`
   - Gemini 키: `VITE_GEMINI_API_KEY`
6. **Edge Function `push-notification`에 호출자 인증이 없고 CORS가 `*`이다.**

## 5. 레포 위생 · 설정 불일치
- **루트 쓰레기 파일**: `Downloading`, `Fetching`, `Homebrew` 등 0바이트 파일, `tmp.b64`, `key_output.txt`, `ios_build_log.txt`, `debug_*.js`, `*.bat`/`*.ps1`, `processed_files/`, `.wrangler/` sqlite
- **앱 ID 불일치**: Capacitor appId(`capacitor.config.ts`)와 Android applicationId(`com.toiletshare.app`)가 서로 다르다.
- **`.env.example`이 실제 사용 변수와 맞지 않는다.** 코드가 실제로 쓰는 변수:
  - 지도 키: `VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST`, `VITE_GOOGLE_MAPS_API_KEY_WEBVIEW`
  - 로그인: `VITE_GOOGLE_CLIENT_ID`, `VITE_NAVER_CLIENT_SECRET`, `VITE_KAKAO_JAVASCRIPT_KEY`
  - 기타: `VITE_GEMINI_API_KEY`, `VITE_EMAILJS_*`, `VITE_ADSENSE_PUB_ID`
- **SPA 리다이렉트**: `public/_redirects`는 Netlify 형식이라 Vercel에서는 동작하지 않는다. 해시 라우팅이라 당장 영향은 작다.
- **README가 낡았다** (Netlify, Kakao Maps 기준).
- **의존성 중복**: `@google/genai`와 `@google/generative-ai`, `react-quill`과 `react-quill-new`, `xmldom`과 `@xmldom/xmldom`
- **디버그 코드가 프로덕션에 남아 있다**: `iOSDebugger` 상시 렌더, 테스트 로그인 함수, `console.log` 79개, `index.html`의 디버그 콘솔

## 6. 로컬 실행
- Node 20을 쓴다.
- `npm ci`를 실행하면 postinstall로 patch-package가 돈다 (`patches/@capacitor+ios+6.2.1.patch`).
- 루트 `.env`(vite.config가 직접 파싱)에 최소 다음 값이 필요하다:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GOOGLE_MAPS_API_KEY_LOCAL_TEST`
- `npm run dev`로 실행하면 http://localhost:3000 에서 열린다. 광고와 푸시는 웹에서 건너뛴다.
- 모바일은 `npm run build:ios` 또는 `npm run build:android` 실행 후 Xcode / Android Studio에서 연다.
- `origin/mobile-app-dev` 브랜치는 이미 main에 병합되어 폐기해도 된다.
