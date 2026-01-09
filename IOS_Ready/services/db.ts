import { Toilet, User, Review, Report, BannedLocation, BannedUser, UserRole, Gender, DashboardStats, AdConfig, DailyStats, CreditPolicy, DEFAULT_CREDIT_POLICY, PushNotification, NotificationType, UploadHistory } from '../types';
import { INITIAL_USER, generateToilets } from '../constants';

// Keys for LocalStorage - All synced to v2 to ensure data consistency
const KEYS = {
  TOILETS: 'db_toilets_v2',
  REVIEWS: 'db_reviews_v2',
  REPORTS: 'db_reports_v2',
  BANNED: 'db_banned_v2',
  BANNED_USERS: 'db_banned_users_v2',
  USERS: 'db_users_v2',
  AD_VIEWS: 'db_ad_views_v2',
  AD_CONFIG: 'db_ad_config_v2',
  DAILY_STATS: 'db_daily_stats_v2',
  CREDIT_POLICY: 'db_credit_policy_v2',
  NOTIFICATIONS: 'db_notifications_v2',
  UPLOAD_HISTORY: 'db_upload_history_v2'
};

// Simulation of a Backend/Database Service (Firebase Style)
class DatabaseService {
  private toilets: Toilet[] = [];
  private reviews: Review[] = [];
  private reports: Report[] = [];
  private banned: BannedLocation[] = [];
  private bannedUsers: BannedUser[] = [];
  private users: User[] = [];
  private adViews: number = 0;
  private dailyStats: Map<string, DailyStats> = new Map();
  private notifications: PushNotification[] = [];
  private uploadHistories: UploadHistory[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Load from LocalStorage or Initialize with Mock Data
    const storedToilets = localStorage.getItem(KEYS.TOILETS);
    if (storedToilets) {
      const parsedToilets: Toilet[] = JSON.parse(storedToilets);
      // Deduplicate IDs
      const uniqueMap = new Map<string, Toilet>();
      let hasDuplicates = false;

      parsedToilets.forEach(t => {
        if (uniqueMap.has(t.id)) {
          // ID collision
          hasDuplicates = true;
          const existing = uniqueMap.get(t.id)!;
          // If address is different, it's a different toilet -> give new ID
          if (existing.address !== t.address) {
            const newId = `t_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            uniqueMap.set(newId, { ...t, id: newId });
          }
          // If address is same, it's likely a duplicate record -> ignore (dedupe)
        } else {
          uniqueMap.set(t.id, t);
        }
      });

      this.toilets = Array.from(uniqueMap.values());

      if (hasDuplicates) {
        console.log('Fixed duplicate IDs in toilet data');
        this.save(KEYS.TOILETS, this.toilets);
      }
    } else {
      // Init with mock data - 50 toilets around Samjeon-dong
      this.toilets = generateToilets(37.5048, 127.0884, 50);
      this.save(KEYS.TOILETS, this.toilets);
    }

    const storedReviews = localStorage.getItem(KEYS.REVIEWS);
    if (storedReviews) this.reviews = JSON.parse(storedReviews);

    const storedReports = localStorage.getItem(KEYS.REPORTS);
    if (storedReports) this.reports = JSON.parse(storedReports);

    const storedBanned = localStorage.getItem(KEYS.BANNED);
    if (storedBanned) this.banned = JSON.parse(storedBanned);

    const storedBannedUsers = localStorage.getItem(KEYS.BANNED_USERS);
    if (storedBannedUsers) this.bannedUsers = JSON.parse(storedBannedUsers);

    const storedUsers = localStorage.getItem(KEYS.USERS);
    if (storedUsers) this.users = JSON.parse(storedUsers);

    // Add test users if there are fewer than 15 users (ensures we have test data)
    // This will add 10 test users if there are less than 15 total users
    // Add test users if there are fewer than 15 users (ensures we have test data)
    // This will add 10 test users if there are less than 15 total users
    if (this.users.length < 15) {
      // console.log(`Current users: ${this.users.length}, adding test users...`); // Hidden for production
      const testUsers = this.generateTestUsers();
      let added = 0;
      testUsers.forEach(user => {
        if (!this.users.find(u => u.email === user.email)) {
          this.users.push(user);
          added++;
        }
      });
      if (added > 0) {
        this.save(KEYS.USERS, this.users);
        // console.log(`✨ Added ${added} test users for admin testing. Total users: ${this.users.length}`); // Hidden for production
      }
    }

    const storedAds = localStorage.getItem(KEYS.AD_VIEWS);
    if (storedAds) this.adViews = parseInt(storedAds);

    const storedDailyStats = localStorage.getItem(KEYS.DAILY_STATS);
    if (storedDailyStats) {
      const statsArray: DailyStats[] = JSON.parse(storedDailyStats);
      this.dailyStats = new Map(statsArray.map(s => [s.date, s]));
    }

    const storedNotifications = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (storedNotifications) {
      this.notifications = JSON.parse(storedNotifications);
    }

    const storedUploadHistories = localStorage.getItem(KEYS.UPLOAD_HISTORY);
    if (storedUploadHistories) {
      this.uploadHistories = JSON.parse(storedUploadHistories);
    }

    // Check if sample data for Bundang/Yeoncheon exists, if not generate it (User Request)
    const hasBundang = this.toilets.some(t => t.address.includes('분당구'));
    const hasYeoncheon = this.toilets.some(t => t.address.includes('연천읍'));

    if (!hasBundang || !hasYeoncheon) {
      console.log('Sample data for Bundang/Yeoncheon missing. Generating...');
      this.generateSampleData();
    }

    // Check if Seoul data exists (User Request for 1000 items)
    // If total toilets are less than 500, we probably haven't generated the Seoul dataset
    if (this.toilets.length < 500) {
      console.log('Seoul sample data missing (Total < 500). Generating 1000 items...');
      this.generateSeoulData();
    }
  }

  private save(key: string, data: any) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- Toilet Methods ---

  getToilets(): Toilet[] {
    // Join reviews to calculate average rating on the fly
    return this.toilets.map(t => {
      const toiletReviews = this.reviews.filter(r => r.toiletId === t.id);
      const avg = toiletReviews.length > 0
        ? toiletReviews.reduce((acc, cur) => acc + cur.rating, 0) / toiletReviews.length
        : 0;
      return { ...t, reviewCount: toiletReviews.length, ratingAvg: avg };
    });
  }

  addToilet(toilet: Toilet): { success: boolean, message?: string } {
    // 1. Check Banned List (Address-based blocking)
    const isBanned = this.banned.some(b =>
      toilet.address.replace(/\s/g, '').includes(b.address.replace(/\s/g, '')) ||
      b.address.replace(/\s/g, '').includes(toilet.address.replace(/\s/g, ''))
    );

    if (isBanned) {
      return { success: false, message: "건물주의 요청 또는 신고 누적으로 인해 해당 건물에는 화장실을 등록할 수 없습니다." };
    }

    this.toilets = [toilet, ...this.toilets];
    this.save(KEYS.TOILETS, this.toilets);
    // Track new toilet
    this.incrementTodayStats('newToilets');

    // 🔔 Trigger: Notify nearby users (1km radius)
    try {
      const nearbyUsers = this.getUsersNearLocation(toilet.lat, toilet.lng, 1);
      nearbyUsers.forEach(user => {
        const notif = this.createNotification(
          NotificationType.NEARBY_TOILET,
          user.id,
          '근처에 새로운 화장실 등록!',
          `'${toilet.name}' 화장실이 근처에 등록되었습니다.`,
          { toiletId: toilet.id }
        );
        this.sendPushNotification(notif);
      });
    } catch (error) {
      console.error('Failed to send nearby toilet notification:', error);
    }

    return { success: true };
  }

  // Bulk add toilets (for CSV upload)
  bulkAddToilets(newToilets: Toilet[]) {
    let addedCount = 0;
    let updatedCount = 0;

    newToilets.forEach(newToilet => {
      // Check for duplicates by address OR coordinates (within ~10m radius)
      const existingIndex = this.toilets.findIndex(t => {
        // Match by address (exact or very similar)
        const addressMatch = t.address.replace(/\s/g, '') === newToilet.address.replace(/\s/g, '');

        // Match by coordinates (within ~10m, approximately 0.0001 degrees)
        const coordMatch = newToilet.lat !== 0 && newToilet.lng !== 0 &&
          Math.abs(t.lat - newToilet.lat) < 0.0001 &&
          Math.abs(t.lng - newToilet.lng) < 0.0001;

        return addressMatch || coordMatch;
      });

      if (existingIndex >= 0) {
        // Update existing toilet while preserving reviews
        const existingToilet = this.toilets[existingIndex];
        this.toilets[existingIndex] = {
          ...newToilet,
          id: existingToilet.id, // Keep original ID to preserve reviews
          createdBy: newToilet.createdBy || existingToilet.createdBy,
          // Preserve review-related fields
          reviewCount: existingToilet.reviewCount,
          ratingAvg: existingToilet.ratingAvg
        };
        updatedCount++;
      } else {
        // Add new toilet
        this.toilets.push(newToilet);
        addedCount++;
      }
    });

    this.save(KEYS.TOILETS, this.toilets);

    // Update stats
    const today = this.getTodayString();
    const stats = this.getDailyStats(today);
    this.updateDailyStats(today, { newToilets: stats.newToilets + addedCount });

    return { added: addedCount, updated: updatedCount };
  }

  /**
   * Generate Sample Data for Bundang and Yeoncheon
   */
  generateSampleData() {
    // Bundang-gu, Seongnam-si
    const bundangToilets = generateToilets(37.3827, 127.1189, 50, "경기도 성남시 분당구");

    // Yeoncheon-eup, Yeoncheon-gun
    const yeoncheonToilets = generateToilets(38.0964, 127.0749, 50, "경기도 연천군 연천읍");

    const newToilets = [...bundangToilets, ...yeoncheonToilets];

    const result = this.bulkAddToilets(newToilets);
    return { success: true, message: `분당구 50개, 연천읍 50개 화장실 데이터가 생성되었습니다. (추가: ${result.added}, 업데이트: ${result.updated})` };
  }

  /**
   * Generate 1000 Sample Toilets across Seoul (25 Districts * 40)
   */
  generateSeoulData() {
    const districts = [
      { name: "강남구", lat: 37.5172, lng: 127.0473 },
      { name: "강동구", lat: 37.5301, lng: 127.1238 },
      { name: "강북구", lat: 37.6396, lng: 127.0257 },
      { name: "강서구", lat: 37.5509, lng: 126.8497 },
      { name: "관악구", lat: 37.4784, lng: 126.9516 },
      { name: "광진구", lat: 37.5385, lng: 127.0824 },
      { name: "구로구", lat: 37.4954, lng: 126.8874 },
      { name: "금천구", lat: 37.4568, lng: 126.8954 },
      { name: "노원구", lat: 37.6542, lng: 127.0568 },
      { name: "도봉구", lat: 37.6688, lng: 127.0471 },
      { name: "동대문구", lat: 37.5744, lng: 127.0400 },
      { name: "동작구", lat: 37.5124, lng: 126.9393 },
      { name: "마포구", lat: 37.5663, lng: 126.9016 },
      { name: "서대문구", lat: 37.5791, lng: 126.9368 },
      { name: "서초구", lat: 37.4837, lng: 127.0324 },
      { name: "성동구", lat: 37.5633, lng: 127.0371 },
      { name: "성북구", lat: 37.5891, lng: 127.0182 },
      { name: "송파구", lat: 37.5145, lng: 127.1066 },
      { name: "양천구", lat: 37.5169, lng: 126.8660 },
      { name: "영등포구", lat: 37.5264, lng: 126.8962 },
      { name: "용산구", lat: 37.5326, lng: 126.9900 },
      { name: "은평구", lat: 37.6027, lng: 126.9291 },
      { name: "종로구", lat: 37.5730, lng: 126.9794 },
      { name: "중구", lat: 37.5641, lng: 126.9979 },
      { name: "중랑구", lat: 37.6066, lng: 127.0927 }
    ];

    let allToilets: Toilet[] = [];

    districts.forEach(d => {
      const districtToilets = generateToilets(d.lat, d.lng, 40, `서울시 ${d.name}`);
      allToilets = [...allToilets, ...districtToilets];
    });

    const result = this.bulkAddToilets(allToilets);
    return { success: true, message: `서울시 25개 구에 총 1000개의 화장실 데이터가 생성되었습니다. (추가: ${result.added}, 업데이트: ${result.updated})` };
  }

  updateToilet(toilet: Toilet): { success: boolean, message?: string } {
    const index = this.toilets.findIndex(t => t.id === toilet.id);
    if (index === -1) return { success: false, message: "화장실을 찾을 수 없습니다." };

    const oldToilet = this.toilets[index];
    this.toilets[index] = toilet;
    this.save(KEYS.TOILETS, this.toilets);

    // 🔔 Trigger: Notify users who favorited this toilet (if significant changes)
    // For now, we assume all users might have it favorited and send notifications
    // In production, this would check actual user favorites
    try {
      const hasSignificantChange =
        oldToilet.hasPaper !== toilet.hasPaper ||
        oldToilet.hasBidet !== toilet.hasBidet ||
        oldToilet.hasPassword !== toilet.hasPassword ||
        oldToilet.password !== toilet.password;

      if (hasSignificantChange) {
        // Notify random subset of users (simulating favorites)
        const usersToNotify = this.users.filter(u =>
          u.role !== UserRole.GUEST && u.notificationEnabled && Math.random() > 0.9
        );

        usersToNotify.forEach(user => {
          const notif = this.createNotification(
            NotificationType.FAVORITE_UPDATE,
            user.id,
            '즐겨찾기 화장실 업데이트',
            `'${toilet.name}' 정보가 업데이트되었습니다.`,
            { toiletId: toilet.id }
          );
          this.sendPushNotification(notif);
        });
      }
    } catch (error) {
      console.error('Failed to send favorite update notification:', error);
    }

    return { success: true };
  }

  deleteToilet(toiletId: string) {
    this.toilets = this.toilets.filter(t => t.id !== toiletId);
    this.save(KEYS.TOILETS, this.toilets);
    console.log(`Deleted toilet ${toiletId}. Remaining: ${this.toilets.length}`);
    // Cleanup reports related to this toilet
    this.reports = this.reports.filter(r => r.toiletId !== toiletId);
    this.save(KEYS.REPORTS, this.reports);
  }

  // --- Review Methods ---

  getReviews(toiletId?: string): Review[] {
    if (toiletId) {
      return this.reviews.filter(r => r.toiletId === toiletId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return this.reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getUserReviews(userId: string): Review[] {
    return this.reviews
      .filter(r => r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addReview(review: Review) {
    this.reviews = [review, ...this.reviews];
    this.save(KEYS.REVIEWS, this.reviews);
    // Track new review
    this.incrementTodayStats('newReviews');
    // Award credits based on policy
    const policy = this.getCreditPolicy();
    this.updateUserCredits(review.userId, policy.reviewSubmit);

    // 🔔 Trigger: Notify toilet owner
    const toilet = this.toilets.find(t => t.id === review.toiletId);
    if (toilet && toilet.createdBy) {
      const owner = this.users.find(u => u.id === toilet.createdBy);
      // Don't notify if owner is reviewing their own toilet
      if (owner && owner.notificationEnabled && owner.id !== review.userId) {
        try {
          const stars = '⭐'.repeat(review.rating);
          const notif = this.createNotification(
            NotificationType.REVIEW_ADDED,
            owner.id,
            '새로운 리뷰가 작성되었습니다',
            `'${toilet.name}'에 ${stars} 리뷰가 달렸습니다.`,
            { toiletId: toilet.id, reviewId: review.id }
          );
          this.sendPushNotification(notif);
        } catch (error) {
          console.error('Failed to send review notification:', error);
        }
      }
    }
  }

  updateReview(review: Review) {
    const index = this.reviews.findIndex(r => r.id === review.id);
    if (index !== -1) {
      this.reviews[index] = review;
      this.save(KEYS.REVIEWS, this.reviews);
    }
  }

  deleteReview(reviewId: string) {
    this.reviews = this.reviews.filter(r => r.id !== reviewId);
    this.save(KEYS.REVIEWS, this.reviews);
  }

  // Admin delete review with credit penalty
  adminDeleteReview(reviewId: string) {
    const review = this.reviews.find(r => r.id === reviewId);
    if (!review) return;

    // Deduct credits from review author (minimum 0)
    const policy = this.getCreditPolicy();
    const user = this.users.find(u => u.id === review.userId);
    if (user) {
      user.credits = Math.max(0, user.credits - policy.reviewSubmit);
      this.save(KEYS.USERS, this.users);
    }

    // Delete the review
    this.deleteReview(reviewId);
  }

  // --- Report Methods ---

  getReports(): Report[] {
    return this.reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  addReport(report: Report) {
    this.reports = [report, ...this.reports];
    this.save(KEYS.REPORTS, this.reports);
    // Track new report
    this.incrementTodayStats('newReports');
    // Award credits based on policy
    const policy = this.getCreditPolicy();
    this.updateUserCredits(report.reporterId, policy.reportSubmit);

    // 🔔 Trigger: Notify toilet owner
    const toilet = this.toilets.find(t => t.id === report.toiletId);
    if (toilet && toilet.createdBy) {
      const owner = this.users.find(u => u.id === toilet.createdBy);
      if (owner && owner.notificationEnabled) {
        try {
          const notif = this.createNotification(
            NotificationType.TOILET_REPORTED,
            owner.id,
            '화장실이 신고되었습니다',
            `'${toilet.name}' 화장실이 신고되었습니다. 사유: ${report.reason}`,
            { toiletId: toilet.id, reportId: report.id }
          );
          this.sendPushNotification(notif);
        } catch (error) {
          console.error('Failed to send report notification:', error);
        }
      }
    }
  }

  dismissReport(reportId: string) {
    this.reports = this.reports.filter(r => r.id !== reportId);
    this.save(KEYS.REPORTS, this.reports);
  }

  // --- Admin/Ban Methods ---

  banToilet(toiletId: string, reason: string, adminId: string) {
    const target = this.toilets.find(t => t.id === toiletId);
    if (!target) return;

    // Add to banned list
    const banRecord: BannedLocation = {
      id: 'ban_' + Date.now(),
      address: target.address,
      reason: reason,
      bannedAt: new Date().toISOString(),
      bannedBy: adminId
    };
    this.banned.push(banRecord);
    this.save(KEYS.BANNED, this.banned);

    // Delete the toilet
    this.deleteToilet(toiletId);
  }

  // --- User Methods ---

  saveUser(user: User) {
    // Check if email is permanently banned
    const isBanned = this.bannedUsers.some(bu => bu.email === user.email);
    if (isBanned) {
      throw new Error('이 이메일은 영구 차단되어 가입이 불가능합니다.');
    }

    const existingIndex = this.users.findIndex(u => u.email === user.email);
    const userToSave = { ...user, lastLogin: new Date().toISOString() };

    // 🔔 Trigger: Detect admin credit award (positive credit change from admin)
    let creditChange = 0;
    if (existingIndex >= 0) {
      const oldCredits = this.users[existingIndex].credits;
      creditChange = userToSave.credits - oldCredits;

      this.users[existingIndex] = userToSave;

      // If credits increased significantly (>= 5), likely admin award
      if (creditChange >= 5 && userToSave.notificationEnabled) {
        try {
          const notif = this.createNotification(
            NotificationType.CREDIT_AWARDED,
            userToSave.id,
            '축하합니다! 크래딧이 지급되었습니다',
            `${creditChange} 크래딧이 지급되었으니 즐똥하세요! 💰`,
            { creditAmount: creditChange }
          );
          this.sendPushNotification(notif);
        } catch (error) {
          console.error('Failed to send credit notification:', error);
        }
      }
    } else {
      this.users.push(userToSave);
      // Track new user signup
      this.incrementTodayStats('newUsers');
    }
    this.save(KEYS.USERS, this.users);
    // Track visitor
    this.incrementTodayStats('visitors');
  }

  updateUserCredits(userId: string, amount: number) {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.users[userIndex].credits += amount;
      this.save(KEYS.USERS, this.users);

      // Update current user in session if it matches
      // Note: This is a bit tricky since we don't have direct access to session state here,
      // but the app re-fetches user data or we can rely on the updated DB state.
      // Ideally, the frontend should refresh user data after these actions.
    }
  }

  getUsers(): User[] {
    return this.users;
  }

  // Delete user (normal delete - allows re-registration)
  deleteUser(userId: string) {
    this.users = this.users.filter(u => u.id !== userId);
    this.save(KEYS.USERS, this.users);

    // Also delete user's reviews and reports
    this.reviews = this.reviews.filter(r => r.userId !== userId);
    this.save(KEYS.REVIEWS, this.reviews);

    this.reports = this.reports.filter(r => r.reporterId !== userId);
    this.save(KEYS.REPORTS, this.reports);
  }

  // Permanently ban user (prevents re-registration)
  banUserPermanently(userId: string, reason: string, adminId: string) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    // Add to banned users list
    const bannedUser: BannedUser = {
      id: 'bu_' + Date.now(),
      email: user.email,
      reason: reason,
      bannedAt: new Date().toISOString(),
      bannedBy: adminId
    };
    this.bannedUsers.push(bannedUser);
    this.save(KEYS.BANNED_USERS, this.bannedUsers);

    // Delete user from users list
    this.deleteUser(userId);
  }

  // Get all permanently banned users
  getBannedUsers(): BannedUser[] {
    return this.bannedUsers.sort((a, b) =>
      new Date(b.bannedAt).getTime() - new Date(a.bannedAt).getTime()
    );
  }

  // Unban a permanently banned user
  unbanUser(bannedUserId: string) {
    this.bannedUsers = this.bannedUsers.filter(bu => bu.id !== bannedUserId);
    this.save(KEYS.BANNED_USERS, this.bannedUsers);
  }

  // --- Credit Policy Methods ---
  getCreditPolicy(): CreditPolicy {
    const stored = localStorage.getItem(KEYS.CREDIT_POLICY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Return default policy
    return { ...DEFAULT_CREDIT_POLICY };
  }

  saveCreditPolicy(policy: CreditPolicy) {
    this.save(KEYS.CREDIT_POLICY, policy);
  }

  // Generate test users for admin testing
  generateTestUsers(): User[] {
    const testUsers: User[] = [];
    const names = ['김철수', '이영희', '박민수', '최지은', '정태우', '강미래', '임준호', '송지혜', '윤서연', '조현우'];
    const romanized = ['kimcs', 'leeyh', 'parkms', 'choije', 'jungtw', 'kangmr', 'limjh', 'songjh', 'yoonsy', 'chohw'];
    const domains = ['gmail.com', 'naver.com', 'kakao.com', 'daum.net'];

    names.forEach((name, index) => {
      const domain = domains[index % domains.length];
      const gender = index % 2 === 0 ? Gender.MALE : Gender.FEMALE;

      testUsers.push({
        id: `test_user_${Date.now()}_${index}`,
        email: `${romanized[index]}@${domain}`,
        gender: gender,
        role: UserRole.USER,
        credits: Math.floor(Math.random() * 100)
      });
    });

    return testUsers;
  }

  // --- Ad Methods ---
  getAdConfig(): AdConfig {
    const stored = localStorage.getItem(KEYS.AD_CONFIG);
    if (stored) return JSON.parse(stored);

    // Default Config with 5 empty URL slots
    const defaultConfig: AdConfig = {
      source: 'admob',
      youtubeUrls: ['', '', '', '', '']
    };
    this.save(KEYS.AD_CONFIG, defaultConfig);
    return defaultConfig;
  }

  saveAdConfig(config: AdConfig) {
    this.save(KEYS.AD_CONFIG, config);
  }

  incrementAdViews() {
    this.adViews += 1;
    this.save(KEYS.AD_VIEWS, this.adViews);
  }

  // --- Dashboard ---
  getDashboardStats(): DashboardStats {
    return {
      totalUsers: this.users.length,
      totalToilets: this.toilets.length,
      totalReports: this.reports.length,
      todayAdViews: this.adViews // Simplified for now
    };
  }

  // --- Data Backup/Restore Methods ---

  /**
   * Export all data as JSON for backup
   */
  exportData(): string {
    const data = {
      toilets: this.toilets,
      reviews: this.reviews,
      reports: this.reports,
      banned: this.banned,
      users: this.users,
      adViews: this.adViews,
      adConfig: this.getAdConfig(),
      exportedAt: new Date().toISOString(),
      version: 'v2'
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON backup
   */
  importData(jsonString: string): { success: boolean, message: string } {
    try {
      const data = JSON.parse(jsonString);

      // Validate data structure
      if (!data.toilets || !Array.isArray(data.toilets)) {
        return { success: false, message: '유효하지 않은 데이터 형식입니다.' };
      }

      // Import data
      this.toilets = data.toilets || [];
      this.reviews = data.reviews || [];
      this.reports = data.reports || [];
      this.banned = data.banned || [];
      this.users = data.users || [];
      this.adViews = data.adViews || 0;

      // Save to LocalStorage
      this.save(KEYS.TOILETS, this.toilets);
      this.save(KEYS.REVIEWS, this.reviews);
      this.save(KEYS.REPORTS, this.reports);
      this.save(KEYS.BANNED, this.banned);
      this.save(KEYS.USERS, this.users);
      this.save(KEYS.AD_VIEWS, this.adViews);
      if (data.adConfig) this.saveAdConfig(data.adConfig);

      return { success: true, message: '데이터를 성공적으로 불러왔습니다.' };
    } catch (error) {
      return { success: false, message: '데이터 파싱 중 오류가 발생했습니다.' };
    }
  }

  /**
   * Download data as JSON file
   */
  downloadBackup() {
    const data = this.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `대똥단결_백업_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Clear all data (for testing)
   */
  clearAllData() {
    this.toilets = [];
    this.reviews = [];
    this.reports = [];
    this.banned = [];
    this.users = [];
    this.adViews = 0;

    localStorage.removeItem(KEYS.TOILETS);
    localStorage.removeItem(KEYS.REVIEWS);
    localStorage.removeItem(KEYS.REPORTS);
    localStorage.removeItem(KEYS.BANNED);
    localStorage.removeItem(KEYS.USERS);
    localStorage.removeItem(KEYS.AD_VIEWS);
    localStorage.removeItem(KEYS.AD_CONFIG);
  }

  /**
   * Get current data stats
   */
  getDataStats() {
    return {
      toilets: this.toilets.length,
      reviews: this.reviews.length,
      reports: this.reports.length,
      banned: this.banned.length,
      users: this.users.length,
      adViews: this.adViews
    };
  }

  // --- Daily Stats Methods ---

  private getTodayString(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  getDailyStats(date: string): DailyStats {
    if (this.dailyStats.has(date)) {
      return this.dailyStats.get(date)!;
    }
    // Return empty stats if not found
    return {
      date,
      newUsers: 0,
      visitors: 0,
      newToilets: 0,
      newReviews: 0,
      adViewsCompleted: 0,
      newReports: 0
    };
  }

  updateDailyStats(date: string, updates: Partial<DailyStats>): void {
    const existing = this.getDailyStats(date);
    const updated = { ...existing, ...updates, date };
    this.dailyStats.set(date, updated);

    // Save to localStorage
    const statsArray = Array.from(this.dailyStats.values());
    this.save(KEYS.DAILY_STATS, statsArray);
  }

  getStatsForDateRange(startDate: string, endDate: string): DailyStats[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const result: DailyStats[] = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      result.push(this.getDailyStats(dateStr));
    }

    return result;
  }

  // Helper to increment today's stats
  incrementTodayStats(field: keyof Omit<DailyStats, 'date'>): void {
    const today = this.getTodayString();
    const stats = this.getDailyStats(today);
    this.updateDailyStats(today, { [field]: stats[field] + 1 });
  }

  // Get today's stats
  getTodayStats(): DailyStats {
    return this.getDailyStats(this.getTodayString());
  }

  // Get stats for last N days (including today)
  getStatsForLastNDays(n: number): DailyStats[] {
    const result: DailyStats[] = [];
    const today = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      result.push(this.getDailyStats(dateStr));
    }

    return result;
  }

  // ========== Push Notification Methods ==========

  // Save user push token
  savePushToken(userId: string, token: string) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.pushToken = token;
      user.notificationEnabled = true;  // Enable by default
      this.saveUser(user);
    }
  }

  // Get user push token
  getUserPushToken(userId: string): string | undefined {
    return this.users.find(u => u.id === userId)?.pushToken;
  }

  // Create and store notification
  createNotification(
    type: NotificationType,
    userId: string,
    title: string,
    message: string,
    data?: PushNotification['data']
  ): PushNotification {
    const notification: PushNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId,
      title,
      message,
      data,
      read: false,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'pending'
    };

    this.notifications.push(notification);
    this.save(KEYS.NOTIFICATIONS, this.notifications);

    // In production, this would trigger actual push via FCM/APNs
    console.log(`📬 Notification created:`, notification);

    return notification;
  }

  // Send push notification (queues for FCM/APNs integration)
  async sendPushNotification(notification: PushNotification): Promise<boolean> {
    // Check if user has notifications enabled
    const user = this.users.find(u => u.id === notification.userId);
    if (!user || !user.notificationEnabled) {
      notification.deliveryStatus = 'failed';
      this.save(KEYS.NOTIFICATIONS, this.notifications);
      return false;
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mark as sent (in production, this would call FCM/APNs)
    notification.deliveryStatus = 'sent';
    this.save(KEYS.NOTIFICATIONS, this.notifications);

    console.log(`✉️ Push notification sent to ${user.email}:`, notification.title);
    return true;
  }

  // Get all notifications for a user
  getUserNotifications(userId: string): PushNotification[] {
    return this.notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  // Get all notifications (admin)
  getAllNotifications(): PushNotification[] {
    return this.notifications.sort((a, b) =>
      new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );
  }

  // Mark notification as read
  markNotificationAsRead(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.save(KEYS.NOTIFICATIONS, this.notifications);
    }
  }

  // Toggle user notification preference
  setNotificationEnabled(userId: string, enabled: boolean) {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      user.notificationEnabled = enabled;
      this.saveUser(user);
    }
  }

  // Calculate distance between two coordinates (Haversine formula)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  // Get users within radius of a location
  getUsersNearLocation(lat: number, lng: number, radiusKm: number): User[] {
    // For now, we'll return all users since we don't track user locations
    // In production, this would use actual user location data
    // For demo purposes, randomly select some users
    return this.users.filter(u =>
      u.role !== UserRole.GUEST &&
      u.notificationEnabled &&
      Math.random() > 0.7  // Simulate 30% of users being nearby
    );
  }
  // Upload History Methods
  getUploadHistories(): UploadHistory[] {
    return this.uploadHistories.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  }

  saveUploadHistory(history: UploadHistory) {
    this.uploadHistories.unshift(history);
    this.save(KEYS.UPLOAD_HISTORY, this.uploadHistories);
  }

  async deleteUploadHistory(id: string, onProgress?: (current: number, total: number) => void): Promise<void> {
    const history = this.uploadHistories.find(h => h.id === id);
    if (!history) return;

    // Delete all associated toilets
    const total = history.uploadedToiletIds.length;
    for (let i = 0; i < total; i++) {
      this.deleteToilet(history.uploadedToiletIds[i]);
      if (onProgress) {
        onProgress(i + 1, total);
      }
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    // Remove history record
    this.uploadHistories = this.uploadHistories.filter(h => h.id !== id);
    this.save(KEYS.UPLOAD_HISTORY, this.uploadHistories);
  }
}

export const db = new DatabaseService();