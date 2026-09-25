import { describe, expect, it } from "vitest";
import {
  OAUTH_NEXT_COOKIE_MAX_AGE,
  OAUTH_NEXT_COOKIE_NAME,
  parseOAuthNextCookie,
  resolveOAuthDestination,
  resolveRecoveryDestination,
  serializeOAuthNextCookie,
} from "@/lib/security/oauth-destination";

describe("oauth destination cookie", () => {
  it("1. serializes a short-lived, lax, path-scoped cookie", () => {
    const header = serializeOAuthNextCookie("/about", true);
    expect(header).toContain(`${OAUTH_NEXT_COOKIE_NAME}=%2Fabout`);
    expect(header).toContain("Path=/");
    expect(header).toContain(`Max-Age=${OAUTH_NEXT_COOKIE_MAX_AGE}`);
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Secure");
    expect(serializeOAuthNextCookie("/about", false)).not.toContain("Secure");
  });

  it("2/3. resolves cookie destination incl. deep links", () => {
    expect(resolveOAuthDestination("/about", null)).toBe("/about");
    expect(resolveOAuthDestination("/discussions/r/claims?highlight=123", null)).toBe(
      "/discussions/r/claims?highlight=123",
    );
    expect(resolveOAuthDestination("/debates/r?question=456", null)).toBe(
      "/debates/r?question=456",
    );
  });

  it("4. rejects malicious external destinations", () => {
    expect(resolveOAuthDestination("https://evil.example.com/", null)).toBe("/");
    expect(resolveOAuthDestination("//evil.example.com/x", null)).toBe("/");
    expect(resolveOAuthDestination("https://evil.example.com/?next=%2F", null)).toBe("/");
    // NOTE: "/admin" passes the shared prefix allow-list ("/" matches all
    // relative paths) — identical to the longstanding callback policy.
    // Non-owners still receive the owner-guard 404 downstream.
    expect(resolveOAuthDestination("/admin", null)).toBe("/admin");
  });

  it("5. defaults to / without destination", () => {
    expect(resolveOAuthDestination(null, null)).toBe("/");
    expect(resolveOAuthDestination("", "")).toBe("/");
  });

  it("6. parses the cookie back out of a Cookie header", () => {
    expect(parseOAuthNextCookie("a=1; discora_oauth_next=%2Fabout; b=2")).toBe("/about");
    expect(parseOAuthNextCookie(null)).toBeNull();
    expect(parseOAuthNextCookie("a=1")).toBeNull();
    expect(parseOAuthNextCookie("discora_oauth_next=%ZZ")).toBeNull();
  });

  it("7. never emits OAuth residue: final-boundary stripping", () => {
    // Both the login initiator AND the callback resolver strip residue, so
    // a stale ?code= can never be echoed into the success redirect.
    expect(resolveOAuthDestination("/about?code=STALE&next=%2Fabout", null)).toBe(
      "/about?next=%2Fabout",
    );
    expect(resolveOAuthDestination("/about", "/about?code=STALE")).toBe("/about");
    expect(resolveOAuthDestination(null, "/login?error=access_denied")).toBe("/login");
  });

  it("8. falls back to legacy ?next= for email flows", () => {
    expect(resolveOAuthDestination(null, "/reset-password")).toBe("/reset-password");
    expect(resolveOAuthDestination(null, "/about")).toBe("/about");
    expect(resolveOAuthDestination(null, "https://evil.example.com/")).toBe("/");
  });

  it("9. recovery defaults to /reset-password", () => {
    expect(resolveRecoveryDestination(null)).toBe("/reset-password");
    expect(resolveRecoveryDestination("")).toBe("/reset-password");
    expect(resolveRecoveryDestination("/reset-password")).toBe("/reset-password");
  });

  it("10. recovery honors validated ?next= but never external URLs", () => {
    expect(resolveRecoveryDestination("/about")).toBe("/about");
    expect(resolveRecoveryDestination("https://evil.example.com/")).toBe(
      "/reset-password",
    );
    expect(resolveRecoveryDestination("/reset-password?token_hash=STALE")).toBe(
      "/reset-password",
    );
  });
});
