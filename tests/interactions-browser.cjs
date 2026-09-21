/** Cover shared UI contracts, pointer/keyboard states and native resource loading offline. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
/** Exercise visible outcomes and state transitions beyond the data-composition regression. */
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
    const url = pathToFileURL(
      path.resolve(__dirname, "../dist/index.html"),
    ).href;
    await page.goto(url);
    await page.evaluate(async () => {
      await document.fonts.ready;
      Portfolio.get("journey").select(1);
    });
    // The decorative glow tracks viewport coordinates without becoming a click target.
    await page.mouse.move(650, 400);
    await page.waitForFunction(() => {
      const glow = document.querySelector(".pointer-glow");
      return (
        glow.classList.contains("is-visible") &&
        glow.style.getPropertyValue("--pointer-glow-x") === "650px" &&
        glow.style.getPropertyValue("--pointer-glow-y") === "400px"
      );
    });
    assert.equal(
      await page
        .locator(".pointer-glow")
        .evaluate((element) => getComputedStyle(element).pointerEvents),
      "none",
    );
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(
      await page
        .locator(".pointer-glow")
        .evaluate((element) => element.classList.contains("is-visible")),
      false,
    );
    // SiteData supplies social links; career data and frontend settings supply the other checks.
    assert.deepEqual(
      await page.evaluate(() => {
        const data = Portfolio.get("data"),
          last = data.journey.at(-1);
        return {
          social: [...document.querySelectorAll("[data-social]")].every(
            (e) =>
              e.getAttribute("href") ===
              (e.dataset.social === "email" ? "mailto:" : "") +
                Portfolio.get("data").site.social[e.dataset.social],
          ),
          endpoints:
            document.querySelector("#journey-endpoints").textContent ===
            data.journey[0].city + " → " + last.city,
          count: document
            .querySelector("#journey-summary")
            .textContent.includes(String(data.journey.length)),
          tenure: document
            .querySelector("#work-tenure")
            .textContent.includes("6 years 2 months"),
          footer: document
            .querySelector("#footer-copyright")
            .textContent.includes(last.city),
          categories:
            document.querySelectorAll(".toolkit-row").length ===
            data.snapshot.skillCategories.length,
          education:
            document.querySelectorAll(
              '[data-category="education"] .bi-mortarboard-fill',
            ).length === 2,
          work:
            document.querySelectorAll(
              '[data-category="work"] .bi-building-fill',
            ).length === 4,
          navIcons:
            !!document.querySelector('[href="#skills"] .bi-braces-asterisk') &&
            !!document.querySelector('[href="#projects"] .bi-award-fill'),
          localFonts:
            document.fonts.check('16px "DM Sans"') &&
            document.fonts.check('12px "IBM Plex Mono"'),
          finalCountry:
            document.querySelectorAll(".country.final-country").length === 1,
        };
      }),
      Object.fromEntries(
        [
          "social",
          "endpoints",
          "count",
          "tenure",
          "footer",
          "categories",
          "education",
          "work",
          "navIcons",
          "localFonts",
          "finalCountry",
        ].map((k) => [k, true]),
      ),
    );
    const chat = page.locator("#chatme-desktop");
    // Exactly six records require no disclosure or redundant pagination control.
    assert.equal(await page.locator("#more-experiences").count(), 0);
    await page.locator(".brand-heading .chatme-toggle").click();
    if (!(await chat.isVisible()))
      await page.locator(".brand-heading .chatme-toggle").click();
    const close = chat.locator(".chatme-close");
    await close.hover();
    assert.equal(
      await close.evaluate((e) => getComputedStyle(e).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    assert.equal(await close.locator(".bi-x-lg").count(), 1);
    assert.equal(
      await chat
        .locator("img")
        .evaluate((e) => e.complete && e.naturalWidth > 0),
      true,
    );
    assert.equal(
      await chat.evaluate((e) => getComputedStyle(e).transitionDuration),
      "0.4s",
    );
    await page.keyboard.press("Escape");
    assert.equal(await chat.isVisible(), false);
    // Default emphasis returns to the first card when the pointer leaves all cards.
    for (const [cards, dotOwner] of [
      [".experience-card", null],
      [
        "#project-grid > .project-time-row .project-card",
        ".project-group-cards",
      ],
    ]) {
      const first = page.locator(cards).first(),
        second = page.locator(cards).nth(1);
      await first.scrollIntoViewIfNeeded();
      await page.mouse.move(1, 1);
      /** Inspect computed pulse parameters for icon animation assertions. */
      const pulse = (locator) =>
        locator.evaluate(
          (e, owner) =>
            getComputedStyle(owner ? e.closest(owner) : e, "::before")
              .animationName,
          dotOwner,
        );
      assert.equal(await pulse(first), "timeline-point-breathe");
      await second.hover();
      assert.equal(await pulse(second), "timeline-point-breathe");
      assert.equal(await pulse(first), "none");
      await page.mouse.move(1, 1);
      assert.equal(await pulse(first), "timeline-point-breathe");
    }
    // Native dialog close paths restore the same stable opener, and history has one close control.
    const opener = page.locator('[data-project="4"]');
    await opener.click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#project-dialog").isVisible(), false);
    assert.equal(
      await opener.evaluate((e) => e === document.activeElement),
      true,
    );
    await opener.click();
    await page.mouse.click(5, 5);
    assert.equal(await page.locator("#project-dialog").isVisible(), false);
    // Native dialog close restores focus asynchronously; wait before issuing the next keyboard action.
    await page.waitForFunction(
      () => document.activeElement?.dataset.project === "4",
    );
    await page.locator("#more-projects>summary").focus();
    await page.keyboard.press("Enter");
    await page.waitForFunction(
      () => document.querySelector("#more-projects").open,
    );
    assert.equal(
      await page.locator("#more-projects>summary").isVisible(),
      false,
    );
    await page.locator("#more-projects .collapse-collection").click();
    assert.equal(
      await page.locator("#more-projects").evaluate((e) => e.open),
      false,
    );
    assert.equal(
      await page
        .locator("#more-projects>summary")
        .evaluate((e) => e === document.activeElement),
      true,
    );
    // All shared preview groups expose the real hidden count and restore all tags on expansion.
    const groups = page.locator(".tags[data-skill-preview]");
    for (let i = 0; i < (await groups.count()); i++) {
      const group = groups.nth(i),
        button = group.locator(".skills-toggle");
      if (!(await group.isVisible()) || !(await button.isVisible())) continue;
      const hidden = await group.evaluate(
        (node) =>
          Portfolio.get("data").skillsState(node.dataset.skillOwner).total -
          Number(node.dataset.previewCount),
      );
      assert((await button.textContent()).includes(String(hidden)));
      await button.click();
      assert.equal(await button.getAttribute("aria-expanded"), "true");
      assert.equal(await group.locator(".extra-skills").isVisible(), true);
      await button.click();
      assert.equal(await button.getAttribute("aria-expanded"), "false");
    }
    // Keyboard menu behavior, persisted preference and translated metadata survive a reload.
    await page.locator("#language-toggle").focus();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("html").getAttribute("lang"), "zh-Hant");
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("lang"), "zh-Hant");
    assert.equal(
      await page.evaluate(
        () =>
          document.title ===
          Portfolio.get("siteContent").fullName(
            Portfolio.get("data").site.profile,
          ) +
            " — " +
            Portfolio.get("data").site.brand.titleSub,
      ),
      true,
    );
    assert.equal(
      await page.evaluate(
        () =>
          document.querySelector('meta[name="description"]').content ===
          Portfolio.get("data").site.profile.content,
      ),
      true,
    );
    await page.locator("#language-toggle").click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#language-menu").isVisible(), false);
    // Drawer and chatme close when interacting outside; Escape also closes the drawer.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#menu-toggle").click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#menu-toggle").getAttribute("aria-expanded"),
      "false",
    );
    await page.locator("#menu-toggle").click();
    await page
      .locator("#menu-backdrop")
      .click({ position: { x: 380, y: 400 } });
    assert.equal(
      await page.locator("#menu-toggle").getAttribute("aria-expanded"),
      "false",
    );
    await page.locator(".mobile-header .chatme-toggle").click();
    await page.mouse.click(380, 800);
    assert.equal(await page.locator("#chatme-mobile").isVisible(), false);
    // Blocking storage still permits translation with an in-memory preference.
    const blocked = await context.newPage();
    await blocked.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new Error("Storage unavailable");
        },
      });
    });
    await blocked.goto(url);
    await blocked.evaluate(() => I18n.setLanguage("zh-Hans"));
    assert.equal(await blocked.locator("html").getAttribute("lang"), "zh-Hans");
    await blocked.close();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".pointer-glow")).display ===
        "none",
    );
    const touch = await browser.newPage({
      offline: true,
      isMobile: true,
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    await touch.goto(url);
    await touch.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.equal(
      await touch
        .locator(".pointer-glow")
        .evaluate((element) => getComputedStyle(element).display),
      "none",
    );
    await touch.close();
    assert.equal(
      await page
        .locator(".experience-card")
        .first()
        .evaluate((e) => getComputedStyle(e, "::before").animationName),
      "none",
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    console.log(
      "PASS shared labels, icons, resources, timeline hover, dialog/history focus, skill counts, keyboard language, persistence, storage fallback, mobile close and reduced motion.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
