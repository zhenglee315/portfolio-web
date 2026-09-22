/** Capture the real offline UI and its interactive states for the bilingual README gallery. */
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, "docs/images");

/** Wait for layout observers before freezing a screenshot; never alter application CSS or mock data. */
async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

/** Open the actual offline build with fresh preferences and finish the automatic greeting before capture. */
async function openPage(browser, width = 1440, height = 1100, locale = "en") {
  const page = await browser.newPage({
    offline: true,
    reducedMotion: "reduce",
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.addInitScript(
    (locale) => localStorage.setItem("portfolio.language", locale),
    locale,
  );
  await page.goto(pathToFileURL(path.join(root, "dist/index.html")).href);
  await page.waitForFunction(
    () => document.documentElement.dataset.ready === "true",
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Portfolio.get("backgroundField").whenReady;
  });
  await page.locator(".chatme-bubble:not([hidden]) .chatme-close").click();
  await page.mouse.move(0, 0);
  await settle(page);
  return page;
}

/** Save either a complete component or a viewport, preserving the real responsive layout. */
async function capture(page, name, selector) {
  await settle(page);
  const target = selector ? page.locator(selector) : page;
  await target.screenshot({
    path: path.join(out, name + ".png"),
    animations: "disabled",
  });
  console.log("Captured " + name + ".png");
}

/** Capture four themes and meaningful feature states through the same controls available to visitors. */
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    const page = await openPage(browser);
    await capture(page, "desktop");
    for (const theme of ["mint", "blue", "amber", "mist"]) {
      await page.locator("#appearance-toggle").click();
      await page.locator(`[data-theme-option="${theme}"]`).click();
      assert.equal(
        await page.locator("html").getAttribute("data-theme"),
        theme,
      );
      await page.keyboard.press("Escape");
      await capture(page, "theme-" + theme);
    }
    await page.locator("#appearance-toggle").click();
    await page.locator('[data-theme-option="mint"]').click();
    await capture(page, "appearance", "#appearance-panel");
    await page.keyboard.press("Escape");
    await page.locator('.city-node[data-stop="3"]').focus();
    await page.locator("#city-bubble").waitFor({ state: "visible" });
    await capture(page, "journey", '[data-section="journey"]');
    await page.keyboard.press("Escape");
    await capture(page, "experience", '[data-section="experience"]');
    await page.locator('[data-experience-id="4"] .skills-toggle').click();
    await capture(page, "experience-skills", '[data-experience-id="4"]');
    await capture(page, "projects", '[data-section="projects"]');
    await page.locator("#more-projects > summary").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".project-card").length === 12,
    );
    await capture(page, "projects-expanded", "#more-projects");
    await page.locator('[data-project="1"]').click();
    await page.locator("#project-dialog").waitFor({ state: "visible" });
    // A taller viewport fits the complete detail content without changing the dialog styles.
    await page.setViewportSize({ width: 1440, height: 1600 });
    await settle(page);
    const skills = page.locator("#project-dialog .skills-toggle:not([hidden])");
    if (await skills.count()) await skills.click();
    assert(
      await page
        .locator("#project-dialog")
        .evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
      "Detail screenshot must contain every section",
    );
    await capture(page, "project-detail", "#project-dialog");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 1440, height: 1100 });
    await capture(page, "skills", '[data-section="skills"]');
    for (
      let index = 0;
      index < (await page.locator("#toolkit .toolkit-row").count());
      index++
    ) {
      const button = page
        .locator("#toolkit .toolkit-row")
        .nth(index)
        .locator(".skills-toggle:not([hidden])");
      if (await button.count()) await button.click();
    }
    await page.waitForFunction(() =>
      [...document.querySelectorAll("#toolkit .skills-toggle")].every(
        (el) => el.hidden || el.getAttribute("aria-expanded") === "true",
      ),
    );
    await page.waitForFunction(
      () => !document.querySelector('#toolkit [aria-busy="true"]'),
    );
    await capture(page, "skills-expanded", '[data-section="skills"]');
    await page.close();
    const mobile = await openPage(browser, 390, 844, "zh-Hant");
    await capture(mobile, "mobile");
    await mobile.close();
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
