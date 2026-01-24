export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  VIP = 'vip',
  ADMIN = 'admin'
}

export enum UserStatus {
  ACTIVE = 'active',
  WITHDRAWN = 'withdrawn',
  BANNED = 'banned'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNISEX = 'UNISEX'
}

export enum NotificationType {
  FAVORITE_UPDATE = 'favorite_update',           // 즐겨찾기 화장실 업데이트
  CREDIT_AWARDED = 'credit_awarded',             // 크래딧 지급
  TOILET_REPORTED = 'toilet_reported',           // 내 화장실 신고됨
  NEARBY_TOILET = 'nearby_toilet',               // 근처 화장실 등록
  REVIEW_ADDED = 'review_added',                 // 내 화장실에 리뷰 작성됨
  ADMIN_MESSAGE = 'admin_message',               // 관리자 수동 메시지
  LEVEL_CHANGE = 'level_change',                 // 레벨 변동 알림
  SCORE_CHANGE = 'score_change',                 // 점수 변동 알림
  REPORT_RESULT = 'report_result',               // 신고 처리 결과 알림
  MILESTONE_REACHED = 'milestone_reached',       // 화장실 이용자 수 달성
  POINT_GIFT = 'point_gift',                     // 포인트 선물 (관리자)
  LEVEL_UP = 'level_up'                          // 레벨 업
}

export interface User {
  id: string;
  email: string;
  nickname?: string; // User nickname for display
  gender: Gender | null; // Null initially until set
  role: UserRole;
  credits: number;
  lastLogin?: string;
  pushToken?: string;  // Device push notification token
  notificationEnabled?: boolean;
  signupProvider?: 'email' | 'google' | 'kakao' | 'naver' | 'email_test' | 'apple';
  referrerId?: string; // Who invited this user
  appleIdentifier?: string; // Stable Apple User ID (sub) for re-auth without email

  // Activity & Level
  activityScore?: number;
  level?: number;
  levelOverride?: number; // Admin override

  // Withdrawal
  status?: UserStatus;
  withdrawalReason?: string;
  deletedAt?: string;

  // Notices
  nextLoginNotice?: string; // Queue of notices to show on login
  loginNotices?: LoginNotice[]; // Array of full notice objects

  createdAt?: string; // Account creation date

  // Stats (New)
  loginCount?: number;
  adViewCount?: number;
}

export interface LoginNotice {
  id: string; // Unique ID for tracking
  type: 'level_up' | 'level_down' | 'admin_message' | 'referral_success';
  title: string;
  message: string;
  data?: any; // Optional data (e.g. credits amount)
  createdAt: number;
}

export interface Review {
  id: string;
  toiletId: string; // Foreign key to Toilet
  userId: string;
  userName: string;
  rating: number;
  content: string;
  createdAt: string;
  rewarded?: boolean;
  toiletName?: string;
  toiletAddress?: string;
  likeCount?: number; // New
  userLevel?: number; // New
  userEmail?: string; // New: For masking
  toiletGender?: Gender; // New: For filtering
}

export interface Toilet {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: 'public' | 'commercial' | 'subway_station' | 'train_station' | 'bus_terminal' | 'park' | 'gas_station' | 'hospital' | 'culture' | 'user_registered';
  genderType: Gender;
  floor: number;
  hasPassword: boolean;
  password?: string;
  cleanliness: 1 | 2 | 3 | 4 | 5;
  hasBidet: boolean;
  hasPaper: boolean;
  stallCount: number;
  crowdLevel: 'low' | 'medium' | 'high';
  isUnlocked?: boolean;
  distance?: number;
  note?: string;
  createdBy?: string;
  isPrivate?: boolean;
  // Generated fields
  reviewCount?: number;
  ratingAvg?: number;

  // Management fields
  source?: 'admin' | 'user'; // 'admin' | 'user'
  isVerified?: boolean;
  createdAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp

  // Joins
  creatorLevel?: number; // New: For displaying level icon in detail
  creatorEmail?: string; // New: For displaying creator ID/Email (masked if needed)
  creatorName?: string;  // New: For displaying nickname
  creatorRole?: UserRole; // New: For visibility logic (Admin/VIP)
  viewCount?: number;     // New: Track views
}

export interface Report {
  id: string;
  toiletId: string;
  toiletName: string;
  reporterId: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
  reporterEmail?: string;
  reporterNickname?: string;
  toiletDetails?: {
    hasPaper: boolean;
    hasBidet: boolean;
    hasPassword: boolean;
    password?: string;
  };
}

export interface BannedLocation {
  id: string;
  address: string; // The identifier for banning
  reason: string;
  bannedAt: string;
  bannedBy: string; // Admin ID who banned the user
}

export interface BannedUser {
  id: string;
  email: string;
  reason: string;
  bannedAt: string;
  bannedBy: string; // Admin ID who banned the user
}

export interface DashboardStats {
  totalUsers: number;
  totalToilets: number;
  totalReports: number;
  totalReviews: number;
  pendingReports: number;
  todayAdViews: number;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  newUsers: number;
  visitors: number;
  newToilets: number;
  newReviews: number;
  adViewsCompleted: number;
  ad_views_charge?: number;
  ad_views_unlock?: number;
  ad_views_review?: number;
  newReports: number;
  visitors_mobile?: number;
  visitors_tablet?: number;
  visitors_pc?: number;
}

export interface CreditPolicy {
  signup: number;           // 회원가입
  toiletSubmit: number;     // 화장실 등록
  reviewSubmit: number;     // 리뷰 등록
  reportSubmit: number;     // 신고 접수
  passwordUpdate: number;   // 비밀번호 업데이트
  adView: number;          // 광고 보기
  unlockCost: number;      // 화장실 잠금해제 비용
  referralReward: number;  // 친구 추천 보상
  ownerReviewReward: number; // 내 화장실 리뷰 작성 시 보상
  ownerUnlockReward: number; // 내 화장실 잠금해제 시 보상
}

export const DEFAULT_CREDIT_POLICY: CreditPolicy = {
  signup: 10,
  toiletSubmit: 50,
  reviewSubmit: 10,
  reportSubmit: 20,
  passwordUpdate: 3,
  adView: 1,
  unlockCost: 5,
  referralReward: 20,
  ownerReviewReward: 1,
  ownerUnlockReward: 1
};

export interface PushNotification {
  id: string;
  type: NotificationType;
  userId: string;  // Recipient user ID
  title: string;
  message: string;
  data?: {
    toiletId?: string;
    reviewId?: string;
    reportId?: string;
    creditAmount?: number | string;
    [key: string]: any; // Allow other fields for future use
  };
  read: boolean;
  sentAt: string;
  deliveryStatus: 'pending' | 'sent' | 'failed';
}

// AdMob Configuration
export interface AdMobIds {
  banner: string;
  interstitial: string;
  reward: string;
  rewardInterstitial: string;
  appOpen: string;
  native: string;
}

export type CustomBannerType = 'BANNER' | 'NATIVE_LIST' | 'NATIVE_MODAL' | 'NATIVE_DETAIL';

export interface CustomBanner {
  id: string;
  imageUrl: string;
  targetUrl?: string; // Optional link
  createdAt: number;
  ratio?: number; // Aspect ratio (width / height)
  width?: number;
  height?: number;
  type?: CustomBannerType; // Added type
}

export type NoticeType = 'notice' | 'event' | 'emergency';

export interface AppNotice {
  id: string;
  title: string;
  content: string;
  type: NoticeType;
  isActive: boolean;
  priority: number;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdConfig {
  interstitialSource: 'admob' | 'youtube';
  bannerSource: 'admob' | 'custom';
  testMode: boolean;
  bannersEnabled?: boolean;
  customBanners: CustomBanner[];
  adMobIds?: {
    banner: string;
    interstitial: string;
    reward: string;
    rewardInterstitial: string;
    appOpen: string;
    native: string;
  };

  // Platform-specific AdMob IDs (NEW)
  adMobIdsIOS?: {
    appId?: string;
    banner?: string;
    interstitial?: string;
    reward?: string;
    native?: string;
  };

  adMobIdsAndroid?: {
    appId?: string;
    banner?: string;
    interstitial?: string;
    reward?: string;
    native?: string;
  };

  // ===== Platform-Specific Interstitial Ads =====

  // 1.1 Android Settings (YouTube)
  interstitialAndroid?: {
    youtubeUrls: string[];          // YouTube video IDs or URLs
    clickUrls?: string[];            // Click-through URLs (one per video, optional)
    durationUnlock?: number;         // Password unlock duration (seconds)
    durationPoint?: number;          // Credit charge duration (seconds)
    durationNavigation?: number;     // Navigation exit duration (seconds)
  };

  // 1.2 iOS Settings (MP4)
  interstitialIOS?: {
    videoUrls: string[];            // MP4 video URLs (Cloudflare R2 / CDN)
    clickUrls?: string[];           // Click-through URLs (one per video, optional)
    durationUnlock?: number;
    durationPoint?: number;
    durationNavigation?: number;
  };

  // Legacy fields (for migration, will be removed later)
  youtubeUrls?: string[];
  durationUnlock?: number;
  durationPoint?: number;
  durationNavigation?: number;
}

export interface UploadHistory {
  id: string;
  fileName: string;
  uploadedAt: string; // ISO timestamp
  totalCount: number;
  successCount: number;
  addedCount: number; // 신규 생성 건수
  updatedCount: number; // 중복 덮어쓰기 건수
  failCount: number;
  uploadedToiletIds: string[]; // Track which toilets were uploaded
  uploadedBy: string; // User ID or 'admin'
  logs: string[]; // 업로드 진행 로그
}

// --- New Types for Level System ---

export type CreditType =
  | 'signup'
  | 'toilet_add'
  | 'review_add'
  | 'report_reward'
  | 'ad_view'
  | 'unlock_spend' // Keep for spending
  | 'review_delete_penalty'
  | 'admin_adjust'
  | 'score_manual'
  | 'score_change'
  | 'score_manual'
  | 'score_change'
  | 'level_up_reward'
  | 'toilet_unlock'; // Added missing type

export type ReferenceType = 'review' | 'report' | 'toilet' | 'admin' | 'user' | 'score_log' | 'none';

export interface CreditHistory {
  id: string;
  userId: string;
  amount: number;
  type: CreditType;
  referenceType: ReferenceType;
  referenceId?: string;
  description: string;
  createdAt: string;
}

export interface ReviewReaction {
  id: string;
  reviewId: string;
  userId: string;
  type: 'like' | 'dislike';
  createdAt: string;
}

// Version Control Types
export interface VersionInfo {
  latestVersion: string;
  minVersion: string;
  storeUrl: string;
  updateMessage?: string;
}

export interface VersionPolicy {
  android: VersionInfo;
  ios: VersionInfo;
}
