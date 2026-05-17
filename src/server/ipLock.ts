import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://tqydqebwrfqazkoidxbh.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWRxZWJ3cmZxYXprb2lkeGJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NTM2MDQsImV4cCI6MjA5MjQyOTYwNH0.hseWwWb8Bh1gG7RB6U0_WEi9A535zSUB2Qin-BsJ1_w";

function detectIp(): string {
  // Cloudflare → most reliable on prod
  const cf = getRequestHeader("cf-connecting-ip");
  if (cf) return cf.trim();
  // Akamai / Cloudfront style
  const trueClient = getRequestHeader("true-client-ip");
  if (trueClient) return trueClient.trim();
  // Standard X-Forwarded-For (left-most = original client)
  const xff = getRequestHeader("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = getRequestHeader("x-real-ip");
  if (real) return real.trim();
  // RFC 7239 Forwarded header
  const fwd = getRequestHeader("forwarded");
  if (fwd) {
    const m = /for=("?\[?)([^";,\]]+)/i.exec(fwd);
    if (m && m[2]) return m[2].trim();
  }
  try {
    const ip = getRequestIP({ xForwardedFor: true });
    if (ip) return ip;
  } catch {
    // ignore
  }
  return "unknown";
}

/**
 * Login-এর পর call হবে। User-এর IP check করে:
 *  - locked_ip null হলে → এই IP-কেই lock করি
 *  - locked_ip == current IP → ok
 *  - mismatch → status = 'ip_locked' করি; client signOut করবে
 */
export const verifyLoginIp = createServerFn({ method: "POST" })
  .inputValidator((input: { accessToken: string }) => input)
  .handler(async ({ data }) => {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.accessToken}` } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
      error,
    } = await userClient.auth.getUser();
    if (error || !user) throw new Error("Unauthorized");

    const currentIp = detectIp();
    const now = new Date().toISOString();

    // Admin দের জন্য IP lock skip (যাতে কোথাও থেকে manage করা যায়)
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if ((roles ?? []).some((r) => r.role === "admin")) {
      return { ok: true, ip: currentIp, status: "approved" as const };
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("status, locked_ip")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) throw new Error("Profile not found");

    // pending/rejected/ip_locked → IP set/check করার দরকার নেই, status-ই block
    if (profile.status !== "approved") {
      return { ok: false, ip: currentIp, status: profile.status };
    }

    // IP detect না হলে accidentally lock করব না — login-কে block-ও করব না, just allow
    if (!currentIp || currentIp === "unknown") {
      return { ok: true, ip: currentIp, status: "approved" as const };
    }

    // First-time approved login — IP lock করি
    if (!profile.locked_ip) {
      await supabaseAdmin
        .from("profiles")
        .update({
          locked_ip: currentIp,
          ip_locked_at: now,
          last_attempted_ip: currentIp,
          last_attempt_at: now,
        })
        .eq("id", user.id);
      return { ok: true, ip: currentIp, status: "approved" as const };
    }

    // IP মিলে গেলে ok
    if (profile.locked_ip === currentIp) {
      await supabaseAdmin
        .from("profiles")
        .update({ last_attempted_ip: currentIp, last_attempt_at: now })
        .eq("id", user.id);
      return { ok: true, ip: currentIp, status: "approved" as const };
    }

    // Mismatch — account lock
    await supabaseAdmin
      .from("profiles")
      .update({
        status: "ip_locked",
        last_attempted_ip: currentIp,
        last_attempt_at: now,
      })
      .eq("id", user.id);

    return { ok: false, ip: currentIp, status: "ip_locked" as const };
  });
