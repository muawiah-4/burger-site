import { defineConfig, devices } from "@playwright/test";

const PORT = 4442;
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
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
