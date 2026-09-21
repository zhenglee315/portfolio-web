/** Build deterministic, dependency-free offline assets from the authored source tree. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { loadMock, loadFrontend } from "./lib/mock-data.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "src");
const output = path.join(root, "dist");
const config = JSON.parse(
  fs.readFileSync(path.join(root, "config/build.json")),
);
const check = process.argv.includes("--check");
const files = new Map();

/** Reject absolute or escaping manifest paths before any filesystem operation. */
function within(directory, relative) {
  const resolved = path.resolve(directory, relative);
  if (!resolved.startsWith(directory + path.sep))
    throw new Error(`Unsafe path: ${relative}`);
  return resolved;
}

/** Inline authored CSS modules once; keep local font URLs relative to the output root. */
function styles(relative, visited = new Set()) {
  if (visited.has(relative))
    throw new Error(`Repeated or circular CSS import: ${relative}`);
  visited.add(relative);
  return fs
    .readFileSync(within(source, relative), "utf8")
    .replace(/@import\s+(?:url\("([^"]+)"\)|"([^"]+)");/g, (_, url, module) => {
      const target = path.posix.normalize(
        path.posix.join(path.posix.dirname(relative), url || module),
      );
      if (url) {
        if (!target.startsWith("assets/"))
          throw new Error(
            `Only local font assets may remain imported: ${target}`,
          );
        return `@import url("${target}");`;
      }
      return `\n/* Source: ${target} */\n${styles(target, visited)}`;
    });
}

/** Copy only authored static assets; unknown files in dist are never deployed or deleted. */
function assets(relative) {
  for (const entry of fs
    .readdirSync(within(source, relative), { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Asset symlinks are unsupported: ${name}`);
    if (entry.isDirectory()) assets(name);
    else files.set(name, fs.readFileSync(within(source, name)));
  }
}

const template = fs.readFileSync(path.join(source, "index.html"), "utf8");
if (template.split("<!-- build:scripts -->").length !== 2)
  throw new Error("The template must contain exactly one script entry marker.");
files.set(
  "index.html",
  template.replace(
    "<!-- build:scripts -->",
    '<script src="app.js" defer></script>',
  ),
);
files.set("styles.css", styles(config.styles).trimEnd() + "\n");
files.set(
  "app.js",
  "/* Generated from mock/*.json; never edit the embedded data. */\nwindow.PORTFOLIO_MOCK = " +
    JSON.stringify(loadMock(root, config.mock)) +
    ";\nwindow.PORTFOLIO_FRONTEND = " +
    JSON.stringify(loadFrontend(root, config.frontend)) +
    ";\nwindow.PORTFOLIO_RUNTIME = PORTFOLIO_FRONTEND.runtime;\nwindow.PORTFOLIO_LOCALES = structuredClone(PORTFOLIO_FRONTEND.locales);\nwindow.PORTFOLIO_NAVIGATION = PORTFOLIO_FRONTEND.navigation;\nwindow.MAP_DATA = PORTFOLIO_FRONTEND.map;\n" +
    config.scripts
      .map(
        (relative) =>
          `/* Source: ${relative} */\n${fs.readFileSync(within(source, relative), "utf8")}\n;`,
      )
      .join("\n"),
);
assets(config.assets);
const manifest = {
  version: 1,
  files: Object.fromEntries(
    [...files].map(([name, body]) => [
      name,
      createHash("sha256").update(body).digest("hex"),
    ]),
  ),
};
files.set("build-manifest.json", JSON.stringify(manifest, null, 2) + "\n");

if (check) {
  const stale = [...files].filter(
    ([name, body]) =>
      !fs.existsSync(within(output, name)) ||
      !fs.readFileSync(within(output, name)).equals(Buffer.from(body)),
  );
  if (stale.length)
    throw new Error(
      `Stale build output: ${stale.map(([name]) => name).join(", ")}. Run node scripts/build.mjs.`,
    );
  console.log(`PASS deterministic build: ${files.size} files match source.`);
} else {
  const manifestPath = path.join(output, "build-manifest.json");
  const previous = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath)).files
    : {};
  for (const [name, body] of files) {
    const destination = within(output, name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, body);
  }
  for (const name of Object.keys(previous))
    if (!files.has(name)) fs.rmSync(within(output, name), { force: true });
  console.log(
    `Built ${files.size} files from src; unowned output files were preserved.`,
  );
}
