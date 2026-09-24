import { describe, expect, it } from "vitest";
import { buildCallbackSuccessHtml } from "./callback-success-html";

describe("buildCallbackSuccessHtml", () => {
  it("navigates to the validated destination without script", () => {
    const html = buildCallbackSuccessHtml("/about");
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain("url=/about");
    expect(html).toContain('<a href="/about">');
    expect(html).not.toContain("<script");
    expect(html).not.toContain("eval(");
  });

  it("preserves deep-link destinations", () => {
    const html = buildCallbackSuccessHtml("/discussions/r/claims?highlight=abc");
    expect(html).toContain("/discussions/r/claims?highlight=abc".replace(/&/g, "&amp;"));
  });

  it("HTML-escapes hostile destinations", () => {
    const html = buildCallbackSuccessHtml('/"><script>alert(1)</script>');
    expect(html).not.toContain('"><script>alert(1)</script>');
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("never contains OAuth material", () => {
    const html = buildCallbackSuccessHtml("/");
    expect(html).not.toContain("code=");
    expect(html).not.toContain("exchangeCodeForSession");
    expect(html).not.toContain("Set-Cookie");
  });

  it("emits a complete standalone document", () => {
    const html = buildCallbackSuccessHtml("/");
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain('charset="utf-8"');
  });
});
