/** Verify the first paint before deferred JavaScript, delayed data and the entrance lifecycle. */
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "../dist");
const { fixture, frontend } = require("./fixtures.cjs");

/** Serve local build bytes through intercepted requests, holding the bundle until initial-paint assertions finish. */
async function coldPage(
  browser,
  { width, locale, mode = "animated", failure = false },
) {
  const page = await browser.newPage({
    viewport: { width, height: 1000 },
    reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const session = await page.context().newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  let release;
  const bundle = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    assert.equal(
      url.origin,
      "http://portfolio.test",
      "All assets must remain local",
    );
    const file = path.resolve(
      root,
      "." + (url.pathname === "/" ? "/index.html" : url.pathname),
    );
    assert(file.startsWith(root + path.sep));
    if (url.pathname === "/app.js") await bundle;
    await route.fulfill({
      body: fs.readFileSync(file),
      contentType:
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".woff2": "font/woff2",
        }[path.extname(file)] || "application/octet-stream",
    });
  });
  await page.addInitScript(
    ({ db, locale, mode, failure }) => {
      localStorage.setItem("portfolio.language", locale);
      if (mode === "paused")
        localStorage.setItem(
          "portfolio-appearance",
          JSON.stringify({ paused: true }),
        );
      let client;
      Object.defineProperty(window, "PortfolioApi", {
        configurable: true,
        get: () => client,
        set: () => {
          const failThisVisit = failure && !sessionStorage.getItem("retried");
          client = createPortfolioApi(
            MockPortfolioTransport.create(db, {
              delayMs: 150,
              failures: failThisVisit ? { "/site": 1 } : {},
            }),
          );
        },
      });
      window.preReadyLeaks = [];
      // Sample every rendered frame, including the interval before app.js exists.
      function sample() {
        if (document.documentElement.dataset.ready === "true") return;
        for (const selector of [".intro", ".sidebar", ".mobile-header"]) {
          const el = document.querySelector(selector);
          if (
            el &&
            el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
          )
            preReadyLeaks.push(selector);
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    },
    { db: fixture(), locale, mode, failure },
  );
  await page.goto("http://portfolio.test/", { waitUntil: "commit" });
  await page.waitForFunction(
    () =>
      document.querySelector(".intro") &&
      getComputedStyle(document.querySelector(".sidebar")).visibility ===
        "hidden",
  );
  assert.equal(await page.evaluate(() => typeof Portfolio), "undefined");
  assert.equal(
    await page.locator(".intro").isVisible(),
    false,
    "HTML must hide fallback text before bundle download",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(
      () =>
        !!document.activeElement.closest("main,.sidebar,.mobile-header,.skip"),
    ),
    false,
    "Unready controls must not receive focus",
  );
  release();
  await page.locator("#startup-status").waitFor({ state: "visible" });
  assert.equal(
    await page.locator(".intro").isVisible(),
    false,
    "Slow data must not expose the static introduction",
  );
  return { page, errors };
}

/** Assert that the initial guard hands control to the existing animation and then the chat greeting. */
async function verifyReady(page, mode) {
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === "true",
  );
  if (mode === "animated") {
    assert.equal(
      await page
        .locator(".intro")
        .evaluate((el) => getComputedStyle(el).opacity),
      "0",
      "Content starts at the hidden entrance frame",
    );
    assert.equal(await page.locator(".chatme-bubble:not([hidden])").count(), 0);
  }
  await page.evaluate(() => Portfolio.get("backgroundField").whenReady);
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector(".intro")).opacity === "1",
  );
  assert.equal(await page.locator(".intro").isVisible(), true);
  assert.equal(await page.locator("#startup-status").isVisible(), false);
  assert.equal(await page.locator(".chatme-bubble:not([hidden])").count(), 1);
  assert.deepEqual(await page.evaluate(() => preReadyLeaks), []);
}

/** Cover cold desktop/mobile startup, motion overrides and localized failure/retry without external networking. */
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
      for (const width of [390, 1024, 1440, 3840]) {
        const { page, errors } = await coldPage(browser, { width, locale });
        await verifyReady(page, "animated");
        assert.deepEqual(errors, []);
        await page.close();
      }
      const { page, errors } = await coldPage(browser, {
        width: 390,
        locale,
        failure: true,
      });
      await page.locator('#startup-status[role="alert"]').waitFor();
      assert.equal(
        await page.locator("#startup-status span").textContent(),
        frontend().locales[locale]["ui.startupError"],
      );
      assert.equal(await page.locator(".intro").isVisible(), false);
      await page.locator("#startup-status button").focus();
      assert.equal(
        await page
          .locator("#startup-status button")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      assert.deepEqual(await page.evaluate(() => preReadyLeaks), []);
      await page.evaluate(() => sessionStorage.setItem("retried", "true"));
      await page.locator("#startup-status button").click();
      await verifyReady(page, "animated");
      assert.deepEqual(errors, []);
      await page.close();
    }
    for (const mode of ["reduced", "paused"])
      for (const width of [390, 1440]) {
        const { page, errors } = await coldPage(browser, {
          width,
          locale: "en",
          mode,
        });
        await verifyReady(page, mode);
        assert.deepEqual(errors, []);
        await page.close();
      }
    console.log(
      "PASS cold entry: bundle held before first paint, slow data, 3 locales × 4 widths, reduced motion, saved pause and localized failure/retry; no pre-ready content flash.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
