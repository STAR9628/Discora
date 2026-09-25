import { NextResponse } from "next/server";
import { OAUTH_NEXT_COOKIE_NAME } from "@/lib/security/oauth-destination";
import { RECOVERY_VERIFIED_COOKIE_NAME } from "@/features/auth/utils/recovery-context";

/**
 * Expire the one-time auth-flow cookies (OAuth destination, recovery
 * marker). POST only, no parameters, no body.
 *
 * Why a route handler instead of a Server Action: Server-Action responses
 * re-render the current route, which remounts the reset form and discards
 * its in-flight success state (message + redirect timer). A plain fetch
 * POST to this handler performs the same cookie deletions with no router
 * cache invalidation, so the form's success UX survives.
 *
 * Deleting only name/path-matched cookies the app itself created cannot
 * affect sessions, roles, or other users. Safe to call when absent.
 */
export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ ok: true });
  for (const name of [OAUTH_NEXT_COOKIE_NAME, RECOVERY_VERIFIED_COOKIE_NAME]) {
    // Removal matches on name + domain + path; Secure is not part of
    // cookie-identity matching, so this expires both http and https variants.
    response.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return response;
}
