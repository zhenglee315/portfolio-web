/** Exercise offline appearance controls, HTTP cookies, lifecycle and responsive geometry. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  http = require("node:http");
const { pathToFileURL } = require("node:url");
const root = path.resolve(__dirname, "../dist");
const fileURL = pathToFileURL(path.join(root, "index.html")).href;
const key = "portfolio-appearance";
/** A private loopback server is needed only to verify browser cookie behavior. */
const server = http.createServer((request, response) => {
  const file = path.resolve(
    root,
    "." + (request.url === "/" ? "/index.html" : request.url),
  );
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file))
    return response.writeHead(404).end();
  response.setHeader(
    "Content-Type",
    {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".woff2": "font/woff2",
    }[path.extname(file)] || "application/octet-stream",
  );
  response.end(fs.readFileSync(file));
});
/** Verify theme settings, responsive controls, persistence and motion preferences. */
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
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage(),
      errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) external.push(r.url());
    });
    await page.goto(fileURL);
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    await page.waitForFunction(
      () => !document.body.classList.contains("field-entering"),
    );
    assert((await page.locator(".field-cross").count()) > 10);
    assert.equal(
      await page
        .locator(".background-field")
        .evaluate((e) => getComputedStyle(e).pointerEvents),
      "none",
    );
    assert.equal(
      await page.locator(".intro").evaluate((e) => getComputedStyle(e).opacity),
      "1",
    );
    await page.locator("#appearance-toggle").click();
    assert.equal(
      await page
        .locator("#appearance-speed")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    assert.equal(
      await page.locator("#appearance-toggle .bi-palette-fill").count(),
      1,
    );
    for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
      await page.evaluate((locale) => I18n.setLanguage(locale), locale);
      const labels = await page
        .locator("[data-theme-option] span")
        .allTextContents();
      assert.deepEqual(
        labels,
        locale === "en"
          ? ["Mint", "Ice", "Amber", "Mist"]
          : locale === "zh-Hans"
            ? ["薄荷", "冰蓝", "琥珀", "雾白"]
            : ["薄荷", "冰藍", "琥珀", "霧白"],
      );
      for (const theme of ["mint", "blue", "amber", "mist"]) {
        await page.locator(`[data-theme-option="${theme}"]`).click();
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          theme,
        );
        assert.equal(
          await page
            .locator(`[data-theme-option="${theme}"]`)
            .getAttribute("aria-pressed"),
          "true",
        );
      }
    }
    await page.locator("#appearance-speed").fill("1.6");
    await page.locator("#appearance-brightness").fill("65");
    await page.locator('[data-setting="paused"]').click();
    await page.reload();
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.deepEqual(
      await page.evaluate(() => Portfolio.get("appearanceSettings").get()),
      { theme: "mist", speed: 1.6, brightness: 65, paused: true },
    );
    // Light surfaces require readable text and accent-filled controls, not a color inversion.
    const contrast = await page.evaluate(() => {
      const probe = document.createElement("span");
      document.body.append(probe);
      /** Convert an RGB color to relative luminance for contrast assertions. */
      const luminance = (color) => {
        const channels = color
          .match(/[\d.]+/g)
          .slice(0, 3)
          .map((value) => {
            const normalized = Number(value) / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      const pairs = [
        ["text", "bg"],
        ["muted", "bg"],
        ["accent", "bg"],
        ["tag-text", "tag-surface"],
        ["city-label", "country-fill"],
        ["on-accent", "accent"],
      ];
      const results = pairs.map(([foreground, background]) => {
        probe.style.color = `var(--${foreground})`;
        probe.style.backgroundColor = `var(--${background})`;
        const style = getComputedStyle(probe);
        const values = [
          luminance(style.color),
          luminance(style.backgroundColor),
        ].sort((a, b) => b - a);
        return {
          pair: `${foreground}/${background}`,
          ratio: (values[0] + 0.05) / (values[1] + 0.05),
        };
      });
      probe.remove();
      return {
        scheme: getComputedStyle(document.documentElement).colorScheme,
        results,
      };
    });
    assert.equal(contrast.scheme, "light");
    for (const result of contrast.results)
      assert(result.ratio >= 4.5, `${result.pair}: ${result.ratio}`);
    assert.equal(
      await page
        .locator(".field-signals")
        .evaluate((e) => e.getAnimations({ subtree: true }).length),
      0,
    );
    for (const width of [320, 390, 760, 1024, 1440, 2560]) {
      await page.setViewportSize({ width, height: 950 });
      await page.locator("#appearance-toggle").click();
      const box = await page.locator("#appearance-panel").boundingBox();
      assert(
        box.x >= 0 && box.x + box.width <= width + 1,
        `Panel overflow at ${width}`,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Page overflow at ${width}`,
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#appearance-panel").isVisible(), false);
      assert.equal(
        await page
          .locator("#appearance-toggle")
          .evaluate((e) => e === document.activeElement),
        true,
      );
    }
    await page.locator("#appearance-toggle").click();
    await page.locator("[data-appearance-reset]").click();
    assert.deepEqual(
      await page.evaluate(() => Portfolio.get("appearanceSettings").get()),
      { theme: "mint", speed: 1, brightness: 80, paused: false },
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    // Media-query change events are delivered asynchronously by the browser.
    await page.waitForFunction(
      () => document.querySelector('[data-setting="paused"]').disabled,
    );
    assert.equal(
      await page.locator('[data-setting="paused"]').isDisabled(),
      true,
    );
    assert.equal(
      await page
        .locator(".field-signals")
        .evaluate((e) => e.getAnimations({ subtree: true }).length),
      0,
    );
    await page.locator("h1").click();
    assert.equal(await page.locator("#appearance-panel").isVisible(), false);
    // Capture review images from the real built page without introducing production assets.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#appearance-toggle").click();
    for (const theme of ["mint", "blue", "amber", "mist"]) {
      await page.locator(`[data-theme-option="${theme}"]`).click();
      await page.screenshot({
        path: path.resolve(__dirname, `../artifacts/appearance-${theme}.png`),
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.resolve(__dirname, "../artifacts/appearance-mobile.png"),
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await context.close();

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;
    const httpContext = await browser.newContext();
    const httpPage = await httpContext.newPage();
    await httpPage.goto(url);
    await httpPage.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    await httpPage.evaluate(() =>
      Portfolio.get("appearanceSettings").update({
        theme: "blue",
        speed: 1.2,
        brightness: 90,
        paused: true,
      }),
    );
    /** Find the persisted appearance cookie in the isolated browser context. */
    const cookie = (await httpContext.cookies()).find((c) => c.name === key);
    assert(cookie && cookie.path === "/" && cookie.sameSite === "Lax");
    // Prove the cookie, rather than the mirrored localStorage value, restores settings.
    await httpPage.evaluate(() => localStorage.clear());
    await httpPage.reload();
    await httpPage.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.deepEqual(
      await httpPage.evaluate(() => Portfolio.get("appearanceSettings").get()),
      { theme: "blue", speed: 1.2, brightness: 90, paused: true },
    );
    await httpContext.addCookies([{ name: key, value: "%bad-json", url }]);
    await httpPage.reload();
    await httpPage.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.equal(
      await httpPage.locator("html").getAttribute("data-theme"),
      "mint",
    );
    await httpPage.evaluate(() =>
      Portfolio.get("appearanceSettings").update({
        theme: "unknown",
        speed: 999,
        brightness: -10,
        paused: "false",
      }),
    );
    assert.deepEqual(
      await httpPage.evaluate(() => Portfolio.get("appearanceSettings").get()),
      { theme: "mint", speed: 2, brightness: 20, paused: false },
    );
    await httpContext.close();
    console.log(
      "Appearance: 3 locales, 4 themes, 6 widths, offline persistence, HTTP cookies, corruption, controls and reduced motion passed.",
    );
  } finally {
    server.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
