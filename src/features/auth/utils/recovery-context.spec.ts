import { describe, expect, it } from "vitest";
import {
  hasRecoveryContext,
  isRecoveryCallback,
} from "@/features/auth/utils/recovery-context";

describe("recovery callback routing", () => {
  it("1. token_hash + type=recovery enters the recovery branch", () => {
    expect(isRecoveryCallback("abc123", "recovery")).toBe(true);
  });

  it("2. non-recovery types never enter the recovery branch", () => {
    for (const type of ["signup", "invite", "magiclink", "email_change", "phone", "sms", ""]) {
      expect(isRecoveryCallback("abc123", type)).toBe(false);
    }
    expect(isRecoveryCallback("abc123", null)).toBe(false);
    expect(isRecoveryCallback("abc123", undefined)).toBe(false);
  });

  it("3. missing token_hash never enters the recovery branch", () => {
    expect(isRecoveryCallback(null, "recovery")).toBe(false);
    expect(isRecoveryCallback("", "recovery")).toBe(false);
    expect(isRecoveryCallback(undefined, "recovery")).toBe(false);
  });
});

describe("recovery context gate (marker + live session)", () => {
  it("11. marker plus session user is allowed", () => {
    expect(hasRecoveryContext("1", "user-uuid-1")).toBe(true);
  });

  it("12. normal authenticated session without marker is rejected", () => {
    expect(hasRecoveryContext(null, "user-uuid-1")).toBe(false);
    expect(hasRecoveryContext("", "user-uuid-1")).toBe(false);
    expect(hasRecoveryContext(undefined, "user-uuid-1")).toBe(false);
  });

  it("13. unauthenticated visitors are rejected", () => {
    expect(hasRecoveryContext("1", null)).toBe(false);
    expect(hasRecoveryContext("1", "")).toBe(false);
    expect(hasRecoveryContext("1", undefined)).toBe(false);
    expect(hasRecoveryContext(null, null)).toBe(false);
  });

  it("14. missing/expired recovery context is rejected", () => {
    expect(hasRecoveryContext(null, undefined)).toBe(false);
    expect(hasRecoveryContext("", "")).toBe(false);
  });
});
