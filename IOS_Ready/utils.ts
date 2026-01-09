/**
 * Masks email address for privacy protection
 * Shows first 3 characters, replaces rest with asterisks, removes domain
 * @param email - Full email address
 * @returns Masked email ID (e.g., "hon****" from "hong123@test.com")
 */
export const maskEmail = (email: string): string => {
    if (!email) return '';

    // Extract ID part (before @)
    const emailId = email.split('@')[0];

    if (emailId.length <= 3) {
        // If ID is 3 chars or less, show all and add asterisks
        return emailId + '*****';
    }

    // Show first 3 chars, replace rest with asterisks
    const visiblePart = emailId.substring(0, 3);
    const maskedPart = '*'.repeat(emailId.length - 3);

    return visiblePart + maskedPart;
};

/**
 * Get display name from user
 * Priority: nickname > masked email
 * @param userOrEmail - User object or email string
 * @param isAdmin - If true, shows full email ID without masking
 * @returns Display name
 */
export const getDisplayName = (userOrEmail: any, isAdmin: boolean = false): string => {
    if (!userOrEmail) return '익명';

    // If it's a User object with nickname, use it
    if (typeof userOrEmail === 'object' && userOrEmail.nickname) {
        return userOrEmail.nickname;
    }

    // Extract email from User object or use string directly
    const email = typeof userOrEmail === 'object' ? userOrEmail.email : userOrEmail;
    if (!email) return '익명';

    if (isAdmin) {
        // Admin view: show full email ID
        return email.split('@')[0];
    }

    // Regular view: show masked email
    return maskEmail(email);
};

// --- Map & Toilet Helpers ---

import { Toilet, Gender, UserRole, User } from './types';

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Radius of the earth in meters
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
};

const deg2rad = (deg: number): number => {
    return deg * (Math.PI / 180);
};

/**
 * Compare two semantic version strings (e.g., "1.0.1", "1.0.2")
 * Returns:
 *  1 if v1 > v2
 * -1 if v1 < v2
 *  0 if v1 === v2
 */
export const compareVersions = (v1: string, v2: string): number => {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
};


export const formatDistance = (meters: number) => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
    return `${Math.round(meters)}m`;
};

export const getToiletCategoryName = (type: Toilet['type'], isPrivate?: boolean) => {
    if (type === 'user_registered') {
        return isPrivate ? '내 화장실' : '사용자 공유';
    }
    switch (type) {
        case 'public': return '공공';
        case 'commercial': return '상가';
        case 'subway_station': return '지하철';
        case 'train_station': return '기차역';
        case 'bus_terminal': return '터미널';
        case 'park': return '공원';
        case 'gas_station': return '주유소';
        case 'hospital': return '병원';
        case 'culture': return '문화시설';
        default: return '기타';
    }
};

/**
 * Maps Google Places API types to internal Toilet types
 * @param googleTypes Array of types from Google Places API
 * @returns Mapped ToiletType or undefined if no match
 */
export const mapGoogleTypeToInternalType = (googleTypes: string[]): Toilet['type'] | undefined => {
    if (!googleTypes || googleTypes.length === 0) return undefined;

    const typeSet = new Set(googleTypes);

    if (typeSet.has('subway_station') || typeSet.has('light_rail_station')) return 'subway_station';
    if (typeSet.has('train_station') || typeSet.has('transit_station')) return 'train_station';
    if (typeSet.has('bus_station')) return 'bus_terminal';
    if (typeSet.has('park') || typeSet.has('campground')) return 'park';
    if (typeSet.has('gas_station')) return 'gas_station';
    if (typeSet.has('hospital') || typeSet.has('doctor') || typeSet.has('pharmacy') || typeSet.has('health')) return 'hospital';
    if (typeSet.has('library') || typeSet.has('museum') || typeSet.has('art_gallery') || typeSet.has('university') || typeSet.has('school')) return 'culture';

    // Commercial is broad, checking last
    if (typeSet.has('restaurant') || typeSet.has('cafe') || typeSet.has('shopping_mall') || typeSet.has('store') || typeSet.has('department_store') || typeSet.has('food')) return 'commercial';

    if (typeSet.has('local_government_office') || typeSet.has('city_hall') || typeSet.has('police')) return 'public';

    return undefined;
};

export const getMarkerSvg = (gender: Gender, color: string, opacity: number = 1) => {
    const manPath = `<circle cx="12" cy="7" r="2.5" fill="white" stroke="white" stroke-width="0.5"/><path d="M7 12 C7 10 17 10 17 12 L17 18 C17 19 16 20 15 20 L14 20 L14 23 C14 24 13 24 13 23 L13 20 L11 20 L11 23 C11 24 10 24 10 23 L10 20 L9 20 C8 20 7 19 7 18 Z" fill="none" stroke="white" stroke-width="1.5" />`;
    const womanPath = `<circle cx="12" cy="7" r="2.5" fill="white" stroke="white" stroke-width="0.5"/><path d="M12 10 L8 20 L16 20 Z" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round" /><line x1="12" y1="20" x2="12" y2="23" stroke="white" stroke-width="1.5" />`;
    let content = '';
    if (gender === Gender.MALE) content = `<g transform="translate(6.8, 5) scale(1.1)">${manPath}</g>`;
    else if (gender === Gender.FEMALE) content = `<g transform="translate(6.8, 5) scale(1.1)">${womanPath}</g>`;
    else content = `<g transform="translate(0, 6) scale(0.9)">${manPath}</g><g transform="translate(14, 6) scale(0.9)">${womanPath}</g><line x1="20" y1="10" x2="20" y2="24" stroke="white" stroke-width="1" opacity="0.5" />`;
    const svg = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" opacity="${opacity}"><defs><filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.3"/></filter></defs><g filter="url(#shadow)"><path d="M20 40 C20 40 5 25 5 17.5 C5 9.2 11.7 2.5 20 2.5 C28.3 2.5 35 9.2 35 17.5 C35 25 20 40 20 40 Z" fill="${color}" stroke="white" stroke-width="1.5"/>${content}</g></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
};

export const getToiletColor = (t: Toilet, userRole: UserRole, isNearest: boolean) => {
    const isGuest = userRole === UserRole.GUEST;
    const isUserReg = t.source === 'user' || t.type === 'user_registered';

    // Custom Check for Admin/VIP Access
    const isAdminOrVIP = t.creatorRole === UserRole.ADMIN || t.creatorRole === UserRole.VIP;
    const isPublicData = t.source === 'admin' || t.createdBy === 'admin';
    const isAccessAllowed = (isPublicData || isAdminOrVIP) && !t.hasPassword;

    // 1. Guest & (User Registered OR Password Protected) -> Grey (Dimmed)
    // EXCEPTION: Admin/VIP No Password -> Green (Standard)
    if (isGuest && !isAccessAllowed) {
        if (isUserReg || t.hasPassword) return { color: '#9CA3AF', className: 'bg-gray-400' };
    }

    // 2. Member & Nearest -> Red
    if (!isGuest && isNearest) return { color: '#EF4444', className: 'bg-red-500' };

    // 3. User Registered -> Orange
    if (isUserReg) return { color: '#F59E0B', className: 'bg-amber-500' };

    // 4. Default (Public/Admin) -> Green
    return { color: '#10B981', className: 'bg-green-500' };
};

export const getMarkerImage = (t: Toilet, userRole: UserRole, isNearest: boolean): string => {
    const isGuest = userRole === UserRole.GUEST;
    const isUserReg = t.source === 'user' || t.type === 'user_registered';
    const hasPassword = t.hasPassword;
    const gender = t.genderType;

    // 0. Define Access Logic
    // 0. Define Access Logic
    // Fix: Use 'source' OR 'creatorRole' to identify Admin/VIP public toilets
    const isAdminOrVIP = t.creatorRole === UserRole.ADMIN || t.creatorRole === UserRole.VIP;
    const isPublicData = t.source === 'admin' || t.createdBy === 'admin';
    const isAccessAllowed = (isPublicData || isAdminOrVIP) && !hasPassword;

    // GUEST LOGIC
    if (isGuest) {
        // Policy A: Admin/VIP & No Password -> Normal Access (Show Normal Pin)
        if (isAccessAllowed) {
            // Fall through to Standard Logic (Normal Pin)
        }
        // Policy B: Restricted (Admin & Password OR User & Shared) -> Show Gray Pin
        else {
            if (gender === Gender.MALE) return '/images/pins/Non_member_man_pin.png';
            if (gender === Gender.FEMALE) return '/images/pins/Non-member_woman__pin.png';
            return '/images/pins/Non-member_uni__pin.png';
        }
    }

    // 2. Standard Logic (Member OR Guest Allowed)
    let prefix = 'uni';
    if (gender === Gender.MALE) prefix = 'man';
    else if (gender === Gender.FEMALE) prefix = 'woman';

    const lockPart = hasPassword ? '_lock' : '';
    const nearPart = isNearest ? '_near' : '';

    // Special Case: Normal Pin (No Near, No Lock) -> Double Underscore (e.g. man__pin.png)
    if (!lockPart && !nearPart) {
        return `/images/pins/${prefix}__pin.png`;
    }

    // Other Cases: Single Underscore pattern (e.g. man_near_pin.png, man_lock_pin.png, man_near_lock_pin.png)
    return `/images/pins/${prefix}${nearPart}${lockPart}_pin.png`;
};

export const formatDate = (timestamp?: string | number): string => {
    if (!timestamp) return '-';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

/**
 * Simple formatDistanceToNow implementation
 * @param date - Date object
 * @returns Human readable distance (e.g., "방금 전", "5분 전")
 */
export const formatDistanceToNow = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return '방금 전';

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}시간 전`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}일 전`;

    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};
