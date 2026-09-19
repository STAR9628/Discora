import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 600000,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: "only-on-failure",
    video: "off",
    trace: "off",
  },
});
