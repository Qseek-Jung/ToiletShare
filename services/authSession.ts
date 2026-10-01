import { supabase } from './supabase';

export type SocialProvider = 'kakao' | 'naver' | 'google' | 'apple';

/**
 * Exchange a social login token for a Supabase Auth session.
 * The token is verified server-side by the `social-auth` Edge Function,
 * so the session email cannot be spoofed by the client.
 *
 * Step 1 (non-blocking): failures are logged and never break the existing login.
 */
export async function establishSupabaseSession(provider: SocialProvider, token?: string | null): Promise<boolean> {
    if (!token) {
        console.warn(`[auth] No ${provider} token available for Supabase session`);
        return false;
    }
    try {
        const { data, error } = await supabase.functions.invoke('social-auth', {
            body: { provider, token },
        });
        if (error || !data?.token_hash) {
            console.warn('[auth] social-auth failed:', error?.message || data?.error);
            return false;
        }

        const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: 'magiclink',
        });
        if (otpError) {
            console.warn('[auth] verifyOtp failed:', otpError.message);
            return false;
        }

        await linkAuthUser();
        return true;
    } catch (e) {
        console.warn('[auth] establishSupabaseSession error:', e);
        return false;
    }
}

/** Link the current Auth session to the matching public.users row (by verified email). */
export async function linkAuthUser(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        const { data, error } = await supabase.rpc('link_auth_user');
        if (error) {
            console.warn('[auth] link_auth_user failed:', error.message);
            return null;
        }
        return data ?? null;
    } catch (e) {
        console.warn('[auth] linkAuthUser error:', e);
        return null;
    }
}

export async function signOutSupabase(): Promise<void> {
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.warn('[auth] signOut error:', e);
    }
}
