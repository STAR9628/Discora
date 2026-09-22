"use client";

/**
 * Check if the browser contains an active Supabase session cookie.
 * Fast, synchronous check to avoid flash of guest state during session hydration.
 */
export function hasAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => {
    const trimmed = c.trim();
    if (!trimmed || trimmed.includes("code-verifier")) return false;
    const [name, ...valParts] = trimmed.split("=");
    const val = valParts.join("=").trim();
    if (!val) return false;
    return (
      (name.startsWith("sb-") && name.includes("-auth-token")) ||
      name.includes("auth-token")
    );
  });
}
