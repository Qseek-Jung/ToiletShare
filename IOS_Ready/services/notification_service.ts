import { LocalNotifications } from '@capacitor/local-notifications';
import { BackgroundFetch } from '@transistorsoft/capacitor-background-fetch';
import { Geolocation } from '@capacitor/geolocation';
import { dbSupabase as db } from './db_supabase';
import { calculateDistance } from '../utils';

class NotificationService {
    private static instance: NotificationService;
    private isInitialized = false;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    public async initialize() {
        if (this.isInitialized) return;

        try {
            const permission = await LocalNotifications.requestPermissions();
            if (permission.display === 'granted') {
                // IMPORTANT: Create channels for Android
                await this.createChannels();
                // Configure Nightlife on init
                await this.configureNightlifeReminder();
            }
            this.isInitialized = true;
            console.log('🔔 NotificationService Initialized');
        } catch (e) {
            console.error('Failed to initialize NotificationService', e);
        }
    }

    // --- Review Reminder (5 min delay) ---

    public async scheduleReviewReminder(toiletId: string, toiletName: string) {
        // 1. Check if already reviewed (Basic check: implemented in caller or here if needed)
        // For simplicity, we just schedule. The notification click handler can check validity or just open page.

        // Cancel any existing reminder for this toilet to avoid duplicates
        // We use a specific ID range or pattern? 
        // Let's use string hashing for ID or a random number.
        // Simple: toiletId hash or simple usage.

        const notificationId = this.hashString(toiletId);

        try {
            // System Setting for Message
            const msg = await db.getSystemSetting(
                'msg_review_reminder',
                '방금 이용하신 화장실은 어떠셨나요? 1분 만에 리뷰 남기고 크래딧 받으세요! 📝'
            );

            await LocalNotifications.schedule({
                notifications: [{
                    id: notificationId,
                    title: '리뷰 남기기',
                    body: msg,
                    schedule: { at: new Date(Date.now() + 3 * 60 * 1000) }, // 3 mins
                    extra: { toiletId, type: 'review_reminder' },
                    smallIcon: 'ic_stat_poop', // Ensure this icon exists or use default
                    channelId: 'reminders'
                }]
            });
            console.log(`⏰ Review Reminder Scheduled for ${toiletName} in 3 mins`);
        } catch (e) {
            console.error('Failed to schedule review reminder', e);
        }
    }

    public async cancelReviewReminder(toiletId: string) {
        const notificationId = this.hashString(toiletId);
        try {
            await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
            console.log(`❌ Review Reminder Cancelled for ${toiletId}`);
        } catch (e) {
            // Ignore error if not found
        }
    }

    // --- Hybrid Nightlife Reminder ---

    public async configureNightlifeReminder() {
        const FIXED_NOTIFICATION_ID = 99999;

        try {
            // 0. Check User Preference (Default: true)
            const isEnabled = localStorage.getItem('nightlife_notifications_enabled') !== 'false';
            if (!isEnabled) {
                console.log('🚫 Nightlife Mode Disabled by User');
                await LocalNotifications.cancel({ notifications: [{ id: FIXED_NOTIFICATION_ID }] });
                await BackgroundFetch.stop();
                return;
            }

            // 1. Check Location Permission
            const perm = await Geolocation.checkPermissions();
            const isAlways = perm.location === 'granted'; // Simplified check (Web/Android/iOS nuances exist)
            // 'granted' usually equates to 'While Using' or 'Always' depending on OS flow, 
            // but for Background Fetch to work reliably with Geolocation, we ideally need 'Always' on iOS 
            // and Background Location on Android.
            // For Hybrid logic:
            // If we think we can track background, enable Smart.

            // NOTE: Capacitor Geolocation 'granted' might just be 'while using'. 
            // True background location verification is tricker. 
            // We will attempt BackgroundFetch. If it runs, we are good.

            console.log(`🔔 Configuring Nightlife Reminder. Perm: ${perm.location}`);

            // A. Fixed Mode (Fallback) - Clear Smart, Set Fixed
            // Or B. Smart Mode - Clear Fixed, Set Smart

            // Current Strategy: Try Smart if Perm is granted. 
            // If Background Fetch fails or is denied, we fall back?
            // Let's rely on the permission check.

            if (perm.location === 'granted') {
                // --- Smart Mode ---
                console.log('🚀 Activating Smart Nightlife Mode');

                // 1. Cancel Fixed Schedule
                await LocalNotifications.cancel({ notifications: [{ id: FIXED_NOTIFICATION_ID }] });

                // 2. Configure Background Fetch
                const status = await BackgroundFetch.configure({
                    minimumFetchInterval: 15, // 15 minutes
                    stopOnTerminate: false,
                    startOnBoot: true,
                    enableHeadless: true,
                    requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
                }, async (taskId) => {
                    console.log('[BackgroundFetch] Event received: ', taskId);
                    await this.checkNightlifeMovement();
                    await this.checkNewToiletsNearby(); // New Daily Check
                    BackgroundFetch.finish(taskId);
                }, (taskId) => {
                    console.log('[BackgroundFetch] TIMEOUT: ', taskId);
                    BackgroundFetch.finish(taskId);
                });

                console.log('[BackgroundFetch] Status: ', status);

            } else {
                // --- Fixed Mode (Random Mon-Fri) ---
                console.log('📅 Activating Fixed Nightlife Mode');

                // 1. Stop Smart Mode
                await BackgroundFetch.stop();

                // 2. Schedule Fixed Notification
                // Randomly pick a weekday (1=Mon to 5=Fri) and persist it
                let targetDay = 5; // Default Fri
                const savedDay = localStorage.getItem('nightlife_fixed_day');
                if (savedDay) {
                    targetDay = parseInt(savedDay, 10);
                } else {
                    targetDay = Math.floor(Math.random() * 5) + 1; // 1-5
                    localStorage.setItem('nightlife_fixed_day', String(targetDay));
                }

                // Get Dynamic Message for that day
                const dayKeys = ['', 'msg_nightlife_mon', 'msg_nightlife_tue', 'msg_nightlife_wed', 'msg_nightlife_thu', 'msg_nightlife_fri'];
                const defaultMsgs = ['', '월요병 치유! 🍻 오늘 술자리 화장실은?', '화끈한 화요일! 🔥 화장실 비밀번호 확인하셨나요?', '수요일엔 술이 술술~ 🍷 화장실 위치 봐두세요!', '목요일은 목마르니까 🍺 화장실 꿀팁 챙기세요!', '불금 시작! 🔥 오늘 가시는 곳의 화장실 비밀번호, 챙기셨나요?'];

                const msg = await db.getSystemSetting(
                    dayKeys[targetDay],
                    defaultMsgs[targetDay]
                );

                const nextDate = this.getNextDayOfWeek(targetDay, 19, 0);

                await LocalNotifications.schedule({
                    notifications: [{
                        id: FIXED_NOTIFICATION_ID,
                        title: '오늘의 화장실 꿀팁',
                        body: msg,
                        schedule: {
                            at: nextDate,
                            every: 'week'
                        },
                        extra: { type: 'fixed_nightlife' },
                        channelId: 'reminders'
                    }]
                });
                console.log(`📅 Fixed Reminder Scheduled: Day ${targetDay} at 19:00`);
            }

        } catch (e) {
            console.error('Failed to configure Nightlife Reminder', e);
        }
    }

    private async checkNightlifeMovement() {
        console.log('🕵️ Checking Nightlife Movement...');

        // 1. Check Time Window (19:00 - 22:00)
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay(); // 0=Sun, 6=Sat

        // Only Mon-Fri (1-5)
        if (day === 0 || day === 6) {
            console.log('Skipping Nightlife Check: Weekend');
            return;
        }

        if (hour < 19 || hour >= 22) {
            console.log('Skipping Nightlife Check: Outside time window');
            return;
        }

        // 2. Check Frequency Cap (Max 3 times a week?)
        // ... (existing logs check)
        const lastSentStr = localStorage.getItem('last_nightlife_notification');
        if (lastSentStr) {
            const lastSent = new Date(lastSentStr);
            if (lastSent.toDateString() === now.toDateString()) {
                console.log('Skipping Nightlife Check: Already sent today');
                return;
            }
        }

        // 3. Check Movement
        try {
            const currentPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
            const currentLat = currentPos.coords.latitude;
            const currentLng = currentPos.coords.longitude;

            const lastLocStr = localStorage.getItem('last_known_location');
            if (lastLocStr) {
                const lastLoc = JSON.parse(lastLocStr);
                const distKm = calculateDistance(lastLoc.lat, lastLoc.lng, currentLat, currentLng);
                const timeDiff = now.getTime() - lastLoc.timestamp;

                console.log(`Movement Check: Dist=${distKm.toFixed(2)}km, TimeDiff=${(timeDiff / 60000).toFixed(0)}min`);

                if (timeDiff < 60 * 60 * 1000 && distKm >= 0.5 && distKm <= 2.0) {
                    // Trigger Notification!
                    // Dynamic Message based on Day
                    const dayKeys = ['msg_nightlife_sun', 'msg_nightlife_mon', 'msg_nightlife_tue', 'msg_nightlife_wed', 'msg_nightlife_thu', 'msg_nightlife_fri', 'msg_nightlife_sat'];
                    const defaultMsg = '주변 화장실 비밀번호 공유하고 크래딧 받으세요!';

                    const msg = await db.getSystemSetting(
                        dayKeys[day] || 'msg_nightlife_smart',
                        defaultMsg
                    );

                    await LocalNotifications.schedule({
                        notifications: [{
                            id: Math.floor(Math.random() * 100000) + 100000,
                            title: '주변 화장실 찾기',
                            body: msg,
                            schedule: { at: new Date(Date.now() + 1000) }, // Now
                            extra: { type: 'smart_nightlife' },
                            channelId: 'reminders'
                        }]
                    });

                    // Update State
                    localStorage.setItem('last_nightlife_notification', now.toISOString());
                    console.log('✅ Smart Nightlife Notification Sent');
                }
            }

            // Update Last Location
            localStorage.setItem('last_known_location', JSON.stringify({
                lat: currentLat,
                lng: currentLng,
                timestamp: now.getTime()
            }));

        } catch (e) {
            console.error('Nightlife Position Check Failed', e);
        }
    }

    // New: Check for New Toilets Nearby (Daily)
    private async checkNewToiletsNearby() {
        console.log('🕵️ Checking New Toilets Nearby...');
        const now = new Date();
        const lastCheckStr = localStorage.getItem('last_nearby_toilet_check');

        // Run only once per day
        if (lastCheckStr) {
            const lastCheck = new Date(lastCheckStr);
            if (lastCheck.toDateString() === now.toDateString()) return;
        }

        try {
            // 1. Get Location
            const currentPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false }); // Low accuracy fine
            const { latitude, longitude } = currentPos.coords;

            // 2. Get Settings
            const radiusStr = await db.getSystemSetting('new_toilet_radius', '2');
            const radius = parseFloat(radiusStr) || 2.0;

            // 3. Fetch Toilets
            // We fetch toilets in radius and check 'created_at' in JS because RPC might not support date filter easily
            // or we use getToiletsInRadius which is optimized.
            const toilets = await db.getToiletsInRadius(latitude, longitude, radius);

            // 4. Filter for New (< 24h)
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const newToilets = toilets.filter(t => t.createdAt && new Date(t.createdAt) > yesterday);

            if (newToilets.length > 0) {
                console.log(`Found ${newToilets.length} new toilets nearby!`);
                const msgTemplate = await db.getSystemSetting('msg_new_toilet_nearby', '내 주변 [radius]km 내에 [count]개의 새로운 화장실이 등록되었어요!');
                const msg = msgTemplate.replace('[radius]', String(radius)).replace('[count]', String(newToilets.length));

                await LocalNotifications.schedule({
                    notifications: [{
                        id: Math.floor(Math.random() * 100000) + 200000,
                        title: '신규 화장실 알림',
                        body: msg,
                        schedule: { at: new Date(Date.now() + 1000) },
                        extra: { type: 'nearby_toilet_check' },
                        channelId: 'reminders'
                    }]
                });
            }

            // Update Check Time
            localStorage.setItem('last_nearby_toilet_check', now.toISOString());

        } catch (e) {
            console.error('New Toilets Check Failed', e);
        }
    }

    // Defines Channels on Android
    public async createChannels() {
        // 1. Activity Reminders (Review request, Nightlife, etc)
        await LocalNotifications.createChannel({
            id: 'reminders',
            name: '활동 알림',
            description: '화장실 리뷰 요청 및 활동 알림',
            importance: 4,
            visibility: 1,
            sound: 'default'
        });

        // 2. Direct Messages / Announcements
        await LocalNotifications.createChannel({
            id: 'messages',
            name: '메시지 및 공지',
            description: '관리자 메시지 및 중요 공지사항',
            importance: 5, // High importance
            visibility: 1
        });

        // 3. System Default (Catch-all)
        await LocalNotifications.createChannel({
            id: 'default',
            name: '기타 알림',
            description: '기타 시스템 알림',
            importance: 3,
            visibility: 1
        });
    }

    // Helper: Next Friday 19:00
    private getNextDayOfWeek(dayOfWeek: number, hour: number, minute: number) {
        const now = new Date();
        const result = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() + (dayOfWeek + 7 - now.getDay()) % 7,
            hour,
            minute
        );
        if (result < now) {
            result.setDate(result.getDate() + 7);
        }
        return result;
    }

    private hashString(str: string): number {
        let hash = 0, i, chr;
        if (str.length === 0) return hash;
        for (i = 0; i < str.length; i++) {
            chr = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash); // Ensure positive ID
    }
}

export const notificationService = NotificationService.getInstance();
