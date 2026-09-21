/** Exercise lazy rendering with large fixtures, retries, rapid interactions and offline transport injection. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url");
const { fixture } = require("./fixtures.cjs");
/** Install a mock transport through the same interface a future HTTP adapter will implement. */
async function inject(page, db, options = {}) {
  await page.addInitScript(
    ({ db, options }) => {
      let client;
      Object.defineProperty(window, "PortfolioApi", {
        configurable: true,
        get: () => client,
        set: () => {
          window.testTransport = MockPortfolioTransport.create(db, options);
          client = createPortfolioApi(window.testTransport);
        },
      });
    },
    { db, options },
  );
}
/** Check startup before and after window.load without depending on a successful site response. */
async function verifyStartup(browser) {
  const url = pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href;
  const delayed = await browser.newPage({
    offline: true,
    reducedMotion: "reduce",
  });
  await inject(delayed, fixture(), { delayMs: 100 });
  await delayed.goto(url + "#projects");
  await delayed.waitForFunction(
    () => document.documentElement.dataset.ready === "true",
  );
  await delayed.waitForFunction(
    () =>
      Math.abs(
        document.querySelector("#projects").getBoundingClientRect().top,
      ) < 100,
  );
  await delayed.locator('[data-section-menu] a[href="#skills"]').click();
  await delayed.waitForFunction(
    () =>
      document
        .querySelector('[data-section-menu] a[href="#skills"]')
        .getAttribute("aria-current") === "location",
  );
  assert.equal(new URL(delayed.url()).hash, "#skills");
  await delayed.evaluate(() =>
    window.scrollTo({ top: 0, behavior: "instant" }),
  );
  await delayed.waitForFunction(
    () =>
      document
        .querySelector('[data-section-menu] a[href="#overview"]')
        .getAttribute("aria-current") === "location",
  );
  await delayed.close();
  for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
    const page = await browser.newPage({ offline: true });
    await page.addInitScript(
      (locale) => localStorage.setItem("portfolio.language", locale),
      locale,
    );
    await inject(page, fixture(), { failures: { "/site": 1 } });
    await page.goto(url);
    await page.locator('#startup-status[role="alert"]').waitFor();
    const { frontend } = require("./fixtures.cjs");
    const catalog = frontend().locales[locale];
    assert.equal(
      await page.locator("#startup-status span").textContent(),
      catalog["ui.startupError"],
    );
    assert.equal(
      await page.locator("#startup-status button").textContent(),
      catalog["ui.retry"],
    );
    assert.equal(await page.locator("html").getAttribute("lang"), locale);
    await page.close();
  }
}
/** Assert that increasing dataset size changes pages and totals without increasing initial DOM size. */
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    await verifyStartup(browser);
    const db = fixture();
    for (const locale of Object.keys(db.projects)) {
      const base = db.projects[locale][0];
      db.projects[locale] = Array.from({ length: 126 }, (_, i) => ({
        ...structuredClone(base),
        id: 100 + i,
        skills: Array.from({ length: 120 }, (_, j) => "Example skill " + j),
      }));
      const experience = db.experiences[locale][1];
      db.experiences[locale].push(
        ...Array.from({ length: 75 }, (_, i) => ({
          ...structuredClone(experience),
          id: 100 + i,
          order: i + 6,
        })),
      );
    }
    const page = await browser.newPage({
        offline: true,
        reducedMotion: "reduce",
        viewport: { width: 390, height: 844 },
      }),
      errors = [],
      external = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) external.push(r.url());
    });
    await inject(page, db, {
      delayMs: 35,
      failures: { "/projects?page=2": 1 },
    });
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
    );
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.equal(
      await page
        .locator('#chatme-mobile [data-site="chatme.title"]')
        .textContent(),
      db.site.en.chatme.title,
    );
    assert.deepEqual(
      await page
        .locator('#chatme-mobile [data-site-paragraphs="chatme.content"] p')
        .allTextContents(),
      db.site.en.chatme.content.split("\n"),
    );
    await page.locator("#chatme-mobile .chatme-close").click();
    assert.equal(await page.locator(".experience-card").count(), 6);
    assert.equal(await page.locator(".project-card").count(), 6);
    assert.equal(
      await page.locator("#extra-projects .project-card").count(),
      0,
    );
    assert.equal(
      (
        await page.locator("#more-projects .collection-count").textContent()
      ).trim(),
      "120",
    );
    assert.equal(
      await page.evaluate(
        () =>
          testTransport.requests.filter(
            (r) =>
              (r.path === "/projects" && r.query.page > 1) ||
              r.path.startsWith("/projects/"),
          ).length,
      ),
      0,
    );
    // An error does not load the entire collection or destroy the retry cursor.
    await page.locator("#more-projects>summary").click();
    await page.waitForFunction(
      () => !!Portfolio.get("data").page("projects").error,
    );
    // An open disclosure recreated by rendering must not silently retry an error.
    await page.evaluate(() => {
      document
        .querySelector("#more-projects")
        .dispatchEvent(new Event("toggle"));
    });
    assert.equal(
      await page.evaluate(
        () =>
          testTransport.requests.filter(
            (r) => r.path === "/projects" && r.query.page > 1,
          ).length,
      ),
      1,
    );
    assert.equal(
      await page.locator("#extra-projects .project-card").count(),
      0,
    );
    await page.locator('[data-page="projects"]').click();
    await page.waitForFunction(
      () => Portfolio.get("data").page("projects").ids.length === 12,
    );
    assert.equal(
      await page.locator("#extra-projects .project-card").count(),
      6,
    );
    // Concurrent calls share one page; each subsequent action appends only six records.
    await page.evaluate(() =>
      Promise.all([
        Portfolio.get("data").loadPage("projects"),
        Portfolio.get("data").loadPage("projects"),
      ]),
    );
    assert.equal(
      await page.locator("#extra-projects .project-card").count(),
      12,
    );
    assert.equal(
      await page.evaluate(
        () =>
          testTransport.requests.filter(
            (r) => r.path === "/projects" && r.query.page > 1,
          ).length,
      ),
      3,
    );
    await page.locator("#more-projects .collapse-collection").click();
    await page.locator("#more-projects>summary").click();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("#extra-projects .project-card").length ===
        12,
    );
    assert.equal(
      await page.evaluate(
        () =>
          testTransport.requests.filter(
            (r) => r.path === "/projects" && r.query.page > 1,
          ).length,
      ),
      3,
    );
    assert.equal(
      await page.locator("#more-experiences .collection-count").textContent(),
      "75",
    );
    assert.equal(
      await page.locator("#more-experiences .bi-plus-circle-dotted").count(),
      1,
    );
    assert.equal(
      await page.evaluate(
        () =>
          testTransport.requests.filter((r) => r.path === "/experiences")
            .length,
      ),
      1,
    );
    await page.locator("#more-experiences>summary").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelectorAll(".experience-card").length === 12,
    );
    // Subsequent pages append only inside the shared disclosure; collapse keeps six cards.
    await page.locator('[data-page="experiences"]').click();
    await page.waitForFunction(
      () => document.querySelectorAll(".experience-card").length === 18,
    );
    const experienceRequests = await page.evaluate(
      () =>
        testTransport.requests.filter((r) => r.path === "/experiences").length,
    );
    await page.locator("#more-experiences .collapse-collection").click();
    assert.equal(await page.locator(".experience-card").count(), 6);
    assert.equal(
      await page
        .locator("#more-experiences>summary")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    await page.locator("#more-experiences>summary").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".experience-card").length === 18,
    );
    assert.equal(
      await page.evaluate(
        () =>
          testTransport.requests.filter((r) => r.path === "/experiences")
            .length,
      ),
      experienceRequests,
    );
    // Complete skills and detail are local; disclosure never starts another API request.
    const group = page.locator('[data-skill-owner="project-100"]');
    const before = await page.evaluate(() => testTransport.requests.length);
    await group.locator(".skills-toggle").click();
    assert.equal(await group.locator(".tag:not(button)").count(), 120);
    assert.equal(await group.locator(".skills-load-more").isVisible(), false);
    await page.locator('[data-project="100"]').click();
    assert.equal(
      await page.locator("#dialog-title").textContent(),
      db.projects.en[0].projectName,
    );
    await page.locator(".dialog-close").click();
    await page.locator('[data-project="100"]').click();
    await page.locator(".dialog-close").click();
    assert.equal(
      await page.evaluate(() => testTransport.requests.length),
      before,
    );
    const count = await page.locator("#extra-projects .project-card").count();
    await page.evaluate(() => I18n.setLanguage("zh-Hant"));
    assert.equal(
      await page.locator("#more-experiences").evaluate((e) => e.open),
      true,
    );
    assert.equal(await page.locator(".experience-card").count(), 18);
    assert.equal(
      await page.locator("#extra-projects .project-card").count(),
      count,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    // Plain editor text preserves newlines; empty details and skills produce no empty UI.
    await page.evaluate(() => {
      const data = Portfolio.get("data"),
        rows = structuredClone(data.projects);
      rows[0].intro = "<b>Plain intro</b>\nSecond line";
      rows[0].detail = {
        workflowDescription:
          '<img src=x onerror="window.injected=true">\nNext step',
        flow: ["Single step"],
        technicalDescription: null,
        contribution: "",
        outcome: null,
      };
      rows[0].skills = null;
      rows[1].detail = null;
      rows[2].detail = "";
      rows[3].detail = {
        workflowDescription: "",
        flow: null,
        technicalDescription: null,
        contribution: "",
        outcome: null,
      };
      data.replaceProjects(rows);
    });
    assert.equal(await page.locator('[data-project-id="100"] p b').count(), 0);
    assert.equal(
      await page.locator('[data-project-id="100"] .tags').count(),
      0,
    );
    for (const id of [101, 102, 103])
      assert.equal(
        await page.locator('[data-project="' + id + '"]').count(),
        0,
      );
    await page.locator('[data-project="100"]').click();
    assert.equal(await page.locator("#dialog-content img").count(), 0);
    assert.equal(
      await page.locator("#dialog-content .architecture span").count(),
      1,
    );
    assert.equal(
      await page.locator("#dialog-content .architecture i").count(),
      0,
    );
    assert.equal(await page.locator("[data-detail-field]").count(), 1);
    assert.equal(
      await page
        .locator("[data-detail-field] p")
        .evaluate((e) => getComputedStyle(e).whiteSpace),
      "pre-wrap",
    );
    assert.equal(await page.evaluate(() => !!window.injected), false);
    await page.locator(".dialog-close").click();
    // The first record beyond the six-card preview creates one bounded expansion.
    const boundaryDb = fixture();
    for (const locale of Object.keys(boundaryDb.experiences))
      boundaryDb.experiences[locale].push({
        ...structuredClone(boundaryDb.experiences[locale][0]),
        id: 100,
        order: -1,
      });
    const boundary = await browser.newPage({
      offline: true,
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    await inject(boundary, boundaryDb);
    await boundary.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
    );
    await boundary.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.equal(await boundary.locator(".experience-card").count(), 6);
    assert.equal(
      await boundary
        .locator("#more-experiences .collection-count")
        .textContent(),
      "1",
    );
    await boundary.locator("#more-experiences>summary").click();
    await boundary.waitForFunction(
      () => document.querySelectorAll(".experience-card").length === 7,
    );
    assert.equal(
      await boundary.locator('[data-page="experiences"]').count(),
      0,
    );
    // Only the first item in the entire timeline retains the default highlight.
    assert.notEqual(
      await boundary
        .locator("#extra-experiences .experience-card")
        .evaluate((e) => getComputedStyle(e).backgroundColor),
      await boundary
        .locator("#timeline > .experience-row .experience-card")
        .first()
        .evaluate((e) => getComputedStyle(e).backgroundColor),
    );
    await boundary.close();
    // Restore the saved language before the first API call and keep failed switches retryable.
    const localized = await browser.newPage({
      offline: true,
      reducedMotion: "reduce",
    });
    await localized.addInitScript(() =>
      localStorage.setItem("portfolio.language", "zh-Hant"),
    );
    const localizedFixture = fixture();
    // Distinct data proves the UI follows API keys rather than old names or Journey-derived education.
    const custom = localizedFixture.site["zh-Hant"];
    custom.brand = { title: "QA", titleSub: "BRAND", copyrightYear: 2031 };
    custom.profile = {
      ...custom.profile,
      firstName: "測試",
      familyName: "林",
      nickName: "Nick",
      content: "<b>Plain profile</b>",
      eduCode: "TEST",
      program: "Different program",
      introContent: "Custom intro",
      footerContent: "Custom footer",
    };
    custom.social.email = "test@example.com";
    custom.social.github = "";
    custom.social.medium = "";
    custom.chatme.titleSub = "Custom subtitle";
    await inject(localized, localizedFixture, {
      delayMs: 35,
      failures: { "/site?locale=zh-Hans": 1 },
    });
    await localized.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
    );
    await localized.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.equal(await localized.evaluate(() => I18n.locale), "zh-Hant");
    assert.equal(
      await localized.locator("[data-profile-name]").textContent(),
      "林測試。",
    );
    assert.equal(
      await localized.locator('[data-site="profile.content"]').textContent(),
      "<b>Plain profile</b>",
    );
    assert.equal(
      await localized.locator('[data-site="profile.content"] b').count(),
      0,
    );
    assert.equal(
      await localized.locator("#education-summary").textContent(),
      "TEST · Different program",
    );
    assert.equal(
      await localized
        .locator('[data-site="profile.footerContent"]')
        .textContent(),
      "Custom footer",
    );
    assert.equal(
      await localized.locator("#sidebar-copyright").textContent(),
      "© 2031 林測試",
    );
    assert.equal(await localized.title(), "林測試 — BRAND");
    assert.equal(
      await localized.locator('[data-social="github"]').isVisible(),
      false,
    );
    assert.equal(
      await localized
        .locator(".brand-heading .wordmark")
        .getAttribute("aria-label"),
      "林測試 — Nick 首頁",
    );
    assert.equal(
      await localized
        .locator('#chatme-desktop [data-social="email"]')
        .getAttribute("href"),
      "mailto:test@example.com",
    );
    assert.equal(
      await localized
        .locator('#chatme-desktop [data-site="chatme.titleSub"]')
        .textContent(),
      "Custom subtitle",
    );
    assert.equal(
      await localized
        .locator('#chatme-desktop [data-site="chatme.title"]')
        .textContent(),
      "倫敦 · 每週 20 小時",
    );
    assert(
      await localized.evaluate(() =>
        testTransport.requests.every(
          (request) => request.query.locale === "zh-Hant",
        ),
      ),
    );
    assert.equal(
      await localized.locator('[data-social="medium"]').isVisible(),
      false,
    );
    await localized.locator("#language-toggle").click();
    await localized.locator('[data-locale="zh-Hans"]').click();
    await localized.locator(".language-error").waitFor({ state: "visible" });
    assert.equal(await localized.evaluate(() => I18n.locale), "zh-Hant");
    await localized.locator('[data-locale="zh-Hans"]').click();
    await localized.waitForFunction(() => I18n.locale === "zh-Hans");
    assert.equal(
      await localized.locator("#education-summary").textContent(),
      [
        localizedFixture.site["zh-Hans"].profile.eduCode,
        localizedFixture.site["zh-Hans"].profile.program,
      ].join(" · "),
    );
    assert.equal(
      await localized
        .locator('#chatme-desktop [data-site="chatme.title"]')
        .textContent(),
      "伦敦 · 每周 20 小时",
    );
    assert.equal(await localized.locator(".language-error").count(), 0);
    await localized.evaluate(() =>
      Promise.all([I18n.setLanguage("en"), I18n.setLanguage("zh-Hant")]),
    );
    assert.equal(await localized.evaluate(() => I18n.locale), "zh-Hant");
    await localized.close();
    console.log(
      "PASS 126 projects, 81 experiences, 120 complete skills: bounded collection pages, retries, deduplication, local details, cached reopen, language preservation and offline operation.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
