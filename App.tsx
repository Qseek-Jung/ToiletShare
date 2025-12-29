import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { User, Toilet, UserRole, Gender } from './types';
import { INITIAL_USER } from './constants';
import { dbSupabase as db } from './services/db_supabase';
import { GOOGLE_CLIENT_ID, NAVER_CLIENT_ID, SUPERVISOR_EMAIL, KAKAO_JAVASCRIPT_KEY } from './config';
import { calculateDistance } from './utils';
import { PoopIcon } from './components/Icons';
import { AdManager } from './components/AdManager';
import { WelcomeModal } from './components/WelcomeModal';
import { MapPin, User as UserIcon, Plus, X, Star, ArrowRight, Lock, MessageSquareQuote, Loader2, Gift } from 'lucide-react';
import { AdBanner } from './components/AdBanner';
import AdminPage from './pages/admin/AdminPage';
import HomePage from './pages/HomePage';
import DetailPage from './pages/DetailPage';
import MyPage from './pages/MyPage';
import SubmitPage from './pages/SubmitPage';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import { getIPLocation, getLastLocation, saveLastLocation, getValidCachedLocation } from './services/location';
import { UserDetailPage } from './pages/admin/UserDetailPage';
import { WithdrawnUsersPage } from './pages/admin/WithdrawnUsersPage';
import { LoginNoticeModal } from './components/LoginNoticeModal';
import PhotoTestPage from './pages/test/PhotoTestPage';
import UsageGuidePage from './pages/UsageGuidePage';
import { GoogleMapsProvider } from './components/GoogleMapsProvider';
import { NotificationPage } from './pages/NotificationPage';
import { CreditGuide } from './pages/guide/CreditGuide';
import { RegistrationGuide } from './pages/guide/RegistrationGuide';
import { adMobService } from './services/admob';


// Declaration for Google Identity Services & Maps & Social Logins
declare global {
    interface Window {
        google: any;
        initMap?: () => void;
        Kakao: any;
        naver: any;
        naverLoginProcessing?: boolean;
    }
}

export default function App() {
    const [user, setUser] = useState<User>(INITIAL_USER);
    const [myLocation, setMyLocation] = useState<{ lat: number, lng: number }>({ lat: 37.5048, lng: 127.0884 });
    const [toilets, setToilets] = useState<Toilet[]>([]);
    const [filteredToilets, setFilteredToilets] = useState<Toilet[]>([]);
    const [unlockedToilets, setUnlockedToilets] = useState<Record<string, number>>({});
    const [selectionModalData, setSelectionModalData] = useState<{ show: boolean, toilets: Toilet[] }>({ show: false, toilets: [] });
    const [fetchedToilet, setFetchedToilet] = useState<Toilet | null>(null); // Store individual fetched toilet
    const [isLoading, setIsLoading] = useState(false);
    // Persist Map State (Center/Zoom)
    const [lastMapState, setLastMapState] = useState<{ center: { lat: number, lng: number }, zoom: number } | null>(null);
    const [manualLoginEmail, setManualLoginEmail] = useState(''); // Test Login State
    // Persist List View State
    const [isHomeListOpen, setIsHomeListOpen] = useState(false);
    // Dark Mode State
    const [darkMode, setDarkMode] = useState<boolean>(() => {
        const saved = localStorage.getItem('darkMode');
        return saved === 'true';
    });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSubmitMapOpen, setIsSubmitMapOpen] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);


    const toggleDarkMode = () => {
        setDarkMode(prev => {
            const newValue = !prev;
            localStorage.setItem('darkMode', String(newValue));
            return newValue;
        });
    };

    // Record Visit (Once per session)
    useEffect(() => {
        const hasVisited = sessionStorage.getItem('has_visited_session');
        if (!hasVisited) {
            const ua = navigator.userAgent.toLowerCase();
            let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
            if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
                deviceType = 'tablet';
            } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
                deviceType = 'mobile';
            }

            db.recordVisit(deviceType).catch(console.error);
            sessionStorage.setItem('has_visited_session', 'true');
            console.log('📢 Visit Recorded:', deviceType);
        }
    }, []);

    // Capture Referral Code from URL
    useEffect(() => {
        const refCode = new URLSearchParams(window.location.search).get('ref');
        if (refCode) {
            sessionStorage.setItem('referral_code', refCode);
            console.log('🔗 Referral code captured:', refCode);
        }
    }, []);





    // Restore session from localStorage on mount & Sync with Supabase
    useEffect(() => {
        const initUser = async () => {

            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);

                // Pre-warm Ad Config and User data
                try {
                    await Promise.all([
                        db.getAdConfig(),
                        (async () => {
                            const existing = await db.getUserByEmail(parsedUser.email);
                            if (existing) {
                                setUser(existing);
                                localStorage.setItem('currentUser', JSON.stringify(existing));
                            }
                        })()
                    ]);
                } catch (error) {
                    console.error('Failed to pre-warm app data:', error);
                }
            } else {
                // Background pre-warm for guests
                db.getAdConfig().catch(() => { });
            }
        };
        initUser();
    }, []);

    // Load unlocked toilets specific to the current user
    useEffect(() => {
        if (user.id) {
            const saved = localStorage.getItem(`unlockedToilets_${user.id}`);
            setUnlockedToilets(saved ? JSON.parse(saved) : {});
        } else {
            setUnlockedToilets({});
        }
    }, [user.id]);

    const handleUnlock = async (toiletId: string, method: 'credit' | 'ad', forceUnlock: boolean = false) => {
        // Find toilet to check creator status
        const targetToilet = toilets.find(t => t.id === toiletId);
        const isCreator = targetToilet?.createdBy === user.id;
        const isAdminOrVIP = user.role === UserRole.ADMIN || user.role === UserRole.VIP;

        // BYPASS Logic: Admin, VIP, or Creator gets free unlock
        if (isAdminOrVIP || isCreator) {
            setUnlockedToilets(prev => {
                const updated = { ...prev, [toiletId]: Date.now() + 24 * 60 * 60 * 1000 };
                localStorage.setItem(`unlockedToilets_${user.id}`, JSON.stringify(updated));
                return updated;
            });
            // Optional: Alert or toast "관리자/작성자 권한으로 무료 열람되었습니다"
            return;
        }

        if (method === 'credit') {
            // Fetch Policy dynamic cost
            let cost = 1;
            try {
                const policy = await db.getCreditPolicy();
                cost = policy.unlockCost;
            } catch (e) {
                console.error("Failed to fetch policy, using default", e);
            }

            console.log('🔓 Unlocking via Credit:', { currentCredits: user.credits, cost });

            if (user.credits >= cost) {
                // 1. Optimistic UI Update (Instant)
                const updated = { ...user, credits: user.credits - cost };
                setUser(updated);

                // 2. Process Transaction & Logging (Background)
                db.deductUnlockCost(user.id, toiletId, cost).then(success => {
                    if (!success) {
                        console.error("Failed to deduct credits on server");
                        // Ideally revert UI here if critical, but for now just log
                    }
                });

                // 3. Process Passive Reward for Creator
                db.processUnlockReward(toiletId, user.id);
            } else {
                console.warn('❌ Insufficient credits detected in handleUnlock', { currentCredits: user.credits, cost });
                // Fallback to Ad if credits are insufficient
                setAdRewardType('unlock');
                setPendingUnlockToiletId(toiletId);
                setShowAd(true);
                return;
            }
        } else if (method === 'ad' && !forceUnlock) {
            // Trigger Ad
            setAdRewardType('unlock');
            setPendingUnlockToiletId(toiletId);
            setShowAd(true);
            return; // Stop here, wait for ad
        }

        // Set expiration to 24 hours from now
        const expirationTime = Date.now() + 24 * 60 * 60 * 1000;

        setUnlockedToilets(prev => {
            const updated = { ...prev, [toiletId]: expirationTime };
            localStorage.setItem(`unlockedToilets_${user.id} `, JSON.stringify(updated));
            return updated;
        });

    };
    const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
    const [currentHash, setCurrentHash] = useState(window.location.hash || '#/');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Login Modal State

    const [loginLoading, setLoginLoading] = useState(false);
    const [showBannedModal, setShowBannedModal] = useState(false);
    const [showGenderSelectModal, setShowGenderSelectModal] = useState(false);
    const [pendingUser, setPendingUser] = useState<User | null>(null);

    // Test Account Modal State
    const [showTestAccountModal, setShowTestAccountModal] = useState(false);
    const [testAccounts, setTestAccounts] = useState<User[]>([]);

    // Splash Screen State
    const [showSplash, setShowSplash] = useState(true);
    const [splashImgError, setSplashImgError] = useState(false);

    // AdManager State
    const [showAd, setShowAd] = useState(false);
    const [adRewardType, setAdRewardType] = useState<'credit' | 'unlock'>('credit');

    // Smart Ad Refresh State
    const [adKey, setAdKey] = useState(0);
    const lastAdRefreshTime = useRef<number>(Date.now());

    // Effect: Smart Ad Refresh on Page Navigation
    useEffect(() => {
        const now = Date.now();
        // If more than 30 seconds passed since last refresh, force new ad
        if (now - lastAdRefreshTime.current > 30000) {
            setAdKey(prev => prev + 1);
            lastAdRefreshTime.current = now;
        }
        // Else: Keep existing ad (stable key) -> No animation, no reload
    }, [currentHash]);
    const [pendingUnlockToiletId, setPendingUnlockToiletId] = useState<string | null>(null);

    // Welcome Modal State
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // Login Notice Modal State
    const [showNoticeModal, setShowNoticeModal] = useState(false);

    // Manage Banner Visibility based on Route
    useEffect(() => {
        // Detailed Page: User requested to keep banner.
        // We ensure showBottomBanner is called.
        // DetailPage needs padding-bottom to avoid overlap.
        adMobService.showBottomBanner();
    }, [currentHash]);

    // Reward Success Modal State
    const [rewardSuccessModal, setRewardSuccessModal] = useState<{ show: boolean, amount: number }>({ show: false, amount: 0 });

    // Ad Callback State
    const [adCallback, setAdCallback] = useState<(() => void) | null>(null);

    const requestAd = (callback: () => void) => {
        setAdCallback(() => callback);
        setAdRewardType('custom'); // Use a custom type to indicate callback usage
        setShowAd(true);
    };

    const handleAdReward = async () => {
        if (adCallback) {
            adCallback();
            setAdCallback(null);
            setShowAd(false); // Close immediately
        } else if (adRewardType === 'credit') {
            // Optimistic UI Close
            setShowAd(false);

            // Background Processing
            (async () => {
                try {
                    // Reward: Use policy value
                    const policy = await db.getCreditPolicy();
                    const reward = policy.adView;

                    // 1. DB Update & Log (Parallel)
                    await Promise.all([
                        db.updateUserCredits(user.id, reward),
                        db.logCreditTransaction(user.id, reward, 'ad_view', 'none', undefined, '마이페이지 광고 적립'),
                        db.recordAdView('charge')
                    ]);

                    // 2. Local State Update
                    const updatedUser = { ...user, credits: (user.credits || 0) + reward };
                    setUser(updatedUser);

                    // Show Success Modal instead of Alert
                    setRewardSuccessModal({ show: true, amount: reward });
                } catch (e) {
                    console.error("Ad Credit Reward Failed", e);
                }
            })();

        } else if (adRewardType === 'unlock' && pendingUnlockToiletId) {
            const toiletId = pendingUnlockToiletId;

            // 1. Optimistic UI Update (Instant)
            handleUnlock(toiletId, 'ad', true);
            setShowAd(false);
            setPendingUnlockToiletId(null);

            // 2. Background DB Processing
            (async () => {
                try {
                    const policy = await db.getCreditPolicy();
                    const adReward = policy.adView;
                    const unlockCost = policy.unlockCost;

                    // Net Credit Change
                    const netChange = adReward - unlockCost;

                    // Execute all independent DB ops in parallel
                    // Using Promise.all for maximum speed
                    const promises: Promise<any>[] = [
                        db.logCreditTransaction(user.id, adReward, 'ad_view', 'toilet', toiletId, '광고 시청 보상'),
                        db.logCreditTransaction(user.id, -unlockCost, 'toilet_unlock', 'toilet', toiletId, '화장실 열람 (광고 대체)'),
                        db.processUnlockReward(toiletId, user.id),
                        db.recordAdView('unlock')
                    ];

                    // Only update balance if changed
                    if (netChange !== 0) {
                        promises.push(db.updateUserCredits(user.id, netChange));
                        // Update local user state for consistency (delayed but correct)
                        setUser(prev => ({ ...prev, credits: (prev.credits || 0) + netChange }));
                    }

                    await Promise.all(promises);
                    console.log('⚡ Ad Unlock DB Sync Complete');

                } catch (e) {
                    console.error("Ad Unlock Flow Failed in Background", e);
                    // UI is already unlocked, so just log error. 
                    // Retry logic could be added here if critical.
                }
            })();
        } else {
            // Default Fallback
            setShowAd(false);
            setPendingUnlockToiletId(null);
        }
    };

    // Initialize Data & Splash
    useEffect(() => {
        let isMounted = true;
        const MIN_SPLASH_TIME = 2000; // Minimum 2 seconds
        const GPS_TIMEOUT = 8000; // 8 seconds for GPS
        const MAX_WAIT_TIME = 10000; // 10 seconds ultimate fallback

        const startTime = Date.now();

        // Helper to dismiss splash with minimum time check
        const finishSplash = () => {
            if (!isMounted) return;
            const elapsedTime = Date.now() - startTime;
            const remainingTime = Math.max(0, MIN_SPLASH_TIME - elapsedTime);

            setTimeout(() => {
                if (isMounted) setShowSplash(false);
            }, remainingTime);
        };

        const initLocation = async () => {
            let hasReceivedGPS = false;

            // PHASE 1: VALID CACHE (Show while waiting for GPS)
            const cached = getValidCachedLocation();
            if (cached) {
                console.log('📦 Phase 1: Showing valid cached location (temporary)');
                if (isMounted) {
                    setMyLocation({ lat: cached.lat, lng: cached.lng });
                    finishSplash(); // Show UI immediately while GPS loads
                }
            }

            // PHASE 2: GPS (Always prioritized - Fresh location)
            try {
                // Request permissions first (Best practice for native)
                await Geolocation.checkPermissions();

                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: GPS_TIMEOUT,
                    maximumAge: 0
                });

                if (!isMounted) return;
                hasReceivedGPS = true;
                const { latitude, longitude } = position.coords;
                console.log('✅ Phase 2: GPS Success - Fresh location acquired');

                // ALWAYS update to GPS location (even if cache was shown)
                setMyLocation({ lat: latitude, lng: longitude });
                saveLastLocation(latitude, longitude);

                // Finish splash if not already done
                if (!cached) finishSplash();

            } catch (err: any) {
                console.warn(`⚠️ Phase 2: GPS Failed - ${err.message}`);

                // PHASE 3: IP FALLBACK
                if (!cached && !hasReceivedGPS) {
                    console.log('🌐 Phase 3: Attempting IP-based location...');
                    const ipLoc = await getIPLocation();
                    if (isMounted && ipLoc) {
                        console.log('📍 Phase 3: IP Location acquired');
                        setMyLocation({ lat: ipLoc.lat, lng: ipLoc.lng });
                        finishSplash();
                    } else {
                        console.log('❌ Phase 3 Failed: Using default location');
                        finishSplash();
                    }
                } else if (cached) {
                    console.log('📦 GPS failed but valid cache exists - keeping cached location');
                }
            }
        };

        initLocation();

        // Safety Timeout (Ultimate Fail-safe)
        const safetyTimer = setTimeout(() => {
            if (isMounted && showSplash) {
                console.log("⏰ Ultimate Timeout: Forcing splash dismissal");
                finishSplash();
            }
        }, MAX_WAIT_TIME);

        return () => {
            isMounted = false;
            clearTimeout(safetyTimer);
        };
    }, []);

    // Restore Login Session (Async)
    useEffect(() => {
        const restoreSession = async () => {
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                try {
                    const parsedUser = JSON.parse(savedUser);
                    // Verify with DB to ensure user still exists and get latest data
                    // Use optimized single user fetch
                    const dbUser = await db.getUserById(parsedUser.id);

                    if (dbUser) {
                        setUser(dbUser);
                        if (dbUser.id) {
                            db.getBookmarks(dbUser.id).then(ids => setBookmarks(new Set(ids)));
                        }
                        console.log('Session restored:', dbUser.email);
                    } else {
                        // User no longer exists in DB
                        localStorage.removeItem('currentUser');
                    }
                } catch (e) {
                    localStorage.removeItem('currentUser');
                }
            }
        };
        restoreSession();
    }, []);

    // Check for loginNotices
    useEffect(() => {
        if (user.id) {
            console.log(`[App] Checking notices for ${user.id}...count: ${user.loginNotices?.length || 0} `);
            if (user.loginNotices && user.loginNotices.length > 0) {
                console.log("[App] Triggering Notice Modal", user.loginNotices);
                setShowNoticeModal(true);
            }
        }
    }, [user.loginNotices, user.id]);

    const handleCloseNotice = (updatedUser: User) => {
        setUser(updatedUser);
        // If no more notices, close modal
        if (!updatedUser.loginNotices || updatedUser.loginNotices.length === 0) {
            setShowNoticeModal(false);
        }
    };

    // Load Kakao SDK & Handle Naver Login Callback
    useEffect(() => {
        // 1. Load Kakao SDK
        const script = document.createElement('script');
        script.src = 'https://developers.kakao.com/sdk/js/kakao.js';
        script.async = true;
        document.body.appendChild(script);

        // 2. Handle Naver Login Callback
        // 2. Handle Naver Login Callback
        const handleNaverCallback = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code');
            const state = params.get('state');
            const storedState = sessionStorage.getItem('naver_state');

            // Prevent multiple executions
            if (window.naverLoginProcessing) return;

            if (code && state) {
                window.naverLoginProcessing = true; // Set lock

                if (state === storedState) {
                    const simulatedEmail = `naver_user_${code.substring(0, 5)} @naver.com`;

                    // Check existing
                    // Optimized: Use direct email lookup
                    let targetUser = await db.getUserByEmail(simulatedEmail);

                    if (!targetUser) {
                        const tempUser: User = {
                            id: 'naver_' + Date.now(),
                            email: simulatedEmail,
                            gender: Gender.MALE, // Temporary
                            role: UserRole.USER,

                            credits: 50,
                            signupProvider: 'naver'
                        };

                        setPendingUser(tempUser);
                        setShowGenderSelectModal(true);
                        // Clean URL immediately to prevent re-trigger
                        window.history.replaceState({}, document.title, window.location.pathname);
                        sessionStorage.removeItem('naver_state');
                    } else {
                        // 1. Check Banned
                        if (targetUser.status === 'banned') {
                            setShowBannedModal(true);
                            window.naverLoginProcessing = false;
                            return;
                        }

                        // 2. Check Deleted (Reactivation)
                        if (targetUser.status === 'deleted') {
                            console.log('♻️ Reactivating withdrawn user (Naver):', simulatedEmail);
                            targetUser.status = 'active';
                            targetUser.deletedAt = undefined;
                            targetUser.withdrawalReason = undefined;
                            await db.saveUser(targetUser);
                            alert("계정이 복구되었습니다. 환영합니다!");
                        }

                        console.log('👋 Welcome back (Naver):', simulatedEmail);
                        setUser(targetUser);
                        localStorage.setItem('currentUser', JSON.stringify(targetUser));
                        window.history.replaceState({}, document.title, window.location.pathname);
                        sessionStorage.removeItem('naver_state');
                        window.location.reload(); // Reload to refresh state cleanly
                    }
                }
                setTimeout(() => { window.naverLoginProcessing = false; }, 1000); // Release lock after delay
            }
        };
        handleNaverCallback();

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []);

    // Initialize DB Data & Reload User (Async)
    // Data Fetching Callback (Radius based)
    const fetchToiletsInRadius = useCallback(async (lat: number, lng: number, radiusKm: number) => {
        setIsLoading(true);
        try {
            // Use Bounding Box search for efficiency
            const dbToilets = await db.getToiletsInRadius(lat, lng, radiusKm);

            // Calculate distance relative to SEARCH CENTER (lat, lng)
            const withDist = dbToilets.map(t => ({
                ...t,
                distance: calculateDistance(lat, lng, t.lat, t.lng)
            })).sort((a, b) => (a.distance || 0) - (b.distance || 0));

            setToilets(withDist);
        } catch (error) {
            console.error("Failed to fetch toilets:", error);
        } finally {
            setIsLoading(false);
        }
    }, [myLocation]); // Re-create if myLocation changes (so distance calc is correct)

    // Initialize DB Data & Reload User (Async)
    useEffect(() => {
        const loadData = async () => {
            // 1. Reload Toilets (Initial 2km radius) & 2. Reload User (Sync)
            console.log('🔄 loadData triggered with location:', myLocation);

            const toiletPromise = (myLocation.lat !== 0 && myLocation.lng !== 0)
                ? fetchToiletsInRadius(myLocation.lat, myLocation.lng, 2)
                : fetchToiletsInRadius(37.5665, 126.9780, 2);

            const userPromise = (async () => {
                try {
                    // Skip sync for Guests or if ID is missing/guest
                    if (user.id && user.role !== UserRole.GUEST && user.id !== 'guest') {
                        const users = await db.getUsers();
                        const currentUser = users.find(u => u.id === user.id);
                        if (currentUser) {
                            setUser({ ...currentUser });
                        }
                        // Also fetch bookmarks
                        const savedBookmarks = await db.getBookmarks(user.id);
                        setBookmarks(new Set(savedBookmarks));
                    }
                } catch (error) {
                    console.error("User sync failed in loadData:", error);
                }
            })();

            await Promise.all([toiletPromise, userPromise]);
        };
        loadData();
    }, [myLocation, refreshTrigger, fetchToiletsInRadius]);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash || '#/';
            setCurrentHash(hash);
        };
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);

        // Handle browser back button from admin pages
        const handlePopState = (event: PopStateEvent) => {
            if (event.state?.fromAdmin) {
                // Coming back from toilet detail page to admin list
                // The hash will already be updated, just need to ensure we stay in admin
                const hash = window.location.hash;
                if (hash.startsWith('#/admin')) {
                    setCurrentHash(hash);
                }
            }
        };
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);

    // Filter Logic
    useEffect(() => {
        // Admin and VIP can see all gender types
        const isAdminOrVIP = user.role === UserRole.ADMIN || user.role === UserRole.VIP;
        const isGuest = user.role === UserRole.GUEST;

        const filtered = toilets.filter(t => {
            // 1. Creator ALWAYS sees their own creation (Private or Public, Any Gender)
            if (t.createdBy === user.id) return true;

            // 2. Admin/VIP sees EVERYTHING
            if (isAdminOrVIP) return true;

            // 3. Guest Logic
            if (isGuest) {
                // Guests see ALL non-private toilets.
                // Access control (click) is handled in handleToiletClick, not here.
                return !t.isPrivate;
            }

            // 4. Standard Member Logic
            // - Hide Private toilets (unless owned by me, handled in step 1)
            if (t.isPrivate) return false;

            // - Check Gender
            //   - User Male -> See Male & Unisex
            //   - User Female -> See Female & Unisex
            const isGenderMatch = t.genderType === Gender.UNISEX || t.genderType === user.gender;
            return isGenderMatch;
        });

        // Sort by distance (Client-side sort after filtering)
        filtered.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        setFilteredToilets(filtered);
    }, [toilets, user.gender, user.id, user.role]);

    // --- HELPER & ACTIONS ---



    const handleToiletClick = (t: Toilet) => {
        const isGuest = user.role === UserRole.GUEST;

        // --- GUEST Permission Check ---
        if (isGuest) {
            // Policy:
            // 1. Admin/VIP Registered (Public, No Password) -> Allow Access
            // 2. Everything else (Admin+Lock OR User+Shared) -> Require Login

            // Fix: Use source='admin' OR check creatorRole
            const isCreatorAdminOrVIP = t.creatorRole === UserRole.ADMIN || t.creatorRole === UserRole.VIP;
            const isPublicData = t.source === 'admin' || t.createdBy === 'admin';

            // Allow ONLY if it is (Admin/VIP-created OR Public Data) AND has NO password
            if ((isPublicData || isCreatorAdminOrVIP) && !t.hasPassword) {
                // Allow Access
            } else {
                // Restricted
                setShowLoginModal(true);
                return;
            }
        }

        const isAdminOrVIP = user.role === UserRole.ADMIN || user.role === UserRole.VIP;

        // Group logic for multiple toilets at same location
        const sameLocationToilets = toilets.filter(item => {
            if (item.address !== t.address) return false;

            const dist = calculateDistance(t.lat, t.lng, item.lat, item.lng);
            if (dist > 0.03) return false; // 30m radius

            // Apply same visibility rules as main map
            if (item.createdBy === user.id) return true;
            if (isAdminOrVIP) return true;
            if (isGuest) return !item.isPrivate;

            // Member: Public + Gender Match
            if (item.isPrivate) return false;
            return item.genderType === Gender.UNISEX || item.genderType === user.gender;
        });


        if (sameLocationToilets.length > 1) {
            setSelectionModalData({ show: true, toilets: sameLocationToilets });
        } else {
            window.location.hash = `#/toilet/${t.id}`;
        }
    };

    const toggleBookmark = async (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation();

        // 1. Optimistic Update (Instant feedback)
        const wasBookmarked = bookmarks.has(id);
        setBookmarks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });

        // 2. Database Sync
        if (user.id && user.role !== UserRole.GUEST) {
            try {
                // Returns true if added, false if removed
                const isNowAdded = await db.toggleBookmark(user.id, id);

                // Verify state consistency (Optional: Revert if failed)
                if (isNowAdded !== !wasBookmarked) {
                    // State mismatch (very rare), sync with server result
                    setBookmarks(prev => {
                        const newSet = new Set(prev);
                        if (isNowAdded) newSet.add(id);
                        else newSet.delete(id);
                        return newSet;
                    });
                }
            } catch (error) {
                console.error("Failed to sync bookmark:", error);
                // Revert optimistic update
                setBookmarks(prev => {
                    const newSet = new Set(prev);
                    if (wasBookmarked) newSet.add(id);
                    else newSet.delete(id);
                    return newSet;
                });
            }
        } else {
            // Guest: just keep local state (ephemeral)
        }
    };


    const performGoogleLogin = async () => {
        setLoginLoading(true);


        try {
            try {
                // New Native/Hybrid Login Flow
                const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');

                // Initialize (Required for Web, harmless for Native if configured)
                // We use dynamic import to avoid issues if plugin missing
                await GoogleAuth.initialize();

                const userCreds = await GoogleAuth.signIn();

                // Standardize response
                // Native returns 'authentication.accessToken' or 'idToken'
                // Web returns similar.

                if (userCreds) {
                    alert(`Google 로그인 성공: ${userCreds.email}`); // Debug Alert 1

                    // 1. Map fields
                    const email = userCreds.email;
                    const name = userCreds.name || userCreds.givenName || 'Google User';
                    const googleId = userCreds.id;

                    // 2. Check/Create User in DB
                    let targetUser = await db.getUserByEmail(email);

                    if (!targetUser) {
                        alert("신규 회원입니다. 가입 절차를 진행합니다."); // Debug Alert 2
                        // Register New User
                        const newUser: User = {
                            id: googleId,
                            email: email,
                            nickname: name,
                            gender: Gender.MALE, // Default, update later
                            role: UserRole.USER,
                            credits: 50,
                            signupProvider: 'google',
                        };
                        setPendingUser(newUser);
                        setShowLoginModal(false); // Close Login Modal
                        setShowGenderSelectModal(true); // Open Gender Modal
                    } else {
                        alert("기존 회원입니다. 로그인합니다."); // Debug Alert 2
                        // Login Existing
                        if (targetUser.status === 'banned') {
                            setShowBannedModal(true);
                            setLoginLoading(false);
                            return;
                        }
                        if (targetUser.status === 'deleted') {
                            targetUser.status = 'active';
                            targetUser.deletedAt = undefined;
                            targetUser.withdrawalReason = undefined;
                            await db.saveUser(targetUser);
                            alert("계정이 복구되었습니다.");
                        }

                        setUser(targetUser);
                        localStorage.setItem('currentUser', JSON.stringify(targetUser));
                        window.location.reload();
                    }
                } else {
                    alert("Google 인증 정보가 없습니다 (userCreds is null)");
                }

            } catch (error: any) {
                console.error("Google Login Failed:", error);
                alert("Google 로그인 오류 발생 (Catch): " + JSON.stringify(error, Object.getOwnPropertyNames(error)));
            } finally {
                setLoginLoading(false);
            }


        } catch (e) {
            console.error('Google login initialization error:', e);
            setLoginLoading(false);
            alert("로그인 초기화 오류");
        }
    };


    const performNaverLogin = () => {
        // Naver OAuth 2.0 Login
        const state = Math.random().toString(36).substring(7);
        const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
        const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${NAVER_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}`;

        // Store state for verification
        sessionStorage.setItem('naver_state', state);

        // Redirect to Naver login
        window.location.href = naverAuthUrl;
    };

    const performKakaoLogin = () => {
        if (!window.Kakao.isInitialized()) {
            window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
        }

        window.Kakao.Auth.login({
            success: async (authObj: any) => {
                try {
                    // Get user info
                    window.Kakao.API.request({
                        url: '/v2/user/me',
                        success: async (response: any) => {
                            const email = response.kakao_account?.email;
                            const kakaoGender = response.kakao_account?.gender;

                            // Kakao gender: 'female' or 'male' or undefined
                            let hasGenderInfo = false;
                            let gender = Gender.MALE; // Default

                            if (kakaoGender === 'female') {
                                gender = Gender.FEMALE;
                                hasGenderInfo = true;
                            } else if (kakaoGender === 'male') {
                                gender = Gender.MALE;
                                hasGenderInfo = true;
                            }

                            if (!email) {
                                alert("이메일 정보를 가져올 수 없습니다.");
                                return;
                            }

                            // Check if user already exists
                            const existingUsers = await db.getUsers();
                            let targetUser = existingUsers.find(u => u.email === email);

                            if (!targetUser) {
                                // New user
                                const defaultNickname = email.split('@')[0];
                                const tempUser: User = {
                                    id: 'kakao_' + Date.now(),
                                    email,
                                    nickname: defaultNickname,
                                    gender, // Will be updated if needed
                                    role: UserRole.USER,
                                    credits: 50,
                                    signupProvider: 'kakao'
                                };

                                if (email === SUPERVISOR_EMAIL) {
                                    tempUser.role = UserRole.ADMIN;
                                    tempUser.credits = 999;
                                }

                                // If no gender info from Kakao, show selection modal
                                if (!hasGenderInfo) {
                                    setPendingUser(tempUser);
                                    setShowGenderSelectModal(true);
                                    setShowLoginModal(false);
                                } else {
                                    // Has gender info, save directly
                                    try {
                                        await db.saveUser(tempUser);
                                        await db.recordNewUser(); // Record new user stat
                                        // CHECK REFERRAL
                                        const refCode = sessionStorage.getItem('referral_code');
                                        if (refCode) {
                                            try {
                                                const referrerId = atob(refCode);
                                                await db.processReferral(referrerId, tempUser.id);
                                                sessionStorage.removeItem('referral_code');
                                                console.log('🎁 Referral processed for:', referrerId);
                                            } catch (e) {
                                                console.error('Referral processing failed', e);
                                            }
                                        }

                                        console.log('✨ New Kakao user registered:', email);
                                        setUser(tempUser);
                                        localStorage.setItem('currentUser', JSON.stringify(tempUser));
                                        setShowLoginModal(false);
                                        setShowWelcomeModal(true); // Trigger Welcome Modal
                                        window.location.hash = '#/';
                                    } catch (error) {
                                        setShowBannedModal(true);
                                    }
                                }
                            } else {
                                // 1. Check Banned
                                if (targetUser.status === 'banned') {
                                    setShowBannedModal(true);
                                    return; // Kakao login modal might stay open, or we force close
                                }

                                // 2. Check Deleted (Reactivation)
                                if (targetUser.status === 'deleted') {
                                    console.log('♻️ Reactivating withdrawn user (Kakao):', email);
                                    targetUser.status = 'active';
                                    targetUser.deletedAt = undefined;
                                    await db.saveUser(targetUser);
                                    alert("계정이 복구되었습니다. 환영합니다!");
                                }

                                // Existing user - ensure nickname exists
                                if (!targetUser.nickname) {
                                    targetUser.nickname = targetUser.email.split('@')[0];
                                    await db.saveUser(targetUser);
                                }
                                console.log('👋 Welcome back (Kakao):', email);

                                setUser(targetUser);
                                localStorage.setItem('currentUser', JSON.stringify(targetUser));
                                setShowLoginModal(false);
                                window.location.hash = '#/';
                            }
                        },
                        fail: (err: any) => {
                            console.error('Kakao User Info Error:', err);
                            alert("카카오 사용자 정보 요청 실패");
                        }
                    });
                } catch (e) {
                    console.error('Kakao Login Success Error:', e);
                }
            },
            fail: (err: any) => {
                console.error('Kakao Login Error:', err);
                alert("카카오 로그인 실패");
            },
        });
    };

    const handleManualEmailLogin = async () => {
        if (!manualLoginEmail || !manualLoginEmail.includes('@')) {
            alert("유효한 이메일을 입력해주세요.");
            return;
        }
        setLoginLoading(true);

        // Sanitize
        const email = manualLoginEmail.trim().toLowerCase();

        try {
            const users = await db.getUsers();
            let targetUser = users.find(u => u.email === email);

            if (!targetUser) {
                // Create New User (Test Mode)
                // Ask for gender via modal logic? 
                // Creating temp user
                const defaultNickname = email.split('@')[0];
                const tempUser: User = {
                    id: 'test_' + Date.now(),
                    email: email,
                    nickname: defaultNickname,
                    gender: Gender.UNISEX, // Default, will ask if we triggers modal
                    role: UserRole.USER,
                    credits: 50,
                    signupProvider: 'email_test',
                    createdAt: new Date().toISOString()
                };

                if (email === SUPERVISOR_EMAIL) {
                    tempUser.role = UserRole.ADMIN;
                    tempUser.credits = 999;
                }

                // Show Gender Selection Implementation
                setPendingUser(tempUser);
                setShowGenderSelectModal(true);
                setShowLoginModal(false);
                setLoginLoading(false);
                return;
            }

            // Existing User Logic
            if (targetUser.status === 'banned') {
                setShowBannedModal(true);
                setLoginLoading(false);
                return;
            }

            if (targetUser.status === 'deleted') {
                targetUser.status = 'active';
                targetUser.deletedAt = undefined;
                targetUser.withdrawalReason = undefined;
                await db.saveUser(targetUser);
                alert("계정이 복구되었습니다.");
            }

            setUser(targetUser);
            localStorage.setItem('currentUser', JSON.stringify(targetUser));
            setShowLoginModal(false);
            setLoginLoading(false);
            window.location.hash = '#/';
            alert(`테스트 로그인 성공: ${targetUser.nickname}`);

        } catch (e) {
            console.error(e);
            alert("로그인 중 오류 발생");
            setLoginLoading(false);
        }
    };

    const handleSpecificTestLogin = async (email: string, gender: Gender, credits: number) => {
        // Optimized: Use direct email lookup
        let targetUser = await db.getUserByEmail(email);

        if (!targetUser) {
            targetUser = {
                id: 'test_' + Date.now(),
                email,
                gender,
                role: UserRole.USER,
                credits
            };
            try {
                await db.saveUser(targetUser);
                // CHECK REFERRAL
                const refCode = sessionStorage.getItem('referral_code');
                if (refCode) {
                    try {
                        const referrerId = atob(refCode);
                        await db.processReferral(referrerId, targetUser.id);
                        sessionStorage.removeItem('referral_code');
                        console.log('🎁 Referral processed (Test Specific) for:', referrerId);
                    } catch (e) {
                        console.error('Referral processing failed', e);
                    }
                }
            } catch (error) {
                setShowBannedModal(true);
                return;
            }
        }

        setUser(targetUser);
        localStorage.setItem('currentUser', JSON.stringify(targetUser));
        setShowLoginModal(false);
        window.location.hash = '#/';
    };

    const handleTestLogin = async (gender: Gender, role: UserRole = UserRole.USER) => {
        const email = role === UserRole.ADMIN ? 'admin@test.com' : `test_${gender === Gender.MALE ? 'man' : 'woman'}@test.com`;

        // Check if user exists in DB to reuse ID and avoid 409 Conflict
        // Optimized: Use single user lookup
        let targetUser = await db.getUserByEmail(email);

        if (!targetUser) {
            targetUser = {
                id: `test_${role}_${Date.now()}`,
                email,
                gender,
                role,
                credits: role === UserRole.ADMIN ? 999 : 50
            };
        } else {
            // Force update role/credits even if exists, for consistent testing state
            targetUser = { ...targetUser, role, credits: role === UserRole.ADMIN ? 999 : 50 };
        }

        try {
            await db.saveUser(targetUser);

            // CHECK REFERRAL
            const refCode = sessionStorage.getItem('referral_code');
            if (refCode) {
                try {
                    const referrerId = atob(refCode);
                    await db.processReferral(referrerId, targetUser.id);
                    sessionStorage.removeItem('referral_code');
                    console.log('🎁 Referral processed (Test) for:', referrerId);
                } catch (e) {
                    console.error('Referral processing failed', e);
                }
            }

            setUser(targetUser);
            localStorage.setItem('currentUser', JSON.stringify(targetUser));
        } catch (error) {
            console.error("Test login failed:", error);
            setShowBannedModal(true);
            return;
        }
        setShowLoginModal(false);
        window.location.hash = '#/';
    };

    const handleGenderSelect = async (selectedGender: Gender) => {
        if (!pendingUser) return;
        setLoginLoading(true); // Start loading

        const finalUser = { ...pendingUser, gender: selectedGender };

        try {
            // 1. Critical: Save User
            await db.saveUser(finalUser);

            // 2. Non-blocking: Record Stats & Process Referral
            // Fire and forget to ensure UI is snappy
            db.recordNewUser().catch(e => console.error("Stats Error:", e));

            const refCode = sessionStorage.getItem('referral_code');
            if (refCode) {
                const referrerId = atob(refCode);
                db.processReferral(referrerId, finalUser.id)
                    .then(() => {
                        sessionStorage.removeItem('referral_code');
                        console.log('🎁 Referral processed (background) for:', referrerId);
                    })
                    .catch(e => console.error('Referral processing failed', e));
            }

            console.log('✨ New user registered:', finalUser.email, '- 50 credits awarded!');
            setUser(finalUser);
            localStorage.setItem('currentUser', JSON.stringify(finalUser));
            setShowGenderSelectModal(false);
            setPendingUser(null);
            setShowWelcomeModal(true); // Trigger Welcome Modal
            window.location.hash = '#/';
        } catch (error) {
            setShowBannedModal(true);
            setShowGenderSelectModal(false);
            setPendingUser(null);
        } finally {
            setLoginLoading(false); // Stop loading
        }
    };

    const handleOpenTestAccountModal = async () => {
        setLoginLoading(true);
        try {
            const users = await db.getUsers();
            // Sort by CreatedAt desc
            users.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setTestAccounts(users);
            setShowTestAccountModal(true);
            setShowLoginModal(false);
        } catch (error) {
            console.error("Failed to fetch users:", error);
            alert("사용자 목록을 불러오지 못했습니다.");
        } finally {
            setLoginLoading(false);
        }
    };

    const handleTestAccountLogin = (selectedUser: User) => {
        setUser(selectedUser);
        localStorage.setItem('currentUser', JSON.stringify(selectedUser));

        // Load bookmarks
        if (selectedUser.id) {
            db.getBookmarks(selectedUser.id).then(ids => setBookmarks(new Set(ids)));
        }

        setShowTestAccountModal(false);
        window.location.hash = '#/';
        console.log('🧪 Test Login:', selectedUser.email);
    };

    // Deep Link Fetcher: If we are at #/toilet/:id but don't have the toilet data (e.g. far away), fetch it.
    useEffect(() => {
        if (currentHash.startsWith('#/toilet/')) {
            const toiletId = currentHash.split('/toilet/')[1];
            // Check if we already have it in the main list
            const builtIn = toilets.find(t => t.id === toiletId);

            if (!builtIn) {
                // Not found locally (maybe out of radius), fetch it specially
                console.log("🔍 Toilet not in current map view, fetching specific:", toiletId);
                db.getToiletsByIds([toiletId]).then(results => {
                    if (results && results.length > 0) {
                        setFetchedToilet(results[0]);
                    } else {
                        console.log("❌ Failed to fetch specific toilet or not found");
                    }
                });
            } else {
                // We have it, clear fetched to save memory/avoid confusion
                setFetchedToilet(null);
            }
        }
    }, [currentHash, toilets]);

    // State for Contact Modal (to disable Bottom Nav)
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    // State for Detail Page Modal (to disable Bottom Nav)


    const CurrentPage = (() => {
        // If Hash is empty or #/, show Home. No Login Page as default.
        if (currentHash === '' || currentHash === '#/') {
            return (
                <HomePage
                    user={user}
                    myLocation={myLocation}
                    filteredToilets={filteredToilets}
                    onToiletClick={handleToiletClick}
                    onFetchNewArea={fetchToiletsInRadius}
                    initialMapState={lastMapState}
                    onMapChange={setLastMapState}
                    darkMode={darkMode}
                    onLoginRequired={() => setShowLoginModal(true)}
                    showList={isHomeListOpen}
                    onToggleList={setIsHomeListOpen}
                />
            );
        }
        if (currentHash.startsWith('#/toilet')) {
            const toiletId = currentHash.split('/toilet/')[1];
            const toilet = toilets.find(t => t.id === toiletId) || fetchedToilet;

            if (!toilet) {
                // If still loading specific toilet?
                // Simple fallback:
                return <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p>화장실 정보를 불러오는 중입니다...</p>
                </div>;
            }
            return (
                <DetailPage
                    user={user}
                    toilet={toilet}
                    myLocation={myLocation}
                    bookmarks={bookmarks}
                    unlockedToilets={unlockedToilets}
                    onBack={() => {
                        if (window.history.state || window.history.length > 1) {
                            window.history.back();
                        } else {
                            window.location.hash = '#/';
                        }
                    }}
                    onBookmark={(id) => toggleBookmark(id)}
                    onUnlock={(method) => handleUnlock(toilet.id, method)}
                    onShowLogin={() => setShowLoginModal(true)}
                    onRefresh={() => setRefreshTrigger(prev => prev + 1)}
                    onUserUpdate={setUser}
                    darkMode={darkMode}
                    requestAd={requestAd}
                    onModalStateChange={setIsDetailModalOpen}
                />
            );
        }
        if (currentHash === '#/my') {
            return (
                <MyPage
                    user={user}
                    toilets={toilets}
                    bookmarks={bookmarks}
                    onToiletClick={handleToiletClick}
                    onLogout={() => { setUser(INITIAL_USER); localStorage.removeItem('currentUser'); window.location.hash = '#/'; }}
                    onLoginRequest={() => setShowLoginModal(true)}
                    onAdRequest={() => { setAdRewardType('credit'); setShowAd(true); }}
                    onUserUpdate={setUser}
                    darkMode={darkMode}
                    onToggleDarkMode={toggleDarkMode}
                    onContactModalChange={setIsContactModalOpen}
                />
            );
        }



        if (currentHash === '#/submit') {
            return (
                <SubmitPage
                    user={user}
                    myLocation={myLocation}
                    toilets={toilets}
                    onUserUpdate={setUser}
                    onSubmitSuccess={() => setRefreshTrigger(prev => prev + 1)}
                    onShowLogin={() => setShowLoginModal(true)}
                    darkMode={darkMode}
                    onMapModeChange={setIsSubmitMapOpen}
                />

            );
        }
        if (currentHash.startsWith('#/edit/')) {
            const editId = currentHash.split('/edit/')[1];
            return (
                <SubmitPage
                    user={user}
                    editId={editId}
                    myLocation={myLocation}
                    toilets={toilets}
                    onUserUpdate={setUser}
                    onSubmitSuccess={() => setRefreshTrigger(prev => prev + 1)}
                    onShowLogin={() => setShowLoginModal(true)}
                    darkMode={darkMode}
                    onMapModeChange={setIsSubmitMapOpen}
                />
            );
        }

        if (currentHash === '#/admin/users/withdrawn') {
            return (
                <WithdrawnUsersPage
                    onBack={() => window.location.hash = '#/admin'}
                />
            );
        }
        if (currentHash.startsWith('#/admin/users/')) {
            const userId = currentHash.split('/users/')[1];
            return (
                <UserDetailPage
                    userId={userId}
                    onBack={() => window.history.back()}
                />
            );
        }
        if (currentHash.startsWith('#/admin')) {
            return user.role === UserRole.ADMIN ? (
                <AdminPage user={user} setUser={setUser} refreshTrigger={refreshTrigger} setRefreshTrigger={setRefreshTrigger} />
            ) : (
                <HomePage
                    user={user}
                    myLocation={myLocation}
                    filteredToilets={filteredToilets}
                    onToiletClick={handleToiletClick}
                    onFetchNewArea={fetchToiletsInRadius}
                    initialMapState={lastMapState}
                    onMapChange={setLastMapState}
                    darkMode={darkMode}
                    onLoginRequired={() => setShowLoginModal(true)}
                    showList={isHomeListOpen}
                    onToggleList={setIsHomeListOpen}
                />
            );
        }
        if (currentHash === '#/terms') {
            return <TermsOfService />;
        }
        if (currentHash === '#/privacy') {
            return <PrivacyPolicy />;
        }
        if (currentHash === '#/test/photo-reg') {
            return <PhotoTestPage user={user} darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />;
        }
        if (currentHash === '#/guide') {
            return <UsageGuidePage />;
        }
        if (currentHash === '#/guide/credit') {
            return <CreditGuide />;
        }
        if (currentHash === '#/guide/registration') {
            return <RegistrationGuide />;
        }
        if (currentHash === '#/notifications') {
            return <NotificationPage />;
        }

        // Default Route (Home) - Checks for #/toilet/:id pattern to deep link
        let targetToiletId = null;
        if (currentHash.startsWith('#/toilet/')) {
            targetToiletId = currentHash.split('#/toilet/')[1];
        }

        return (
            <HomePage
                user={user}
                myLocation={myLocation}
                filteredToilets={filteredToilets}
                onToiletClick={handleToiletClick}
                onFetchNewArea={fetchToiletsInRadius}
                initialMapState={lastMapState}
                onMapChange={setLastMapState}
                darkMode={darkMode}
                onLoginRequired={() => setShowLoginModal(true)}
                showList={isHomeListOpen}
                onToggleList={setIsHomeListOpen}
                targetToiletId={targetToiletId}
            />
        );
    })();

    return (
        <GoogleMapsProvider>
            <div className={`w-full h-[100dvh] overflow-hidden flex flex-col font-sans relative ${darkMode && !currentHash.startsWith('#/admin') ? 'dark bg-gray-900' : 'bg-white'}`}>
                {/* SPLASH SCREEN */}
                {showSplash && (
                    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary-400 to-primary-600 flex flex-col items-center justify-center text-white">
                        <div className="flex flex-col items-center animate-bounce-slow mb-6">
                            {!splashImgError ? (
                                <img
                                    src="/images/app/ddong-icon.png"
                                    alt="대똥단결"
                                    className="w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 object-contain drop-shadow-xl"
                                    onError={() => setSplashImgError(true)}
                                />
                            ) : (
                                <div className="w-32 h-32 md:w-48 md:h-48 lg:w-64 lg:h-64 flex items-center justify-center">
                                    <PoopIcon className="w-24 h-24 md:w-36 md:h-36 lg:w-48 lg:h-48 text-primary-500" />
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-widest drop-shadow-md mb-3">대똥단결</h1>
                        <p className="text-lg md:text-2xl font-bold opacity-90 tracking-tight">급똥으로 대동단결</p>
                        <div className="absolute bottom-10 text-xs font-medium opacity-60">
                            © Q, Jung
                        </div>
                    </div>
                )}

                <div className="flex-1 w-full relative h-full">{!showSplash && CurrentPage}</div>


                {!currentHash.includes('admin') && !showSplash && !showAd && !isDetailModalOpen && (
                    <>
                        {/* Main Screen & Detail Page & Submit Page & My Page Bottom Banner Ad */}
                        {(currentHash === '#/' || currentHash === '' || currentHash.startsWith('#/toilet/') || currentHash.startsWith('#/submit') || currentHash.startsWith('#/edit/') || currentHash === '#/my') && (
                            <div key={adKey} className={`fixed left-0 right-0 z-[990] flex justify-center pointer-events-none transition-all duration-300 animate-in slide-in-from-bottom-48 duration-500 ${isSubmitMapOpen ? 'bottom-[calc(env(safe-area-inset-bottom)+10px)]' : 'bottom-[calc(env(safe-area-inset-bottom)+90px)]'}`}>
                                <div className="pointer-events-auto w-full max-w-md overflow-hidden">
                                    <AdBanner position="bottom" maxHeight={64} minRatio={4.0} className="w-full h-full shadow-lg" />
                                </div>
                            </div>
                        )}

                        {!isSubmitMapOpen && (
                            <nav className="fixed bottom-0 left-0 right-0 h-auto bg-surface dark:bg-surface-dark border-t border-border dark:border-border-dark z-[999] flex justify-center pb-[calc(env(safe-area-inset-bottom)+20px)]">
                                <div className="w-full max-w-md flex justify-around items-center px-2">
                                    <button onClick={() => window.location.hash = '#/'} className={`flex flex-col items-center p-2 ${currentHash === '#/' ? 'text-primary-500' : 'text-text-muted'}`}><MapPin className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">홈</span></button>
                                    <button
                                        onClick={() => {
                                            if (currentHash.startsWith('#/submit') || isContactModalOpen || isDetailModalOpen) return; // Disable if on submit page or contact modal open
                                            if (user.role === UserRole.GUEST) {
                                                setShowLoginModal(true);
                                            } else {
                                                window.location.hash = '#/submit';
                                            }
                                        }}
                                        className={`flex flex-col items-center p-2 -mt-8 relative ${user.role === UserRole.GUEST || currentHash.startsWith('#/submit') || isContactModalOpen || isDetailModalOpen ? 'cursor-not-allowed' : 'cursor-pointer'
                                            }`}
                                    >
                                        <div className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white ring-4 ring-gray-200 dark:ring-gray-700 transition-all ${user.role === UserRole.GUEST || currentHash.startsWith('#/submit') || isContactModalOpen || isDetailModalOpen
                                            ? 'bg-text-muted opacity-50'
                                            : 'bg-urgency hover:bg-urgency-500 active:scale-95'
                                            }`}>
                                            <Plus className="w-8 h-8 drop-shadow-md" />
                                        </div>
                                        <span className={`text-[10px] font-bold mt-2 ${user.role === UserRole.GUEST || currentHash.startsWith('#/submit') || isContactModalOpen || isDetailModalOpen ? 'text-text-muted' : 'text-urgency'
                                            }`}>등록</span>
                                        {(user.role === UserRole.GUEST || currentHash.startsWith('#/submit') || isContactModalOpen || isDetailModalOpen) && (
                                            <div className="absolute inset-0 bg-transparent" />
                                        )}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (user.role === UserRole.GUEST) {
                                                setShowLoginModal(true);
                                            } else {
                                                window.location.hash = '#/my';
                                            }
                                        }}
                                        className={`flex flex-col items-center p-2 ${currentHash === '#/my' ? 'text-primary-500' : 'text-text-muted'}`}
                                    >
                                        <UserIcon className="w-6 h-6" /><span className="text-[10px] font-bold mt-1">내 정보</span>
                                    </button>
                                </div>
                            </nav>
                        )}
                    </>
                )}

                {/* Reward Success Modal */}
                {rewardSuccessModal.show && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                            {/* Background Decoration */}
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <circle cx="20" cy="20" r="5" fill="#FBBF24"></circle>
                                    <circle cx="80" cy="30" r="7" fill="#3B82F6"></circle>
                                    <rect x="40" y="60" width="8" height="8" fill="#EF4444" transform="rotate(45 44 64)"></rect>
                                </svg>
                            </div>

                            <div className="relative z-10">
                                {/* Icon */}
                                <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-yellow-50 dark:ring-yellow-900/20">
                                    <Gift className="w-10 h-10 text-yellow-600 dark:text-yellow-500 fill-yellow-500" />
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                                    광고 시청 완료!<br />
                                    크래딧이 지급되었습니다.
                                </h3>

                                <div className="my-6">
                                    <span className="text-3xl font-black text-amber-500 flex items-center justify-center gap-1 drop-shadow-sm">
                                        +{rewardSuccessModal.amount} <span className="text-xl text-gray-400 font-bold">Credits</span>
                                    </span>
                                </div>

                                <button
                                    onClick={() => setRewardSuccessModal({ show: false, amount: 0 })}
                                    className="w-full bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/30 active:scale-95"
                                >
                                    확인
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* AD MANAGER */}
                <AdManager
                    isOpen={showAd}
                    onClose={() => setShowAd(false)}
                    onReward={handleAdReward}
                />

                {/* WELCOME MODAL */}
                <WelcomeModal open={showWelcomeModal} onClose={() => setShowWelcomeModal(false)} />

                {/* Login Notice Modal */}
                {showNoticeModal && (
                    <LoginNoticeModal
                        user={user}
                        onClose={handleCloseNotice}
                    />
                )}

                {/* TOILET SELECTION MODAL */}
                {selectionModalData.show && (
                    <div className="fixed inset-0 z-[3000] flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectionModalData({ show: false, toilets: [] })}>
                        <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            {/* Fixed Header */}
                            <div className="px-6 pt-6 pb-4 shrink-0 border-b border-border dark:border-border-dark">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xl font-bold text-text-main dark:text-text-light">화장실 선택</h3>
                                    <button onClick={() => setSelectionModalData({ show: false, toilets: [] })} className="p-2 bg-background dark:bg-background-dark rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                                        <X className="w-5 h-5 text-text-muted" />
                                    </button>
                                </div>
                                <p className="text-sm text-text-muted mb-3">이 주소에 여러 개의 화장실이 있습니다.<br />원하는 화장실을 선택해주세요.</p>
                                <div className="text-xs font-bold text-text-muted bg-background dark:bg-background-dark p-2 rounded-lg flex justify-between items-center">
                                    <span className="truncate">📍 {selectionModalData.toilets[0]?.address}</span>
                                    <span className="ml-2 shrink-0">{user.role === UserRole.GUEST ? '비회원' : (user.gender === Gender.MALE ? '남성' : (user.gender === Gender.FEMALE ? '여성' : ''))}</span>
                                </div>
                            </div>

                            {/* Scrollable List */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="p-6 space-y-3">
                                    {selectionModalData.toilets.map(t => {
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => {
                                                    setSelectionModalData({ show: false, toilets: [] });
                                                    window.location.hash = `#/toilet/${t.id}`;
                                                }}
                                                className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4 hover:bg-blue-50 dark:hover:bg-gray-700 hover:border-blue-200 dark:hover:border-gray-600 transition-all text-left"
                                            >
                                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex flex-col items-center justify-center shrink-0 border border-gray-200 dark:border-gray-600">
                                                    <span className="text-lg font-black text-gray-800 dark:text-gray-200">{t.floor}</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">층</span>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-gray-900 dark:text-white truncate">{t.name}</span>

                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span className="flex items-center gap-1">
                                                            {t.genderType === 'MALE' && <span className="text-blue-500 font-bold">남성용</span>}
                                                            {t.genderType === 'FEMALE' && <span className="text-pink-500 font-bold">여성용</span>}
                                                            {t.genderType === 'UNISEX' && <span className="text-purple-500 font-bold">공용</span>}
                                                        </span>
                                                        <span className="text-gray-300">|</span>
                                                        <span className="flex items-center gap-0.5 text-amber-500">
                                                            <Star className="w-3 h-3 fill-current" />
                                                            <span className="font-bold">{t.ratingAvg ? t.ratingAvg.toFixed(1) : '0.0'}</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <ArrowRight className="w-5 h-5 text-gray-300" />
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOGIN MODAL */}
                {showLoginModal && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
                        <div className="relative bg-surface dark:bg-surface-dark rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 max-h-[85vh] overflow-y-auto ring-1 ring-border/50">
                            {/* Close Button (X) */}
                            <button
                                onClick={() => setShowLoginModal(false)}
                                className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-main transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            <div className="flex flex-col items-center">
                                <img src="/images/app/ddong-icon.png" alt="Login Icon" className="w-24 h-24 md:w-32 md:h-32 object-contain mb-0" />
                                <h2 className="text-2xl font-black text-primary mb-3">대똥단결</h2>
                                <h3 className="text-xl font-bold text-text-main dark:text-text-light mb-2">로그인이 필요합니다</h3>

                            </div>

                            <div className="space-y-3">
                                <button onClick={performGoogleLogin} disabled={loginLoading} className="w-full py-4 bg-white border border-gray-200 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 text-gray-800 shadow-sm transition-transform active:scale-95">
                                    {loginLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="G" /> Google로 시작하기</>}
                                </button>

                                <button onClick={performNaverLogin} className="w-full py-4 bg-[#03C75A] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-transform active:scale-95">
                                    <span className="font-black text-lg">N</span> Naver로 시작하기
                                </button>

                                <button onClick={performKakaoLogin} className="w-full py-4 bg-[#FEE500] text-[#000000] rounded-2xl font-bold flex items-center justify-center gap-2 hover:opacity-90 shadow-sm transition-transform active:scale-95">
                                    <MessageSquareQuote className="w-5 h-5 fill-current" /> Kakao로 시작하기
                                </button>

                                {/* Manual Email Login (Test) */}
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-400 mb-2">테스트용 이메일 로그인</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="email"
                                            value={manualLoginEmail}
                                            onChange={(e) => setManualLoginEmail(e.target.value)}
                                            placeholder="이메일 입력"
                                            className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary"
                                        />
                                        <button
                                            onClick={handleManualEmailLogin}
                                            disabled={loginLoading}
                                            className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                                        >
                                            접속
                                        </button>
                                    </div>
                                </div>

                                {/* Test Buttons */}
                                {/* Test Buttons - Refactored to Selection Modal */}
                                {/* Test Buttons - Only show on Localhost */}
                                {(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                    <>
                                        <button onClick={handleOpenTestAccountModal} className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 shadow-sm border border-indigo-100 transition-colors flex items-center justify-center gap-2">
                                            <span className="text-xl">🧪</span> 테스트 계정 선택 (전체 목록)
                                        </button>
                                        <button onClick={() => handleTestLogin(Gender.MALE, UserRole.ADMIN)} className="w-full py-3 bg-gray-800 dark:bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-900 shadow-lg border border-transparent dark:border-gray-700">
                                            🛡️ 관리자 테스트
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Banned User Modal */}
                {showBannedModal && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                    <X className="w-8 h-8 text-red-600" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2 text-gray-900">이용이 제한된 계정입니다</h3>
                            <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">
                                해당 계정은 서비스 정책 위반으로 인해<br />
                                회원가입 및 이용이 영구적으로 제한되었습니다.
                            </p>
                            <div className="bg-blue-50 rounded-lg p-4 mb-6">
                                <p className="text-xs text-blue-800 font-medium text-center">
                                    📧 문의사항은 아래 이메일로 연락해주세요
                                </p>
                                <p className="text-sm font-bold text-blue-600 text-center mt-2">
                                    qseek77@gmail.com
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowBannedModal(false);
                                    setShowLoginModal(false);
                                }}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                )}

                {/* Gender Selection Modal */}
                {showGenderSelectModal && pendingUser && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <div className="bg-surface dark:bg-surface-dark rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in ring-1 ring-border/50">
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                                    <UserIcon className="w-8 h-8 text-primary" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-center mb-2 text-text-main dark:text-text-light">성별을 선택해주세요</h3>
                            <p className="text-sm text-text-muted text-center mb-6 leading-relaxed">
                                더 나은 화장실 정보를 제공하기 위해<br />
                                성별을 선택해주세요.
                            </p>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <button
                                    onClick={() => handleGenderSelect(Gender.MALE)}
                                    disabled={loginLoading}
                                    className={`py-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl font-bold text-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex flex-col items-center gap-2 ${loginLoading ? 'opacity-70 cursor-not-allowed scale-100' : ''}`}
                                >
                                    {loginLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-3xl">👨</span>
                                            남성
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => handleGenderSelect(Gender.FEMALE)}
                                    disabled={loginLoading}
                                    className={`py-6 bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-pink-600 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex flex-col items-center gap-2 ${loginLoading ? 'opacity-70 cursor-not-allowed scale-100' : ''}`}
                                >
                                    {loginLoading ? (
                                        <Loader2 className="w-8 h-8 animate-spin" />
                                    ) : (
                                        <>
                                            <span className="text-3xl">👩</span>
                                            여성
                                        </>
                                    )}
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 text-center">
                                회원가입 완료 시 50 크레딧이 지급됩니다 🎁
                            </p>
                        </div>
                    </div>
                )}

                {/* Test Account Selection Modal */}
                {showTestAccountModal && (
                    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-lg shadow-2xl animate-in zoom-in ring-1 ring-border/50 flex flex-col max-h-[80vh]">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-3xl">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                        <span>🧪</span> 테스트 계정 선택
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-1">클릭하면 해당 계정으로 즉시 로그인됩니다.</p>
                                </div>
                                <button
                                    onClick={() => { setShowTestAccountModal(false); setShowLoginModal(true); }}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">Email / ID</th>
                                            <th scope="col" className="px-6 py-3">Nickname</th>
                                            <th scope="col" className="px-6 py-3 text-right">Credits</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {testAccounts.map((account) => (
                                            <tr
                                                key={account.id}
                                                onClick={() => handleTestAccountLogin(account)}
                                                className="bg-white dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 cursor-pointer transition-colors group"
                                            >
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span>{account.email}</span>
                                                        <span className="text-[10px] text-gray-400 font-normal">{account.role}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                                                    {account.nickname || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-bold ${account.credits > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                                                        {account.credits.toLocaleString()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {testAccounts.length === 0 && (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-10 text-center text-gray-400">
                                                    계정이 없습니다.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Login Notice Modal (Queue) */}
                {user.loginNotices && user.loginNotices.length > 0 && (
                    <LoginNoticeModal
                        user={user}
                        onClose={(updatedUser) => {
                            setUser(updatedUser);
                            // No need to save to LS/DB here as component handles it, just update local state to refresh UI
                        }}
                    />
                )}
            </div>
        </GoogleMapsProvider>
    );
}