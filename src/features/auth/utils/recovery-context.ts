/**
 * Password-recovery session gate.
 *
 * Pivot (verified against installed @supabase/auth-js types): neither
 * Session nor its documented AMR method set carries a reliable
 * recovery-specific marker, so this gate does NOT depend on provider
 * metadata. Instead the callback sets a short-lived, httpOnly,
 * server-only marker cookie at verifyOtp time, and the reset page
 * requires marker + live session together.
 */

/** Server-set, httpOnly marker proving THIS browser completed verifyOtp. */
export const RECOVERY_VERIFIED_COOKIE_NAME = "discora_recovery_verified";

/** Five minutes: covers the reset form, nothing more. */
export const RECOVERY_VERIFIED_COOKIE_MAX_AGE = 300;

/**
 * True only when BOTH hold:
 * - the server-set recovery marker cookie is present (proves the recovery
 *   link was verified server-side in this browser), AND
 * - an authenticated session user exists right now.
 *
 * A normal logged-in session without the marker is rejected. No session is
 * rejected. Fail-closed on every malformed input. Never throws.
 */
export function hasRecoveryContext(
  markerValue: string | null | undefined,
  userId: string | null | undefined,
): boolean {
  return !!markerValue && !!userId;
}

/**
 * True when the request carries a recovery OTP callback
 * (`?token_hash=...&type=recovery`). Only this exact type enters the
 * recovery branch; signup/invite/magic-link types never do.
 */
export function isRecoveryCallback(
  tokenHash: string | null | undefined,
  type: string | null | undefined,
): boolean {
  return !!tokenHash && type === "recovery";
}
