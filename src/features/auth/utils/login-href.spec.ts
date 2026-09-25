import { describe, expect, it } from "vitest";
import { getLoginHref } from "@/features/auth/utils/login-href";

describe("getLoginHref", () => {
  it("returns plain /login for home and auth entry points", () => {
    expect(getLoginHref(null)).toBe("/login");
    expect(getLoginHref("/")).toBe("/login");
    expect(getLoginHref("/login")).toBe("/login");
    expect(getLoginHref("/register")).toBe("/login");
    expect(getLoginHref("/auth/callback")).toBe("/login");
  });

  it("never preserves /reset-password as a login destination", () => {
    expect(getLoginHref("/reset-password")).toBe("/login");
  });

  it("preserves legitimate deep-link destinations", () => {
    expect(getLoginHref("/discussions/abc")).toBe(
      "/login?redirectedFrom=%2Fdiscussions%2Fabc",
    );
    expect(getLoginHref("/admin")).toBe("/login?redirectedFrom=%2Fadmin");
  });
});
