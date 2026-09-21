/** Exercise chat idle browser behavior using the actual offline page. */
const { pathToFileURL } = require("node:url");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
    headless: true,
  });
  const p = await b.newPage({
    viewport: { width: 1440, height: 1000 },
    offline: true,
  });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.clock.install();
  await p.goto(
    pathToFileURL(path.resolve(__dirname, "../dist/index.html")).href,
  );
  const bubble = p.locator("#chatme-desktop"),
    toggle = p.locator(".brand-heading .chatme-toggle");
  /** Observe the active fade state without introducing fixed timing assumptions. */
  const fading = () =>
    bubble.evaluate((el) => el.classList.contains("is-fading"));
  await p.waitForFunction(
    () => document.documentElement.dataset.ready === "true",
  );
  await p.clock.fastForward(1400);
  await p.clock.fastForward(400);
  await p.clock.fastForward(3050);
  assert.equal(await fading(), true);
  await p.clock.fastForward(450);
  assert.equal(await bubble.isVisible(), false);
  await toggle.click();
  await p.mouse.move(1000, 10);
  await p.clock.fastForward(3050);
  assert.equal(await fading(), true);
  await p.clock.fastForward(450);
  assert.equal(await bubble.isVisible(), false);
  await toggle.click();
  await bubble.locator(".chatme-icon").hover();
  await p.clock.fastForward(5000);
  assert.equal(await bubble.isVisible(), true);
  assert.equal(await fading(), false);
  await p.mouse.move(1000, 10);
  await p.clock.fastForward(2800);
  assert.equal(await fading(), false);
  await p.clock.fastForward(250);
  assert.equal(await fading(), true);
  await bubble.locator(".chatme-icon").hover();
  await p.clock.fastForward(1000);
  assert.equal(await bubble.isVisible(), true);
  assert.equal(await fading(), false);
  await bubble.locator(".chatme-close").click();
  assert.equal(await bubble.isVisible(), false);
  await toggle.click();
  await p.mouse.move(1000, 10);
  await p.keyboard.press("Tab");
  await bubble.locator(".chatme-close").focus();
  await p.clock.fastForward(5000);
  assert.equal(await bubble.isVisible(), true);
  await toggle.focus();
  await p.clock.fastForward(3050);
  await p.clock.fastForward(450);
  assert.equal(await bubble.isVisible(), false);
  await p.setViewportSize({ width: 390, height: 850 });
  const mobile = p.locator("#chatme-mobile");
  await p.locator(".mobile-header .chatme-toggle").click();
  await p.mouse.move(380, 800);
  await p.clock.fastForward(3050);
  assert.equal(
    await mobile.evaluate((el) => el.classList.contains("is-fading")),
    true,
  );
  await p.clock.fastForward(450);
  assert.equal(await mobile.isVisible(), false);
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.locator(".mobile-header .chatme-toggle").click();
  await p.mouse.move(380, 800);
  await p.clock.fastForward(3050);
  assert.equal(await mobile.isVisible(), false);
  assert.deepEqual(errors, []);
  await b.close();
  console.log(
    "PASS initial/reopen timeout, hover pause, full 3s after leave, fade rescue, close, keyboard focus, mobile, reduced motion, offline.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
