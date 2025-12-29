# 🚻 Share Toilet 1205

공용 화장실 정보 공유 및 관리 플랫폼입니다. 사용자들이 화장실 정보를 등록하고 공유하며, 위치 기반으로 주변 화장실을 찾을 수 있습니다.

## ✨ 주요 기능

- **지도 기반 화장실 검색**: 현재 위치 기반으로 주변 화장실 찾기
- **상세 정보**: 성별, 잠금 여부, 공개/비공개 상태 등
- **화장실 등록**: 새로운 화장실 정보 등록 및 수정
- **관리자 기능**: 
  - 화장실 정보 일괄 업로드 (CSV)
  - 지역별 통계
  - 광고 관리 (YouTube 동영상)
- **크레딧 시스템**: 화장실 등록 및 공개 시 크레딧 보상
- **VIP 사용자**: 크레딧으로 VIP 등급 획득

## 🛠️ 기술 스택

- **Frontend**: React, TypeScript, Vite
- **지도**: Kakao Maps API
- **Geocoding**: Kakao Geocoding API
- **Database**: Neno DB (Netlify)
- **Styling**: Custom CSS

## 🚀 로컬 실행

**Prerequisites:** Node.js

1. **의존성 설치**
   ```bash
   npm install
   ```

2. **환경 변수 설정**
   
   `.env.local` 파일을 생성하고 다음 환경 변수를 설정하세요:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   VITE_KAKAO_API_KEY=your_kakao_api_key
   ```

3. **개발 서버 실행**
   ```bash
   npm run dev
   ```

4. 브라우저에서 `http://localhost:3000` 접속

## 📁 프로젝트 구조

```
Share_toilet_1205/
├── components/       # React 컴포넌트
├── pages/           # 페이지 컴포넌트 (Admin, Detail 등)
├── services/        # API 서비스 (DB, Geocoding)
├── utils/           # 유틸리티 함수
├── public/          # 정적 파일 (마커 이미지 등)
├── config.ts        # 설정 파일
├── constants.ts     # 상수 정의
├── types.ts         # TypeScript 타입 정의
└── App.tsx          # 메인 앱 컴포넌트
```

## 🔑 환경 변수

- `GEMINI_API_KEY`: Gemini API 키
- `VITE_KAKAO_API_KEY`: Kakao Maps 및 Geocoding API 키

## 📝 CSV 업로드 형식

관리자 페이지에서 화장실 정보를 일괄 업로드할 때 사용하는 CSV 형식:

```csv
장소이름,address,내외부구분,남녀공용화장실여부,남성용-대변기수,남성용-소변기수,남성용-장애인용대변기수,남성용-장애인용소변기수,여성용-대변기수,여성용-장애인용대변기수
```

샘플 파일: [sample_toilets.csv](./sample_toilets.csv)

## 🤝 기여

별도의 기여 가이드라인은 없습니다. 이슈 및 풀 리퀘스트를 자유롭게 제출해주세요.

## 📄 라이선스

이 프로젝트는 오픈소스입니다.
