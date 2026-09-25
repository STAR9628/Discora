"use server";

import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "@/services/supabase/server";
import { OAUTH_NEXT_COOKIE_NAME } from "@/lib/security/oauth-destination";
import { RECOVERY_VERIFIED_COOKIE_NAME } from "@/features/auth/utils/recovery-context";

/**
 * One-time auth-flow cookies. Short-lived by design, but logout and
 * recovery completion must actively expire them so no stale marker or
 * destination can outlive the session that created it. httpOnly cookies
 * (recovery marker) can only be cleared server-side — never from browser JS.
 */
const ONE_TIME_COOKIES = [OAUTH_NEXT_COOKIE_NAME, RECOVERY_VERIFIED_COOKIE_NAME] as const;

async function isSecureRequest(): Promise<boolean> {
  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) {
    return proto === "https";
  }
  const host =
    headerList.get("x-forwarded-host") || headerList.get("host") || "";
  return !/^(localhost|127\.0\.0\.1)/.test(host);
}

/**
 * Expire the one-time auth cookies. Never throws: cleanup must not break
 * logout or post-reset navigation if the cookie store is unavailable.
 */
export async function clearAuthOneTimeState(): Promise<void> {
  try {
    const secure = await isSecureRequest();
    const store = await cookies();
    for (const name of ONE_TIME_COOKIES) {
      store.set(name, "", { path: "/", maxAge: 0, secure });
    }
  } catch {
    // Intentionally silent — expiry is bounded by Max-Age regardless.
  }
}

/**
 * Full sign-out: invalidate the Supabase session server-side (mirrors the
 * existing client signOut) and expire one-time auth state. Never throws.
 */
export async function signOutAndClearAuthState(): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch {
    // Proceed to cookie cleanup regardless.
  }
  await clearAuthOneTimeState();
}
