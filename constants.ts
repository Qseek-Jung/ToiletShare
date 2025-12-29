import { User, UserRole, Toilet, Gender } from './types';

export const APP_NAME = "대똥단결";

export const INITIAL_USER: User = {
  id: 'guest',
  email: '',
  gender: null,
  role: UserRole.GUEST,
  credits: 0
};

// Helper to generate random toilets around a center point
export const generateToilets = (centerLat: number, centerLng: number, count: number, addressPrefix: string = "서울 송파구 삼전동"): Toilet[] => {
  const toilets: Toilet[] = [];

  // Data pools for realistic mock data
  const userPlaces = ['스타벅스', '투썸플레이스', '올리브영', '다이소', '롯데리아', '맥도날드', '김밥천국', '파리바게뜨', 'PC방', '당구장'];
  const publicPlaces = ['근린공원', '주민센터', '도서관', '체육관', '복지관'];
  const gasPlaces = ['SK주유소', 'GS칼텍스', 'S-OIL', '현대오일뱅크'];

  const notes = [
    "휴지가 자주 떨어지니 챙겨가세요.",
    "입구 비밀번호가 주기적으로 바뀝니다.",
    "정말 깨끗하고 관리가 잘 되어 있어요.",
    "온수가 안 나옵니다.",
    "장애인 화장실도 같이 있습니다.",
    "상가 이용객만 사용 가능하다고 써있는데 그냥 써도 됨.",
    "", "", ""
  ];

  for (let i = 0; i < count; i++) {
    // Random distribution for location
    const r = 0.008 * Math.sqrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const latOffset = r * Math.cos(theta);
    const lngOffset = r * Math.sin(theta) * 1.4;

    const rand = Math.random();
    let type: Toilet['type'];
    let name: string;
    let createdBy: string | undefined = undefined;

    // Distribution Logic:
    // 50% User Registered (The ones Guest shouldn't see details of)
    // 20% Commercial (Treat as publicish or user reg depending on logic, let's treat as user reg for variety or keep as commercial)
    // 15% Public/Park/Station (Green)
    // 15% Gas Station (Green)

    if (rand < 0.5) {
      // User Registered
      type = 'user_registered';
      name = `${userPlaces[Math.floor(Math.random() * userPlaces.length)]} 화장실`;
      createdBy = 'user_' + Math.floor(Math.random() * 9999);
    } else if (rand < 0.65) {
      // Public / Park / Station
      if (Math.random() > 0.5) {
        type = 'public';
        name = `${publicPlaces[Math.floor(Math.random() * publicPlaces.length)]} 화장실`;
      } else {
        type = 'park';
        name = `공원 화장실 ${i + 1}호`;
      }
      createdBy = 'admin';
    } else if (rand < 0.8) {
      // Gas Station
      type = 'gas_station';
      name = `${gasPlaces[Math.floor(Math.random() * gasPlaces.length)]} 주유소`;
      createdBy = 'admin';
    } else {
      // Commercial (Let's make some of these user registered too for chaos, or keep as commercial type)
      // To stick to the prompt's request for testing:
      type = 'commercial';
      name = `상가건물 ${i + 1}호`;
      createdBy = 'admin'; // Treat commercial as generic public for now in this dataset
    }

    const hasPassword = Math.random() > 0.3;
    const note = notes[Math.floor(Math.random() * notes.length)];

    toilets.push({
      id: `t_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`,
      name: name,
      address: `${addressPrefix} ${Math.floor(Math.random() * 150) + 1}번지`,
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      type: type,
      genderType: Math.random() > 0.7 ? (Math.random() > 0.5 ? Gender.MALE : Gender.FEMALE) : Gender.UNISEX,
      floor: Math.floor(Math.random() * 3) + 1,
      hasPassword: hasPassword,
      password: hasPassword ? String(Math.floor(Math.random() * 8999) + 1000) : undefined,
      cleanliness: Math.floor(Math.random() * 5) + 1 as any,
      hasBidet: Math.random() > 0.5,
      hasPaper: Math.random() > 0.3,
      stallCount: Math.floor(Math.random() * 4) + 1,
      crowdLevel: Math.random() > 0.6 ? 'high' : 'low',
      note: note || undefined,
      createdBy: createdBy,
      isPrivate: false
    });
  }

  // Hardcoded Station (Public) - Only add if it's the default location to avoid weirdness, or just make it generic
  if (addressPrefix.includes("삼전동")) {
    toilets[0] = {
      ...toilets[0],
      id: 't_station_001',
      name: '삼전역 공영 화장실',
      address: '삼전역 지하 1층',
      type: 'station',
      lat: centerLat + 0.0002,
      lng: centerLng + 0.0002,
      hasPassword: false,
      cleanliness: 4,
      genderType: Gender.UNISEX,
      floor: -1,
      hasBidet: true,
      hasPaper: true,
      stallCount: 10,
      note: "지하철 운행시간 동안만 개방합니다.",
      createdBy: 'admin',
      isPrivate: false
    };
  }

  return toilets;
};

// Generate test users for admin testing
export const generateTestUsers = (): User[] => {
  const testUsers: User[] = [];
  const names = ['김철수', '이영희', '박민수', '최지은', '정태우', '강미래', '임준호', '송지혜', '윤서연', '조현우'];
  const domains = ['gmail.com', 'naver.com', 'kakao.com', 'daum.net'];

  names.forEach((name, index) => {
    const romanized = ['kimcs', 'leeyh', 'parkms', 'choije', 'jungtw', 'kangmr', 'limjh', 'songjh', 'yoonsy', 'chohw'][index];
    const domain = domains[index % domains.length];
    const gender = index % 2 === 0 ? Gender.MALE : Gender.FEMALE;

    testUsers.push({
      id: `test_user_${Date.now()}_${index}`,
      email: `${romanized}@${domain}`,
      gender: gender,
      role: UserRole.USER,
      credits: Math.floor(Math.random() * 100)
    });
  });

  return testUsers;
};