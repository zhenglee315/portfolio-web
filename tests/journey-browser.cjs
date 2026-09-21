/** Verify route arrival, tooltip delegation and arbitrary destination counts in an offline browser. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  path = require("node:path");
const { pathToFileURL } = require("node:url");
/** Exercise behavior independently from the page's current number of career records. */
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
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href +
        "#journey",
    );
    const original = await page.evaluate(() =>
      JSON.parse(JSON.stringify(Portfolio.get("data").journey)),
    );
    const order = original.map((row) => row.id);
    await page.clock.runFor(6800);
    assert.equal(
      await page.locator(".city-node.selected").getAttribute("data-stop"),
      String(order[1]),
    );
    assert.equal(
      await page
        .locator(".city-node.selected .halo")
        .evaluate((node) => getComputedStyle(node).animationName),
      "city-breathe",
    );
    assert.equal(
      await page.locator(".stop.active").getAttribute("data-stop"),
      String(order[0]),
    );
    await page.clock.runFor(600);
    assert.equal(
      await page.locator(".stop.active").getAttribute("data-stop"),
      String(order[1]),
    );
    await page
      .locator(`.city-node[data-stop="${order.at(-1)}"] .city-core`)
      .click();
    assert.equal(
      await page.evaluate(() => Portfolio.get("journey").state.playing),
      false,
    );
    assert.equal(await page.locator("#city-bubble").isVisible(), true);
    // Resuming after a manual selection updates the same playback controller.
    await page.locator("#play").click();
    assert.equal(
      await page.evaluate(() => Portfolio.get("journey").state.playing),
      true,
    );
    await page.locator("#play").click();
    assert.equal(
      await page.evaluate(() => Portfolio.get("journey").state.playing),
      false,
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#city-bubble").isVisible(), false);
    await page.mouse.move(1400, 990);
    await page.locator(`.city-node[data-stop="${order[2]}"]`).focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(() => Portfolio.get("journey").state.selectedId),
      order[2],
    );
    await page.evaluate(() => I18n.setLanguage("zh-Hant"));
    assert.equal(await page.locator("#city-bubble").isVisible(), true);
    await page.keyboard.press("Escape");
    // One stop and many stops are data changes, not hand-built DOM fixtures.
    for (const count of [1, 24]) {
      await page.evaluate(
        ({ snapshot, count }) => {
          snapshot = Array.from({ length: count }, (_, i) => ({
            ...snapshot[i % snapshot.length],
            id: i + 100,
          }));
          Portfolio.get("data").replaceJourney(snapshot);
        },
        { snapshot: original, count },
      );
      await page.clock.runFor(150);
      assert.equal(await page.locator("#stops .stop").count(), count);
      assert.equal(await page.locator(".stops-next").isVisible(), count === 24);
      if (count === 24) {
        await page.locator(".stops-next").click();
        await page.clock.runFor(700);
        assert.ok(
          (await page.locator("#stops").evaluate((node) => node.scrollLeft)) >
            0,
        );
        await page.locator("#stops .stop").first().focus();
        await page.keyboard.press("End");
        await page.clock.runFor(700);
        assert.equal(
          await page
            .locator("#stops .stop")
            .last()
            .evaluate((node) => node === document.activeElement),
          true,
        );
        await page.locator("#stops .stop").last().click();
        assert.equal(
          await page.evaluate(() => Portfolio.get("journey").state.selectedId),
          123,
        );
      }
    }
    await page.evaluate(
      (snapshot) => Portfolio.get("data").replaceJourney(snapshot),
      original,
    );
    await page.locator("#restart").click();
    await page.evaluate(
      (id) => Portfolio.get("journey").select(id, false),
      order.at(-1),
    );
    await page.clock.runFor(3100);
    assert.equal(
      await page.locator(".stop.active").getAttribute("data-stop"),
      String(order[0]),
    );
    // The API fields drive tooltip content and icons without organization or location lookups.
    await page.evaluate(() => Portfolio.get("journey").select(6));
    await page.locator('.city-node[data-stop="6"]').focus();
    assert.equal(
      await page.locator("#city-bubble .bi-mortarboard-fill").count(),
      1,
    );
    assert.equal(
      await page
        .locator("#city-bubble .journey-organization-name span")
        .last()
        .textContent(),
      original.at(-1).organizationName,
    );
    await page.locator('.city-node[data-stop="2"]').focus();
    assert.equal(
      await page.locator("#city-bubble .bi-building-fill").count(),
      1,
    );
    // Resize and translate before measuring labels; visible labels must avoid one another.
    for (const width of [320, 390, 760, 1080, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
        await page.evaluate((l) => I18n.setLanguage(l), locale);
        await page.clock.runFor(120);
        const failures = await page.evaluate(() => {
          const map = document
            .querySelector("#journey-map")
            .getBoundingClientRect();
          const labels = [
            ...document.querySelectorAll('.city-label[visibility="visible"]'),
          ].map((n) => n.getBoundingClientRect());
          /** Measure intersecting label rectangles to detect layout collisions. */
          const overlap = (a, b) =>
            a.left < b.right - 1 &&
            a.right > b.left + 1 &&
            a.top < b.bottom - 1 &&
            a.bottom > b.top + 1;
          return labels.some(
            (a, i) =>
              a.left < map.left - 1 ||
              a.right > map.right + 1 ||
              a.top < map.top - 1 ||
              a.bottom > map.bottom + 1 ||
              labels.slice(i + 1).some((b) => overlap(a, b)),
          );
        });
        assert.equal(failures, false, `label layout ${width}/${locale}`);
      }
    }
    // A new location needs only coordinates and direct text; the view expands beyond the old crop.
    await page.evaluate(() => {
      const data = Portfolio.get("data"),
        rows = structuredClone(data.journey);
      rows[0] = {
        ...rows[0],
        city: "New destination",
        countryCode: "USA",
        countryName: "United States",
        latitude: 40.7,
        longitude: -74,
        organizationName: "<b>Plain name</b>",
        organizationTitle: "New title",
        detail: null,
      };
      data.replaceJourney(rows);
      Portfolio.get("journey").select(rows[0].id);
    });
    await page.clock.runFor(120);
    await page.locator('.city-node[data-stop="1"]').focus();
    assert.equal(
      await page.locator("#city-bubble .journey-organization-name b").count(),
      0,
    );
    assert.equal(
      await page
        .locator("#city-bubble .journey-organization-title")
        .textContent(),
      "New title",
    );
    assert.equal(await page.locator("#city-bubble .journey-detail").count(), 0);
    assert(
      await page
        .locator("#journey-map")
        .evaluate((n) => n.viewBox.baseVal.x < 0),
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS arrival highlighting, playback, manual pause, keyboard/tooltips, language, one/24 stops and restart loop.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
