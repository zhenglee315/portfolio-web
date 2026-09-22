/** Guard source ownership, theme composition and documentation against future drift. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const root = path.resolve(__dirname, "..");
/** Read maintained source text relative to the repository root. */
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
/** List regular files with portable paths, excluding generated and vendor content. */
function files(directory) {
  return fs
    .readdirSync(path.join(root, directory), { recursive: true })
    .filter((file) => fs.statSync(path.join(root, directory, file)).isFile())
    .map((file) => path.posix.join(directory, file.replaceAll(path.sep, "/")));
}
test("authored files have documented ownership and code entry comments", () => {
  const ownership = read("docs/project-structure.md");
  assert(read("README.md").includes("docs/project-structure.md"));
  const authored = ["src", "scripts", "tests", "docs", "mock", "config", "spec"]
    .flatMap(files)
    .filter((file) => !file.startsWith("src/assets/"));
  for (const file of authored) {
    assert(
      ownership.includes(file),
      `Project structure is missing a file responsibility: ${file}`,
    );
    if (/\.(?:js|mjs|cjs|css)$/.test(file))
      assert.match(
        read(file).trimStart(),
        /^(?:\/\*|\/\/)/,
        `${file}: missing English module comment`,
      );
  }
  const config = JSON.parse(read("config/build.json"));
  assert.deepEqual(
    files("mock")
      .filter((file) => file.endsWith(".json"))
      .sort(),
    config.mock.files.map((file) => `mock/${file}.json`).sort(),
    "Every business JSON must be registered exactly once",
  );
});
test("named function comments and generated reference stay synchronized", async () => {
  const { functionDocument } = await import(
    "../scripts/document-functions.mjs"
  );
  assert.equal(
    read("docs/function-reference.md").replaceAll("\r\n", "\n"),
    functionDocument(),
  );
});
test("every stylesheet is composed once and declared tokens have consumers", () => {
  const visited = new Set();
  /** Walk the authored import graph rather than accepting files merely present on disk. */
  function visit(file) {
    assert(!visited.has(file), `Duplicate or cyclic CSS import: ${file}`);
    visited.add(file);
    for (const match of read(file).matchAll(/@import\s+"([^"]+)";/g))
      visit(
        path.posix.normalize(
          path.posix.join(path.posix.dirname(file), match[1]),
        ),
      );
  }
  visit("src/styles/index.css");
  assert.deepEqual([...visited].sort(), files("src/styles").sort());
  const contents = files("src")
    .filter(
      (file) =>
        /\.(?:js|css|html)$/.test(file) && !file.startsWith("src/assets/"),
    )
    .map(read)
    .join("\n");
  const tokens = new Set(
    [...contents.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]),
  );
  for (const token of tokens)
    assert(
      contents.replace(/var\(\s+/g, "var(").includes(`var(${token}`) ||
        contents.includes(`"${token}"`),
      `Unused theme token: ${token}`,
    );
});
test("Markdown links, JSON examples and feature coverage match maintained sources", () => {
  const markdown = [
    "README.md",
    ...files("docs"),
    ...files("mock"),
    ...files("spec"),
  ].filter((file) => file.endsWith(".md"));
  for (const file of markdown) {
    const body = read(file);
    // Unescaped union pipes can silently shift field descriptions into the wrong column.
    let tableColumns = null;
    for (const line of body.split("\n")) {
      if (!line.startsWith("|")) {
        tableColumns = null;
        continue;
      }
      const columns = (line.match(/(?<!\\)\|/g) || []).length;
      if (tableColumns === null) tableColumns = columns;
      assert.equal(
        columns,
        tableColumns,
        `${file}: inconsistent Markdown table columns`,
      );
    }
    // Inline examples such as `[label](URL)` describe syntax, not navigable links.
    const prose = body.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
    for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
      const href = match[1];
      if (/^(?:[a-z]+:|#)/i.test(href)) continue;
      const target = path.resolve(
        root,
        path.dirname(file),
        decodeURIComponent(href.split("#")[0]),
      );
      assert(fs.existsSync(target), `${file}: broken local link ${href}`);
    }
    for (const match of body.matchAll(/```json\s*\n([\s\S]*?)\n```/g))
      assert.doesNotThrow(
        () => JSON.parse(match[1]),
        `${file}: invalid JSON example`,
      );
  }
  const examples = [
    ...read("docs/api-interface-format.md").matchAll(
      /```json\s*\n([\s\S]*?)\n```/g,
    ),
  ].map((match) => JSON.parse(match[1]));
  assert.deepEqual(
    examples.find((example) => example.brand && example.chatme),
    JSON.parse(read("mock/site/en.json")),
  );
  // Experience documentation and all locale identities must track the canonical fixture.
  const experiences = JSON.parse(read("mock/experiences/en.json"));
  assert.deepEqual(
    examples.find(
      (example) =>
        example.organizationTitle && example.skills && !example.projectName,
    ),
    experiences[0],
  );
  for (const locale of ["zh-Hans", "zh-Hant"]) {
    const localized = JSON.parse(read("mock/experiences/" + locale + ".json"));
    assert.deepEqual(
      localized.map((row) => row.id),
      experiences.map((row) => row.id),
    );
    localized.forEach((row, index) => {
      assert.deepEqual(
        Object.keys(row).sort(),
        Object.keys(experiences[index]).sort(),
      );
      for (const field of [
        "id",
        "order",
        "type",
        "countryCode",
        "startMonth",
        "endMonth",
        "endDay",
        "expected",
      ])
        assert.deepEqual(row[field], experiences[index][field]);
      assert.equal(row.skills.length, experiences[index].skills.length);
    });
  }
  const projects = JSON.parse(read("mock/projects/en.json"));
  assert.deepEqual(
    examples.find((example) => example.projectName),
    projects[0],
  );
  for (const locale of ["zh-Hans", "zh-Hant"]) {
    const localized = JSON.parse(read("mock/projects/" + locale + ".json"));
    assert.deepEqual(
      localized.map((row) => row.id),
      projects.map((row) => row.id),
    );
    localized.forEach((row, index) => {
      assert.deepEqual(
        Object.keys(row).sort(),
        Object.keys(projects[index]).sort(),
      );
      assert.deepEqual(
        Object.keys(row.detail).sort(),
        Object.keys(projects[index].detail).sort(),
      );
      for (const key of ["id", "startMonth", "endMonth", "expected"])
        assert.deepEqual(row[key], projects[index][key]);
      assert.equal(row.skills.length, projects[index].skills.length);
    });
  }
  /** Extract the canonical feature IDs before supplementary historical notes. */
  const featureIds = (file) =>
    [
      ...read(file)
        .split("## 3.")[0]
        .matchAll(
          /^\|\s*((?:NAV|HOME|CHAT|JOURNEY|EXP|PROJECT|SKILL|LANG|SHARED)-\d+)\s*\|/gm,
        ),
    ]
      .map((match) => match[1])
      .sort();
  const features = featureIds("docs/current-page-features.md");
  assert.equal(
    new Set(features).size,
    features.length,
    "Duplicate feature IDs",
  );
  assert.deepEqual(features, featureIds("docs/regression-coverage.md"));
});
