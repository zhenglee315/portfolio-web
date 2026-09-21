/** Verify the desktop icon rail, localized tooltips, animated layout and mobile isolation. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
/** Exercise desktop rail transitions, tooltips, themes and mobile isolation. */
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    const context = await browser.newContext({
      offline: true,
      viewport: { width: 1440, height: 950 },
    });
    const page = await context.newPage(),
      errors = [],
      external = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) external.push(request.url());
    });
    await page.addInitScript(() =>
      localStorage.setItem(
        "portfolio-appearance",
        JSON.stringify({
          theme: "mint",
          speed: 1,
          brightness: 80,
          paused: true,
        }),
      ),
    );
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
    );
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    const toggle = page.locator("#sidebar-toggle"),
      rail = page.locator("#sidebar");
    // Both directions resize the rail, content and decorative field together.
    for (const collapsed of [true, false]) {
      await toggle.click();
      const midpoint = await page.evaluate(async () => {
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        const rail = document.querySelector("#sidebar"),
          main = document.querySelector("main"),
          field = document.querySelector(".background-field");
        const transitions = [
          [rail, "width"],
          [main, "margin-left"],
          [field, "left"],
        ].map(([element, property]) =>
          element
            .getAnimations()
            .find((animation) => animation.transitionProperty === property),
        );
        if (transitions.some((animation) => !animation))
          throw new Error("Missing coordinated rail transition");
        transitions.forEach((animation) => {
          animation.pause();
          animation.currentTime = animation.effect.getTiming().duration / 2;
        });
        const result = {
          width: rail.getBoundingClientRect().width,
          margin: parseFloat(getComputedStyle(main).marginLeft),
          field: field.getBoundingClientRect().left,
        };
        for (const element of [rail, main, field])
          element.getAnimations().forEach((animation) => animation.finish());
        return result;
      });
      assert(midpoint.width > 80 && midpoint.width < 260);
      assert(Math.abs(midpoint.width - midpoint.margin) < 1);
      assert(Math.abs(midpoint.width - midpoint.field) < 1);
      assert.equal(
        await toggle.getAttribute("aria-expanded"),
        String(!collapsed),
      );
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await toggle.click();
    for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
      await page.evaluate((locale) => I18n.setLanguage(locale), locale);
      for (const link of await page.locator("[data-section-menu] a").all()) {
        await link.hover();
        const text = await link.locator(".nav-label").textContent();
        assert.equal(
          await page.locator("#sidebar-tooltip").textContent(),
          text,
        );
        assert.equal(await page.locator("#sidebar-tooltip").isVisible(), true);
        assert.equal(await link.getAttribute("aria-label"), text);
        assert.equal(await link.locator(".nav-label").isVisible(), false);
      }
    }
    const first = page.locator("[data-section-menu] a").first();
    await first.focus();
    assert.equal(
      await first.getAttribute("aria-describedby"),
      "sidebar-tooltip",
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#sidebar-tooltip").isVisible(), false);
    for (const width of [761, 1080, 1440, 2560]) {
      await page.setViewportSize({ width, height: 950 });
      assert.equal((await rail.boundingBox()).width, 80);
      assert.equal(
        await page
          .locator("main")
          .evaluate((e) => getComputedStyle(e).marginLeft),
        "80px",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    await first.click();
    assert.equal(new URL(page.url()).hash, "#overview");
    // An open chat bubble follows the resized rail without a window resize event.
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.locator(".brand-heading .chatme-toggle").click();
    await toggle.click();
    await page.waitForFunction(
      () =>
        Math.abs(
          document.querySelector("#chatme-desktop").getBoundingClientRect()
            .left -
            (document
              .querySelector(".brand-heading .chatme-toggle")
              .getBoundingClientRect().right +
              18),
        ) < 2,
    );
    await toggle.click();
    await page.waitForFunction(
      () =>
        Math.abs(
          document.querySelector("#chatme-desktop").getBoundingClientRect()
            .left -
            (document
              .querySelector(".brand-heading .chatme-toggle")
              .getBoundingClientRect().right +
              18),
        ) < 2,
    );
    await first.hover();
    await page.screenshot({
      path: path.resolve(__dirname, "../artifacts/sidebar-compact.png"),
    });
    await page.evaluate(() =>
      Portfolio.get("appearanceSettings").update({ theme: "mist" }),
    );
    await page.screenshot({
      path: path.resolve(__dirname, "../artifacts/sidebar-compact-light.png"),
    });
    // Mobile keeps the full drawer; desktop compact state is restored when returning.
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await toggle.isVisible(), false);
    await page.locator("#menu-toggle").click();
    assert.equal((await rail.boundingBox()).width, 250);
    assert.equal(await page.locator(".nav-label").first().isVisible(), true);
    assert.equal(await page.locator("#sidebar-tooltip").isVisible(), false);
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.waitForFunction(() => !document.querySelector("#sidebar").inert);
    assert.equal((await rail.boundingBox()).width, 80);
    await toggle.click();
    assert.equal(await page.locator(".nav-label").first().isVisible(), true);
    assert.equal(await page.locator(".sidebar-foot").isVisible(), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();
    console.log(
      "PASS desktop rail: both animation directions, layout alignment, 3 locales, hover/focus labels, routes, chat anchoring, 4 desktop widths, mobile isolation and offline.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
