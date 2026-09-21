/** Capture actual local UI screenshots for repository documentation without touching deployment thumbnails. */
const fs = require("node:fs"),
  path = require("node:path"),
  { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

/** Use deterministic appearance preferences and real mock content for reproducible README previews. */
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  const root = path.resolve(__dirname, ".."),
    out = path.join(root, "docs/images");
  fs.mkdirSync(out, { recursive: true });
  try {
    for (const [name, width, height, locale] of [
      ["desktop", 1440, 1100, "en"],
      ["mobile", 390, 844, "zh-Hant"],
    ]) {
      const page = await browser.newPage({
        offline: true,
        reducedMotion: "reduce",
        viewport: { width, height },
        deviceScaleFactor: 1,
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
        for (const bubble of document.querySelectorAll(
          ".chatme-bubble:not([hidden])",
        ))
          bubble.querySelector(".chatme-close")?.click();
      });
      await page.screenshot({ path: path.join(out, name + ".png") });
      await page.close();
    }
    console.log(
      "Captured docs/images/desktop.png and mobile.png from the local offline site.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
