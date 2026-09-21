/** Exercise chat entry browser behavior using the actual offline page. */
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
  for (const width of [320, 390, 550, 760, 761, 1080, 1440]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      offline: true,
      hasTouch: width <= 390,
      isMobile: width <= 390,
    });
    await page.clock.install();
    await page.goto(
      pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
    );
    const id = width <= 760 ? "chatme-mobile" : "chatme-desktop";
    const bubble = page.locator("#" + id),
      toggle = page.locator(`[aria-controls="${id}"]`);
    await page.waitForFunction(
      () => document.documentElement.dataset.ready === "true",
    );
    assert.equal(
      await bubble.isVisible(),
      false,
      `${width}: hidden during frame entrance`,
    );
    const navigation = page.locator(
      width <= 760 ? ".mobile-header" : ".sidebar",
    );
    assert.equal(
      await navigation.evaluate((el) => getComputedStyle(el).opacity),
      "0",
    );
    await page.clock.fastForward(1400);
    assert.equal(
      await bubble.isVisible(),
      true,
      `${width}: revealed after page entrance`,
    );
    assert.equal(
      await navigation.evaluate((el) => getComputedStyle(el).opacity),
      "1",
    );
    assert.equal(
      await bubble.evaluate((el) => el.classList.contains("is-appearing")),
      true,
    );
    if (width === 1440) await bubble.locator(".chatme-icon").hover();
    await page.clock.fastForward(400);
    assert.equal(
      await bubble.evaluate((el) => el.classList.contains("is-appearing")),
      false,
    );
    if (width === 1440) {
      // Hover during fade-in must prevent the later idle countdown from dismissing the message.
      await page.clock.fastForward(5000);
      assert.equal(await bubble.isVisible(), true);
      assert.equal(
        await bubble.evaluate((el) => el.classList.contains("is-fading")),
        false,
      );
      await page.mouse.move(1400, 850);
    }
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    const bounds = await bubble.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
    await page.clock.fastForward(2900);
    assert.equal(await bubble.isVisible(), true);
    await page.clock.fastForward(150);
    assert.equal(
      await bubble.evaluate((el) => el.classList.contains("is-fading")),
      true,
    );
    await page.clock.fastForward(450);
    assert.equal(await bubble.isVisible(), false);
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    if (width === 550) {
      await toggle.click();
      await bubble.locator(".chatme-icon").hover();
      await page.clock.fastForward(5000);
      assert.equal(await bubble.isVisible(), true);
      await page.mouse.move(530, 850);
      await page.clock.fastForward(2900);
      assert.equal(await bubble.isVisible(), true);
      await page.clock.fastForward(150);
      await page.clock.fastForward(450);
      assert.equal(await bubble.isVisible(), false);
    }
    await page.close();
  }
  await browser.close();
  console.log(
    "PASS initial display at 320/390/550/760/761/1080/1440, offline touch devices, viewport bounds, 3s fade and small-screen hover pause.",
  );
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
