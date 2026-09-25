import { getAllowedRedirectUrl, stripOAuthResidue } from "./safe-redirect";

/**
 * Short-lived carrier for the user's intended post-OAuth destination.
 *
 * Rationale: Supabase must receive an EXACT, query-free
 * `${origin}/auth/callback` redirectTo (query-bearing variants are not
 * reliably honored at callback time). The destination therefore travels
 * outside redirectTo, in a cookie the Next.js callback reads, re-validates,
 * consumes, and deletes. Values are always relative paths validated against
 * the existing allow-list model; absolute/external URLs are never stored.
 */
export const OAUTH_NEXT_COOKIE_NAME = "discora_oauth_next";

/** Five minutes: covers the Google round-trip, nothing more. */
export const OAUTH_NEXT_COOKIE_MAX_AGE = 300;

/**
 * Build a `document.cookie` assignment for the destination. The destination
 * must already be validated (relative, allow-listed) by the caller.
 * `Secure` is set only on HTTPS so local HTTP development keeps working.
 */
export function serializeOAuthNextCookie(destination: string, secure: boolean): string {
  const parts = [
    `${OAUTH_NEXT_COOKIE_NAME}=${encodeURIComponent(destination)}`,
    "Path=/",
    `Max-Age=${OAUTH_NEXT_COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

/**
 * Parse the destination back out of a raw `Cookie` header value.
 * Returns null when absent or undecodable. Never throws.
 */
export function parseOAuthNextCookie(header: string | null | undefined): string | null {
  if (!header || typeof header !== "string") {
    return null;
  }
  const prefix = `${OAUTH_NEXT_COOKIE_NAME}=`;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      try {
        return decodeURIComponent(trimmed.slice(prefix.length));
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Resolve the final post-OAuth destination:
 * 1. destination cookie (re-validated; consumed by the caller), else
 * 2. legacy `?next=` query value (re-validated; preserves email flows), else
 * 3. "/".
 *
 * Pure function safe to unit test. Never returns an external URL.
 */
export function resolveOAuthDestination(
  cookieValue: string | null | undefined,
  queryNext: string | null | undefined,
): string {
  // Defense in depth: strip OAuth residue at the final boundary too, so a
  // stale ?code= can never be echoed even if a caller forgets to sanitize.
  if (cookieValue) {
    const validated = getAllowedRedirectUrl(stripOAuthResidue(cookieValue), "");
    if (validated) {
      return validated;
    }
  }
  if (queryNext) {
    const validated = getAllowedRedirectUrl(stripOAuthResidue(queryNext), "");
    if (validated) {
      return validated;
    }
  }
  return "/";
}

/**
 * Resolve the password-recovery destination: the explicit validated `?next=`
 * value (what requestPasswordReset sends), else the recovery default
 * "/reset-password". The one-time Google destination cookie is flow-foreign
 * here and is never navigated to (the callback still deletes it).
 * Pure function safe to unit test. Never returns an external URL.
 */
export function resolveRecoveryDestination(
  queryNext: string | null | undefined,
): string {
  if (queryNext) {
    const validated = getAllowedRedirectUrl(stripOAuthResidue(queryNext), "");
    if (validated) {
      return validated;
    }
  }
  return "/reset-password";
}
