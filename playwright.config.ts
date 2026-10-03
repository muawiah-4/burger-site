import { defineConfig, devices } from "@playwright/test";

// E2E_PORT lets parallel checkouts (worktrees) run their own server side by side.
const PORT = Number(process.env.E2E_PORT ?? 4442);
const LOCAL_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// PLAYWRIGHT_CHROME lets local runs drive the real, already-licensed/installed
// Chrome instead of downloading Playwright's bundled Chromium: set it to "1"
// for the default local install path above, or to a custom path directly.
const executablePath = process.env.PLAYWRIGHT_CHROME
  ? process.env.PLAYWRIGHT_CHROME === "1"
    ? LOCAL_CHROME
    : process.env.PLAYWRIGHT_CHROME
  : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // trace captures DOM snapshots + network per step, which covers failure
    // forensics without requiring ffmpeg (unsupported on some local macOS
    // versions) the way video recording would.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // The same suite runs in Chromium and WebKit (Safari): WebKit differs in
  // focus-on-click, CSP handling (upgrade-insecure-requests on localhost) and
  // CSS feature support, which is exactly what these runs are here to catch.
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], launchOptions: executablePath ? { executablePath } : undefined },
    },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Safari (WebKit) won't store a Secure cookie over plain http://localhost
    // (Chromium exempts localhost), so the signed-in session would be lost on
    // the next request. Test-server only; see .env.example. Every test signs up
    // a fresh account, so two browsers x repeats would trip the signup limit.
    env: { INSECURE_COOKIES: "1", RATE_LIMIT_DISABLED: "1" },
  },
});
