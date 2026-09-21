/** Exercise navigation browser behavior using the actual offline page. */
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    offline: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage(),
    errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  const url = pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href;
  for (const [old, next] of [
    ["stack", "skills"],
    ["toolkit", "skills"],
    ["intro", "overview"],
    ["journey", "journey"],
    ["experience", "experience"],
    ["projects", "projects"],
  ]) {
    await page.goto(`${url}?test=1#${old}`);
    await page.waitForTimeout(250);
    assert.equal(new URL(page.url()).hash, `#${next}`);
    assert.equal(new URL(page.url()).search, "?test=1");
    assert.equal(
      await page.locator("[data-section-menu] .active").getAttribute("href"),
      `#${next}`,
    );
  }
  for (const key of [
    "overview",
    "journey",
    "experience",
    "projects",
    "skills",
  ]) {
    await page.locator(`[data-section-menu] a[href="#${key}"]`).click();
    await page.waitForTimeout(200);
    assert.equal(new URL(page.url()).hash, `#${key}`);
    assert.equal(
      await page.locator('[aria-current="location"]').getAttribute("href"),
      `#${key}`,
    );
  }
  await page.goBack();
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).hash, "#projects");
  await page.goForward();
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).hash, "#skills");
  await page.reload();
  await page.waitForTimeout(200);
  assert.equal(
    await page.locator('[aria-current="location"]').getAttribute("href"),
    "#skills",
  );
  await page.evaluate(() => I18n.setLanguage("zh-Hant"));
  assert.equal(
    await page.locator('[aria-current="location"]').getAttribute("href"),
    "#skills",
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).hash, "#overview");
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.evaluate(() =>
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
  );
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).hash, "#skills");
  assert.equal(
    await page.locator('[aria-current="location"]').getAttribute("href"),
    "#skills",
  );
  await page.setViewportSize({ width: 320, height: 850 });
  await page.locator("#menu-toggle").click();
  await page.locator('[data-section-menu] a[href="#experience"]').click();
  await page.waitForTimeout(200);
  assert.equal(new URL(page.url()).hash, "#experience");
  assert.equal(
    await page
      .locator("#sidebar")
      .evaluate((el) => el.classList.contains("open")),
    false,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  // Changing only a slug in the configuration updates the section ID, menu and aliases.
  // Inspect real transition midpoints to verify both directions remain rendered while sliding.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 850 });
  for (const open of [true, false]) {
    await page.locator("#menu-toggle").click();
    const state = await page.evaluate(async () => {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      const sidebar = document.querySelector("#sidebar");
      const backdrop = document.querySelector("#menu-backdrop");
      const slide = sidebar
        .getAnimations()
        .find((animation) => animation.transitionProperty === "transform");
      const fade = backdrop
        .getAnimations()
        .find((animation) => animation.transitionProperty === "opacity");
      if (!slide || !fade)
        throw new Error("Drawer slide or backdrop fade is missing");
      for (const animation of [slide, fade]) {
        animation.pause();
        animation.currentTime = animation.effect.getTiming().duration / 2;
      }
      const box = sidebar.getBoundingClientRect();
      const result = {
        x: box.x,
        width: box.width,
        inert: sidebar.inert,
        visibility: getComputedStyle(sidebar).visibility,
        opacity: Number(getComputedStyle(backdrop).opacity),
      };
      sidebar.getAnimations().forEach((animation) => animation.finish());
      backdrop.getAnimations().forEach((animation) => animation.finish());
      return result;
    });
    assert(
      state.x < 0 && state.x > -state.width,
      "Drawer must be between its open and closed positions",
    );
    assert.equal(state.visibility, "visible");
    assert.equal(state.inert, !open);
    assert(
      state.opacity > 0 && state.opacity < 1,
      "Backdrop must fade in both directions",
    );
  }
  await page.setViewportSize({ width: 1080, height: 850 });
  await page.waitForFunction(() => !document.querySelector("#sidebar").inert);
  await page.setViewportSize({ width: 390, height: 850 });
  await page.waitForFunction(() => document.querySelector("#sidebar").inert);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#menu-toggle").click();
  assert.equal(
    await page
      .locator("#sidebar")
      .evaluate((element) => getComputedStyle(element).transitionDuration),
    "0s",
  );
  await page.keyboard.press("Escape");

  // Configuration-only slug changes retain the same routing contract.
  const configured = await context.newPage();
  await configured.addInitScript(() => {
    let navigation;
    Object.defineProperty(window, "PORTFOLIO_NAVIGATION", {
      get: () => navigation,
      set: (value) => {
        navigation = value.map((entry) =>
          entry.key === "skills" ? { ...entry, slug: "expertise" } : entry,
        );
      },
    });
  });
  await configured.goto(url + "#stack");
  await configured.waitForTimeout(200);
  assert.equal(new URL(configured.url()).hash, "#expertise");
  assert.equal(
    await configured.locator('[data-section="skills"]').getAttribute("id"),
    "expertise",
  );
  assert.equal(
    await configured.locator('[aria-current="location"]').getAttribute("href"),
    "#expertise",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(requests, []);
  await browser.close();
  console.log(
    "PASS navigation: canonical URLs, aliases, query preservation, all menu targets, history, reload, locale, scroll sync, tall/mobile layouts, config-only slug change, offline.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
