/** Exercise real startup with empty, single, exact-page and multi-page fixtures across devices. */
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { fixture } = require("./fixtures.cjs");

/** Preserve locale identities while changing collection cardinalities independently of production data. */
function dataset(count) {
  const db = fixture();
  for (const locale of Object.keys(db.site)) {
    for (const resource of ["journey", "experiences", "projects"]) {
      const base = db[resource][locale];
      db[resource][locale] = Array.from({ length: count }, (_, i) => ({
        ...structuredClone(base[i % base.length]),
        id: i + 1,
      }));
    }
  }
  const category = db.skills.categories[0];
  db.skills.categories = Array.from({ length: count }, (_, i) => ({
    ...structuredClone(category),
    id: "category-" + i,
  }));
  return db;
}

/** Assert bounded initial rendering, full page traversal, language persistence and layout limits. */
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    for (const count of [0, 1, 6, 7, 19])
      for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
        const page = await browser.newPage({
          offline: true,
          reducedMotion: "reduce",
          viewport: { width: 390, height: 844 },
        });
        const errors = [],
          external = [];
        page.on("pageerror", (e) => errors.push(e.message));
        page.on("request", (r) => {
          if (/^https?:/.test(r.url())) external.push(r.url());
        });
        await page.addInitScript(
          ({ db, locale }) => {
            localStorage.setItem("portfolio.language", locale);
            let client;
            Object.defineProperty(window, "PortfolioApi", {
              configurable: true,
              get: () => client,
              set: () => {
                window.testTransport = MockPortfolioTransport.create(db);
                client = createPortfolioApi(testTransport);
              },
            });
          },
          { db: dataset(count), locale },
        );
        await page.goto(
          pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
        );
        await page.waitForFunction(
          () => document.documentElement.dataset.ready === "true",
        );
        assert.equal(
          await page.locator(".project-card").count(),
          Math.min(6, count),
        );
        assert.equal(
          await page.locator(".experience-card").count(),
          Math.min(6, count),
        );
        assert.equal(await page.locator(".stop").count(), count);
        assert.equal(
          await page.locator(".toolkit-row").count(),
          Math.min(12, count),
        );
        assert.equal(
          await page.locator("#more-projects").count(),
          Number(count > 6),
        );
        assert.equal(
          await page.locator("#more-experiences").count(),
          Number(count > 6),
        );
        if (count === 0) {
          assert.equal(await page.locator("#play").isDisabled(), true);
          assert.equal(
            await page.locator("#journey-endpoints").isVisible(),
            false,
          );
        }
        if (count > 6) {
          await page.locator("#more-projects>summary").click();
          await page.waitForFunction(
            () => Portfolio.get("data").page("projects").page === 2,
          );
          await page.locator("#more-experiences>summary").click();
          await page.waitForFunction(
            () => Portfolio.get("data").page("experiences").page === 2,
          );
        }
        await page.evaluate(async () => {
          const data = Portfolio.get("data");
          for (const name of ["projects", "experiences", "categories"])
            while (data.page(name).hasMore) await data.loadPage(name);
        });
        assert.equal(await page.locator(".project-card").count(), count);
        assert.equal(await page.locator(".experience-card").count(), count);
        assert.equal(await page.locator(".toolkit-row").count(), count);
        for (const [width, height] of [
          [390, 844],
          [1024, 1366],
          [3840, 2160],
        ]) {
          await page.setViewportSize({ width, height });
          await page.waitForFunction(
            () => document.documentElement.scrollWidth <= innerWidth,
          );
          assert.equal(await page.locator("html").getAttribute("lang"), locale);
          if (count) {
            await page.locator('[data-project="1"]').click();
            assert.equal(
              await page
                .locator("#project-dialog")
                .evaluate((e) => e.scrollWidth <= e.clientWidth),
              true,
              `${count}/${locale}/${width} dialog overflow`,
            );
            await page.keyboard.press("Escape");
          }
        }
        assert.deepEqual(errors, [], `${count}/${locale} script errors`);
        assert.deepEqual(external, [], `${count}/${locale} external resources`);
        await page.close();
      }
    console.log(
      "PASS 0/1/6/7/19 records × 3 locales; mobile/tablet/4K; complete paging, dialogs, empty navigation and offline startup.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
