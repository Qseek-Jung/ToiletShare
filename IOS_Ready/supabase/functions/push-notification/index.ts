
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { initializeApp, cert } from "npm:firebase-admin/app";
import { getMessaging } from "npm:firebase-admin/messaging";

const serviceAccount = JSON.parse(Deno.env.get("FIREBASE_SERVICE_ACCOUNT") || "{}");

if (Deno.env.get("FIREBASE_SERVICE_ACCOUNT")) {
    initializeApp({
        credential: cert(serviceAccount),
    });
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // 1. Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    let notification_id: string | null = null;
    let supabaseClient: any = null;

    try {
        const body = await req.json().catch(() => ({}));
        notification_id = body.notification_id;

        if (!notification_id) throw new Error("Missing notification_id");

        // Initialize Supabase Client
        supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Fetch Notification Details
        const { data: notif, error: fetchError } = await supabaseClient
            .from("notifications")
            .select("*, users(push_token)")
            .eq("id", notification_id)
            .single();

        if (fetchError || !notif) throw new Error("Notification not found");

        const token = notif.users?.push_token;
        if (!token) {
            await supabaseClient.from("notifications").update({ delivery_status: "failed", data: { error: "No token" } }).eq("id", notification_id);
            return new Response(JSON.stringify({ success: false, error: "No push token for user" }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        // Send FCM
        const dataPayload: Record<string, string> = {};
        if (notif.data && typeof notif.data === 'object') {
            Object.entries(notif.data).forEach(([key, value]) => {
                dataPayload[key] = String(value);
            });
        }

        const message = {
            token: token,
            notification: {
                title: notif.title,
                body: notif.message,
            },
            data: dataPayload,
        };

        const response = await getMessaging().send(message);

        // Update Status
        await supabaseClient
            .from("notifications")
            .update({ delivery_status: "sent", sent_at: new Date().toISOString() })
            .eq("id", notification_id);

        return new Response(JSON.stringify({ success: true, messageId: response }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    } catch (error: any) {
        console.error("FCM Error caught in function:", error);

        // Handle specific FCM Errors (Token invalid or project mismatch)
        const errorMessage = error.message || "";
        const isTokenError = errorMessage.includes("Requested entity was not found") ||
            errorMessage.includes("messaging/registration-token-not-registered") ||
            errorMessage.includes("messaging/invalid-registration-token");

        if (isTokenError && notification_id && supabaseClient) {
            // Attempt to clear the invalid token to prevent future 500s
            try {
                // 1. Mark notification as failed
                await supabaseClient.from("notifications").update({
                    delivery_status: "failed",
                    data: { error: "Invalid FCM Token", raw: errorMessage }
                }).eq("id", notification_id);

                // 2. Fetch user associated with this notification and clear their token
                const { data: n } = await supabaseClient.from("notifications").select("user_id").eq("id", notification_id).single();
                if (n?.user_id) {
                    await supabaseClient.from("users").update({ push_token: null }).eq("id", n.user_id);
                    console.log(`🧹 Cleared invalid push token for user: ${n.user_id}`);
                }
            } catch (e) {
                console.error("Failed to cleanup invalid token:", e);
            }

            // Return 200 (Success from Edge's perspective of handling it) but with error info
            return new Response(JSON.stringify({ success: false, error: "Invalid push token", details: errorMessage }), {
                status: 200, // Important: 200 so UI doesn't crash but knows it failed
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
