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
const mock = loadMock(root, config.mock);
const frontend = loadFrontend(root, config.frontend);
const mockPrefix = "mock-pages";

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

/** Split authored lists into independently loadable script files. */
function pages(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size)
    result.push(items.slice(index, index + size));
  return result;
}

/** Keep chunk paths safe and stable when authors add new locales or category IDs. */
function pathSegment(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(value))
    throw new Error(`Invalid mock chunk path segment: ${value}`);
  return value;
}

/** Fail the build if a locale cannot serve the same API records and memberships. */
function mockManifest(locales) {
  const canonical = locales[0];
  if (!canonical) throw new Error("At least one mock locale is required.");
  const reference = {
    experiences: mock.experiences[canonical],
    projects: mock.projects[canonical],
    categories: mock.skillCategories[canonical],
    skills: mock.skills[canonical],
  };
  for (const [name, rows] of Object.entries(reference))
    if (!Array.isArray(rows))
      throw new Error(`Missing ${name} mock for ${canonical}.`);
  /** Extract ordered record identities for cross-locale comparisons. */
  const ids = (rows) => rows.map(({ id }) => id);
  const referenceCategories = reference.categories.map(({ id, skillIds }) => ({
    id: pathSegment(id),
    skillIds,
  }));
  if (new Set(ids(reference.categories)).size !== reference.categories.length)
    throw new Error(`Duplicate skill category IDs in ${canonical}.`);
  if (new Set(ids(reference.skills)).size !== reference.skills.length)
    throw new Error(`Duplicate skill IDs in ${canonical}.`);
  const referenceSkillIds = new Set(ids(reference.skills));

  for (const locale of locales) {
    pathSegment(locale);
    if (!mock.site[locale] || !Array.isArray(mock.journey[locale]))
      throw new Error(`Missing site or journey mock for ${locale}.`);
    for (const [name, rows] of Object.entries({
      experiences: mock.experiences[locale],
      projects: mock.projects[locale],
      categories: mock.skillCategories[locale],
      skills: mock.skills[locale],
    }))
      if (!Array.isArray(rows))
        throw new Error(`Missing ${name} mock for ${locale}.`);
    for (const name of ["experiences", "projects", "skills"]) {
      if (JSON.stringify(ids(mock[name][locale])) !== JSON.stringify(ids(reference[name])))
        throw new Error(`${name} mock IDs or order differ in ${locale}.`);
    }
    const categories = mock.skillCategories[locale].map(({ id, skillIds }) => ({
      id,
      skillIds,
    }));
    if (JSON.stringify(categories) !== JSON.stringify(referenceCategories))
      throw new Error(`Skill category IDs or memberships differ in ${locale}.`);
    const localeSkillIds = new Set(ids(mock.skills[locale]));
    for (const category of categories) {
      if (!Array.isArray(category.skillIds))
        throw new Error(`Missing skill IDs for ${category.id} in ${locale}.`);
      if (new Set(category.skillIds).size !== category.skillIds.length)
        throw new Error(`Duplicate skills in ${category.id} for ${locale}.`);
      for (const id of category.skillIds)
        if (!referenceSkillIds.has(id) || !localeSkillIds.has(id))
          throw new Error(`Unknown skill ${id} in ${category.id} for ${locale}.`);
    }
  }

  return {
    kind: "lazy",
    prefix: mockPrefix,
    totals: {
      experiences: reference.experiences.length,
      projects: reference.projects.length,
    },
    categories: referenceCategories,
  };
}

/** Emit one callback per local script so file:// pages can fetch only requested data. */
function mockChunks(locales, manifest) {
  /** Register a deterministic chunk in the output manifest. */
  const add = (key, payload) => {
    const name = `${mockPrefix}/${key}.js`;
    if (files.has(name)) throw new Error(`Repeated mock chunk: ${key}`);
    files.set(
      name,
      `window.PortfolioMockChunks(${JSON.stringify(key)}, ${JSON.stringify(payload)});\n`,
    );
  };
  for (const locale of locales) {
    add(`site/${locale}`, mock.site[locale]);
    add(`journey/${locale}`, mock.journey[locale]);
    for (const resource of ["experiences", "projects"])
      pages(mock[resource][locale], 6).forEach((items, index) =>
        add(`${resource}/${locale}/${index}`, items),
      );
    pages(mock.skillCategories[locale], 12).forEach((items, index) =>
      add(`skill-categories/${locale}/${index}`, items),
    );
    const skills = new Map(mock.skills[locale].map((item) => [item.id, item]));
    for (const category of manifest.categories)
      pages(category.skillIds.map((id) => skills.get(id)), 6).forEach(
        (items, index) => add(`skills/${locale}/${category.id}/${index}`, items),
      );
  }
}

const locales = frontend.localization.supported.map(({ code }) => code);
const manifestMock = mockManifest(locales);
mockChunks(locales, manifestMock);

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
  "/* Generated application with a lazy mock manifest. */\nwindow.PORTFOLIO_MOCK = " +
    JSON.stringify(manifestMock) +
    ";\nwindow.PORTFOLIO_FRONTEND = " +
    JSON.stringify(frontend) +
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
