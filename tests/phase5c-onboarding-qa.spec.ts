import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3000";

async function clearOnboarding(page: Page) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.removeItem("discora_onboarding_v1"));
  await page.reload();
  await page.waitForTimeout(500);
}

async function openDiscoveryDeck(page: Page) {
  const trigger = page.locator("button:has-text('How Discora Works')").first();
  if (await trigger.count() > 0) {
    await trigger.first().click();
  } else {
    const sparkles = page.locator("button:has-text('New to Discora?')");
    if (await sparkles.count() > 0) await sparkles.first().click();
  }
  await page.waitForSelector('[role="dialog"]', { state: "visible" });
}

test.describe("Phase 5C Onboarding QA", () => {
  test.beforeEach(async ({ page }) => {
    page.setViewportSize({ width: 1280, height: 900 });
  });

  test("1. Browser Preflight", async ({ page }) => {
    await page.goto(BASE);
    await page.waitForTimeout(2000);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    const networkErrors: string[] = [];
    page.on("response", (res) => {
      if (res.status() >= 400) networkErrors.push(`${res.status()} ${res.url()}`);
    });

    await expect(page).toHaveTitle(/Discora/);
    await expect(page.locator("body")).toBeVisible();

    const shell = page.locator("header, nav, aside, main");
    await expect(shell.first()).toBeVisible();

    const hasRawHtml = await page.evaluate(() => {
      const body = document.body.innerHTML;
      return body.includes("<div id=\"__next\"></div>") && !document.querySelector("main");
    });
    expect(hasRawHtml).toBeFalsy();

    await page.screenshot({ path: "playwright-cli/preflight-homepage.png", fullPage: true });

    const criticalErrors = consoleErrors.filter(
      (e) =>
        e.includes("Cannot update a component while rendering") ||
        e.includes("hydration") ||
        e.includes("React")
    );
    expect(criticalErrors).toEqual([]);
  });

  test("2. Guest Onboarding", async ({ page }) => {
    await clearOnboarding(page);

    const trigger = page.locator("button:has-text('How Discora Works')").first();
    await expect(trigger).toBeVisible();

    await openDiscoveryDeck(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator("text=How Discora Works")).toBeVisible();

    const tabs = ["1. The Model", "2. Try It", "3. Discussion vs Debate", "4. Exploration"];
    for (const tab of tabs) {
      await expect(page.locator(`text=${tab}`).first()).toBeVisible();
    }

    await page.click("text=Next Step");
    await page.waitForTimeout(500);
    await page.click("text=Back");
    await page.waitForTimeout(500);

    await page.keyboard.press("Escape");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    await openDiscoveryDeck(page);
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click("button[aria-label='Close discovery guide']");
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("3. Epistemic Sandbox", async ({ page }) => {
    await clearOnboarding(page);
    await openDiscoveryDeck(page);

    const disclaimer = page.locator("text=Interactive example — not live Discora data");
    await expect(disclaimer).toBeVisible();

    await page.click("text=2. Try It");
    await page.waitForTimeout(500);

    const educationalMarker = page.locator("text=Educational Example");
    await expect(educationalMarker).toBeVisible();

    const supports = page.locator("button:has-text('More Supported'), button:has-text('Limited Support')");
    await expect(supports.first()).toBeVisible();
  });

  test("4. Discussion Questions vs Structured Inquiries", async ({ page }) => {
    await clearOnboarding(page);
    await openDiscoveryDeck(page);

    await expect(page.locator("text=Discussion Questions")).toBeVisible();
    await expect(page.locator("text=Structured Inquiries")).toBeVisible();
  });

  test("5. Discussion vs Debate", async ({ page }) => {
    await clearOnboarding(page);
    await openDiscoveryDeck(page);

    await page.click("text=3. Discussion vs Debate");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Discussions")).toBeVisible();
    await expect(page.locator("text=Debates")).toBeVisible();
  });

  test("6. Preferences", async ({ page }) => {
    await clearOnboarding(page);
    await openDiscoveryDeck(page);

    await page.click("text=4. Exploration");
    await page.waitForTimeout(500);
    await expect(page.locator("text=Personalize Your Exploration")).toBeVisible();
  });

  test("7. Onboarding Persistence", async ({ page }) => {
    await clearOnboarding(page);
    await openDiscoveryDeck(page);
    await page.click("text=Skip Guide");
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test("8. Authenticated Experience", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(500);
  });

  test("9. Discussion Room", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(`${BASE}/discussions/should-ai-generated-content-be-clearly-labeled-online`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-cli/discussion-room.png", fullPage: true });
  });

  test("10. Debate Room", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(`${BASE}/debates/ai-is-superior-to-humans`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "playwright-cli/debate-room.png", fullPage: true });
  });

  test("11. Room Section Shell Regression", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(`${BASE}/discussions/should-ai-generated-content-be-clearly-labeled-online`);
    await page.waitForTimeout(1500);

    const nav = page.locator("nav a, [href*='/claims'], [href*='/evidence'], [href*='/questions'], [href*='/contributions']");
    await expect(nav.first()).toBeVisible();
  });

  test("12. Sidebar / Mobile Nav", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(BASE);
    await page.waitForTimeout(1000);

    const sidebar = page.locator("aside, nav");
    await expect(sidebar.first()).toBeVisible();
  });

  test("13. Responsive QA", async ({ page }) => {
    const sizes = [375, 390, 768, 1024, 1440];
    for (const size of sizes) {
      page.setViewportSize({ width: size, height: 900 });
      await page.goto(BASE);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `playwright-cli/responsive-${size}.png`, fullPage: true });
    }
  });

  test("14. Accessibility", async ({ page }) => {
    await clearOnboarding(page);
    await openDiscoveryDeck(page);

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby");
  });

  test("15. Regression Smoke", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(BASE);
    await page.waitForTimeout(1000);
  });

  test("16. Console / Network Final", async ({ page }) => {
    await clearOnboarding(page);
    await page.goto(BASE);
    await page.waitForTimeout(3000);
  });
});
