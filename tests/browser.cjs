/** Offline browser regression for feature composition, state preservation and responsive rendering. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
const { catalogs: fullCatalogs, snapshot, fixture } = require("./fixtures.cjs");
/** Exercise the actual page using stable record IDs rather than positional test selectors. */
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    const page = await browser.newPage({
        offline: true,
        reducedMotion: "reduce",
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
    );
    await page.locator("#chatme-desktop .chatme-close").click();
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    const original = snapshot(),
      catalogs = fullCatalogs();
    const experiences = fixture().experiences.en;
    const projectRows = fixture().projects.en;
    await page.evaluate(async () => {
      const data = Portfolio.get("data");
      while (data.page("projects").hasMore) await data.loadPage("projects");
    });
    // Import a complete snapshot for rendering/mutation checks; api-browser covers lazy transport separately.
    await page.evaluate(
      ({ original, catalogs }) => {
        window.PORTFOLIO_LOCALES = catalogs;
        Portfolio.get("data").replace(original);
      },
      { original, catalogs },
    );
    await page.locator("#more-projects>summary").click();
    await page.waitForFunction(
      () => document.querySelectorAll(".project-card").length === 15,
    );

    const projectIds = projectRows.map((row) => row.id),
      careerIds = experiences.map((row) => row.id);
    assert.equal(
      await page.locator(".project-card").count(),
      projectIds.length,
    );
    assert.equal(
      await page.locator(".experience-card").count(),
      careerIds.length,
    );
    // All project dialogs must render translated details without leaking content markup.
    for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
      await page.locator("#language-toggle").click();
      await page.locator(`[data-locale="${locale}"]`).click();
      if (!(await page.locator("#more-projects").evaluate((node) => node.open)))
        await page.locator("#more-projects>summary").click();
      for (const id of projectIds) {
        await page.locator(`[data-project="${id}"]`).click();
        assert.equal(await page.locator("#project-dialog").isVisible(), true);
        assert.ok((await page.locator("#dialog-title").textContent()).trim());
        await page.locator(".dialog-close").click();
      }
    }
    // Selection, elapsed playback and expanded groups survive translation and reordered records.
    await page.evaluate(
      (id) => Portfolio.get("journey").select(id),
      careerIds[2],
    );
    const skills = page
      .locator("#timeline .skills-toggle:not([hidden])")
      .first();
    await skills.click();
    const expandedId = await skills.getAttribute("aria-controls");
    await page.locator(`[data-project="${projectIds[0]}"]`).click();
    await page.evaluate(() => I18n.setLanguage("en"));
    assert.equal(await page.locator("#project-dialog").isVisible(), true);
    assert.equal(
      await page
        .locator(`[aria-controls="${expandedId}"]`)
        .getAttribute("aria-expanded"),
      "true",
    );
    await page.evaluate(() => {
      const data = Portfolio.get("data"),
        next = JSON.parse(JSON.stringify(data.snapshot));
      window.savedExperiences = structuredClone(data.experiences);
      data.replaceExperiences([...data.experiences].reverse());
      data.replaceJourney([...data.journey].reverse());
      window.savedProjects = structuredClone(data.projects);
      data.replaceProjects([...data.projects].reverse());
      data.replace(next);
    });
    assert.equal(
      await page.evaluate(() => Portfolio.get("journey").state.selectedId),
      careerIds[2],
    );
    assert.equal(
      await page
        .locator(`[aria-controls="${expandedId}"]`)
        .getAttribute("aria-expanded"),
      "true",
    );
    assert.equal(
      await page.locator("#dialog-title").textContent(),
      await page
        .locator(`[data-project-id="${projectIds[0]}"] h3`)
        .textContent(),
    );
    await page.locator(".dialog-close").click();
    await page.evaluate((snapshot) => {
      Portfolio.get("data").replace(snapshot);
      if (window.savedProjects)
        Portfolio.get("data").replaceProjects(window.savedProjects);
      if (window.savedExperiences)
        Portfolio.get("data").replaceExperiences(window.savedExperiences);
      if (window.savedJourney)
        Portfolio.get("data").replaceJourney(window.savedJourney);
    }, original);
    // Repeated months do not alter server order or duplicate cards.
    assert.deepEqual(
      await page
        .locator(".project-card")
        .evaluateAll((rows) =>
          rows.map((row) => Number(row.dataset.projectId)),
        ),
      projectIds,
    );
    // Empty snapshots clear stale content and pause playback; valid content can be restored.
    await page.evaluate(() => {
      const data = Portfolio.get("data"),
        next = JSON.parse(JSON.stringify(data.snapshot));
      window.savedJourney = structuredClone(data.journey);
      data.replaceJourney([]);
      window.savedExperiences = structuredClone(data.experiences);
      data.replaceExperiences([]);
      window.savedProjects = structuredClone(data.projects);
      data.replaceProjects([]);
      next.skillCategories = [];
      data.replace(next);
    });
    assert.equal(await page.locator(".experience-card").count(), 0);
    assert.equal(await page.locator(".project-card").count(), 0);
    assert.equal(await page.locator("#play").isDisabled(), true);
    assert.equal(await page.locator("#journey-endpoints").isVisible(), false);
    await page.evaluate((snapshot) => {
      Portfolio.get("data").replace(snapshot);
      if (window.savedProjects)
        Portfolio.get("data").replaceProjects(window.savedProjects);
      if (window.savedExperiences)
        Portfolio.get("data").replaceExperiences(window.savedExperiences);
      if (window.savedJourney)
        Portfolio.get("data").replaceJourney(window.savedJourney);
    }, original);
    // Remote text is treated as text, not executable HTML, in cards and map tooltips.
    await page.evaluate(() => {
      const data = Portfolio.get("data");
      window.savedExperiences = structuredClone(data.experiences);
      const rows = structuredClone(data.experiences);
      rows.find((row) => row.id === 6).content =
        '<img src=x onerror="window.contentExecuted=true">';
      data.replaceExperiences(rows);
    });
    assert.equal(
      await page.locator('[data-experience-id="6"] p img').count(),
      0,
    );
    assert.equal(await page.evaluate(() => !!window.contentExecuted), false);
    await page.evaluate(() =>
      Portfolio.get("data").replaceExperiences(window.savedExperiences),
    );
    // Verify the width budget, timeline alignment and page overflow across responsive layouts.
    for (const width of [
      320, 390, 760, 761, 1024, 1080, 1440, 1920, 2560, 3840,
    ]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
        await page.evaluate((value) => I18n.setLanguage(value), locale);
        await page.waitForFunction(() =>
          [...document.querySelectorAll(".tags[data-skill-preview]")].every(
            (group) => {
              if (!group.checkVisibility()) return true;
              const button = group.querySelector(".skills-toggle");
              if (button.getAttribute("aria-expanded") === "true") return true;
              const last = button.hidden
                ? group.querySelector(".skill-preview").lastElementChild
                : button;
              const box = group.getBoundingClientRect();
              return (
                !last ||
                last.getBoundingClientRect().right - box.left <=
                  box.width * 0.75 + 1
              );
            },
          ),
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `${width}/${locale}`,
        );
        const offsets = await page.evaluate(() => {
          const timeline = document.querySelector("#timeline"),
            line = getComputedStyle(timeline, "::before"),
            axis =
              timeline.getBoundingClientRect().left +
              parseFloat(line.left) +
              new DOMMatrix(line.transform).m41 +
              parseFloat(line.width) / 2;
          return [...timeline.querySelectorAll(".experience-card")].map(
            (card) => {
              const dot = getComputedStyle(card, "::before");
              return (
                card.getBoundingClientRect().left +
                parseFloat(getComputedStyle(card).borderLeftWidth) +
                parseFloat(dot.left) +
                new DOMMatrix(dot.transform).m41 +
                parseFloat(dot.width) / 2 -
                axis
              );
            },
          );
        });
        assert.ok(offsets.every((value) => Math.abs(value) < 0.03));
        await page.evaluate(
          (id) => Portfolio.get("journey").select(id),
          careerIds.at(-1),
        );
        await page.waitForFunction(() => {
          const list = document.querySelector("#stops"),
            box = list.getBoundingClientRect(),
            item = list.querySelector(".active").getBoundingClientRect();
          return item.left >= box.left - 1 && item.right <= box.right + 1;
        });
      }
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log(
      "PASS: all translated dialogs, stable-ID state, reordered/empty data, authoritative project order, safe text, 30 responsive layouts, timeline alignment and offline resources.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
