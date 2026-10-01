// social-auth: verifies a social login token server-side and returns a
// one-time token_hash the client exchanges for a Supabase session
// (supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })).
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Public OAuth client IDs (not secrets) — the ID token audience must match one of these.
const GOOGLE_CLIENT_IDS: string[] = [
    "889382704312-28t3jni1q6qtsv3qo690ievb3u74v0n3.apps.googleusercontent.com",
    "889382704312-kqfbm68u4c55f06lfn3sasc2aiiv3ceb.apps.googleusercontent.com"
];
const APPLE_AUDIENCES = ["com.toilet.korea", "com.toiletshare.app"];
const appleJwks = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

type Provider = "kakao" | "naver" | "google" | "apple";

const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
);

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function verifiedEmail(provider: Provider, token: string): Promise<string | null> {
    switch (provider) {
        case "kakao": {
            const res = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return null;
            const data = await res.json();
            return data?.kakao_account?.email ?? null;
        }
        case "naver": {
            const res = await fetch("https://openapi.naver.com/v1/nid/me", { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) return null;
            const data = await res.json();
            return data?.resultcode === "00" ? data.response?.email ?? null : null;
        }
        case "google": {
            const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (!GOOGLE_CLIENT_IDS.includes(data.aud)) return null;
            if (data.email_verified !== "true" && data.email_verified !== true) return null;
            return data.email ?? null;
        }
        case "apple": {
            const { payload } = await jwtVerify(token, appleJwks, {
                issuer: "https://appleid.apple.com",
                audience: APPLE_AUDIENCES,
            });
            if (typeof payload.email === "string") return payload.email;
            // Apple may omit email on re-login: resolve via stored apple_identifier
            const { data } = await admin.from("users").select("email").eq("apple_identifier", payload.sub).maybeSingle();
            return data?.email ?? null;
        }
    }
    return null;
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

    try {
        const { provider, token } = await req.json();
        if (!["kakao", "naver", "google", "apple"].includes(provider) || typeof token !== "string" || !token) {
            return json({ error: "invalid_request" }, 400);
        }

        const email = (await verifiedEmail(provider, token))?.toLowerCase();
        if (!email) return json({ error: "token_verification_failed" }, 401);

        // Create the auth user if needed (ignore "already registered")
        const { error: createError } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
            app_metadata: { provider },
        });
        if (createError && createError.status !== 422 && !/already/i.test(createError.message)) {
            console.error("createUser failed:", createError.message);
            return json({ error: "user_create_failed" }, 500);
        }

        const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
        if (error || !data?.properties?.hashed_token) {
            console.error("generateLink failed:", error?.message);
            return json({ error: "session_issue_failed" }, 500);
        }

        return json({ token_hash: data.properties.hashed_token, email });
    } catch (e) {
        console.error("social-auth error:", e instanceof Error ? e.message : e);
        return json({ error: "token_verification_failed" }, 401);
    }
});
