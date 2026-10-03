import { expect, type Locator, test as base } from "@playwright/test";

/**
 * Every test records console errors, uncaught exceptions and CSP violations
 * (via a `securitypolicyviolation` listener installed before any page script)
 * and fails if there are any: CSP and console behaviour is exactly where
 * Safari (WebKit) parts ways with Chromium.
 */
export const test = base.extend<{ pageProblems: string[] }>({
  pageProblems: [
    async ({ page }, use, testInfo) => {
      const problems: string[] = [];
      await page.exposeBinding("__reportCsp", (_source, line: string) => {
        problems.push(`CSP ${line}`);
      });
      await page.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          (window as unknown as { __reportCsp: (line: string) => void }).__reportCsp(
            `${e.effectiveDirective} blocked ${e.blockedURI || "inline"} ${e.sample}`
          );
        });
      });
      // /_next/image fetches the photos from the remote origin server-side; an
      // upstream timeout there surfaces as a 5xx console error in every engine
      // and says nothing about the browser, so those are counted and excused.
      let imageUpstreamErrors = 0;
      page.on("response", (res) => {
        if (res.status() >= 500 && new URL(res.url()).pathname === "/_next/image") imageUpstreamErrors++;
      });
      page.on("console", (msg) => {
        if (msg.type() !== "error") return;
        if (/status of 5\d\d/.test(msg.text()) && imageUpstreamErrors > 0) {
          imageUpstreamErrors--;
          return;
        }
        problems.push(`console: ${msg.text()}`);
      });
      page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));

      await use(problems);

      if (problems.length) {
        await testInfo.attach("page-problems", { body: problems.join("\n"), contentType: "text/plain" });
      }
      // Skip once a test has already failed: Playwright's failure screenshot
      // injects an un-nonced <style> (caret hiding), which WebKit then reports.
      if (testInfo.status === testInfo.expectedStatus) {
        expect(problems, `console errors / CSP violations in ${testInfo.project.name}`).toEqual([]);
      }
    },
    { auto: true },
  ],
});

/**
 * A dialog is ready for keyboard input once its open effect has moved focus
 * into it; pressing Escape before that (WebKit paints sooner) would be lost.
 */
export async function expectFocusInside(dialog: Locator) {
  await expect
    .poll(() => dialog.evaluate((d) => d.contains(document.activeElement)), { timeout: 15_000 })
    .toBe(true);
}

/**
 * Waits until React has hydrated `el`. A click before that is replayed by React
 * after hydration, but by then the native pointerdown is gone, so anything
 * that tracks the pressed element (Safari focus return) never saw it.
 */
export async function expectHydrated(el: Locator) {
  await expect
    .poll(() => el.evaluate((node) => Object.keys(node).some((k) => k.startsWith("__reactProps"))))
    .toBe(true);
}

export { expect };
