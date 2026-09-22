/** Run the documented regression suites and retain a machine-readable execution report. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const unitOnly = process.argv.includes("--unit");
const suites = [
  ["build", ["scripts/build.mjs", "--check"]],
  [
    "contracts",
    [
      "--test",
      "tests/data.test.cjs",
      "tests/build.test.cjs",
      "tests/api.test.cjs",
      "tests/experiences.test.cjs",
      "tests/projects.test.cjs",
      "tests/spec.test.cjs",
      "tests/maintenance.test.cjs",
    ],
  ],
  ...(!unitOnly
    ? [
        ["composition-rwd", ["tests/browser.cjs"]],
        ["journey", ["tests/journey-browser.cjs"]],
        ["navigation", ["tests/navigation-browser.cjs"]],
        ["sidebar-rail", ["tests/sidebar-rail-browser.cjs"]],
        ["chat-idle", ["tests/chat-idle-browser.cjs"]],
        ["chat-entry", ["tests/chat-entry-browser.cjs"]],
        ["cold-entry", ["tests/cold-entry-browser.cjs"]],
        ["interactions", ["tests/interactions-browser.cjs"]],
        ["appearance", ["tests/appearance-browser.cjs"]],
        ["api-lazy-loading", ["tests/api-browser.cjs"]],
        ["data-boundaries", ["tests/boundaries-browser.cjs"]],
      ]
    : []),
];
const results = [];
for (const [suite, args] of suites) {
  console.log(`\nRunning ${suite}`);
  const start = Date.now();
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  results.push({
    suite,
    passed: result.status === 0,
    durationMs: Date.now() - start,
    exitCode: result.status,
    error: result.error?.message,
  });
}
fs.mkdirSync(new URL("../artifacts/", import.meta.url), { recursive: true });
fs.writeFileSync(
  new URL("../artifacts/test-results.json", import.meta.url),
  JSON.stringify(
    {
      completedAt: new Date().toISOString(),
      mode: unitOnly ? "unit" : "full",
      results,
    },
    null,
    2,
  ) + "\n",
);
const failed = results.filter((result) => !result.passed);
console.log(
  `\n${results.length - failed.length}/${results.length} suites passed.`,
);
if (failed.length) process.exitCode = 1;
