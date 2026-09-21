/** Validate the shipped offline bundle, source manifests and local asset references. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, ".."),
  dist = path.join(root, "dist");
test("release manifest files match their recorded digest", () => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dist, "build-manifest.json")),
  );
  for (const [name, hash] of Object.entries(manifest.files)) {
    assert(!path.isAbsolute(name) && !name.split("/").includes(".."));
    assert.equal(
      createHash("sha256")
        .update(fs.readFileSync(path.join(dist, name)))
        .digest("hex"),
      hash,
      name,
    );
  }
  // Release output contains exactly the owned manifest files, with no stale assets.
  const actual = fs
    .readdirSync(dist, { recursive: true })
    .filter((name) => fs.statSync(path.join(dist, name)).isFile())
    .map((name) => name.replaceAll(path.sep, "/"));
  assert.deepEqual(
    actual.sort(),
    [...Object.keys(manifest.files), "build-manifest.json"].sort(),
  );
});
test("HTML and CSS references resolve to bundled files", () => {
  for (const file of ["index.html", "styles.css", "assets/fonts/fonts.css"]) {
    const contents = fs.readFileSync(path.join(dist, file), "utf8");
    const refs = file.endsWith("html")
      ? [...contents.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1])
      : [...contents.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1]);
    for (const ref of refs) {
      if (/^(?:#|data:|mailto:|https?:)/.test(ref)) continue;
      assert(
        fs.existsSync(path.resolve(dist, path.dirname(file), ref)),
        `${file}: ${ref}`,
      );
    }
    if (file.endsWith("css")) assert(!/url\(["']?https?:/.test(contents));
  }
  const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
  assert.equal((html.match(/<script /g) || []).length, 1);
  assert.match(html, /<script src="app.js" defer>/);
});
test("source modules are unique and component colors use theme tokens", () => {
  const config = JSON.parse(
    fs.readFileSync(path.join(root, "config/build.json")),
  );
  assert.equal(new Set(config.scripts).size, config.scripts.length);
  assert.equal(config.scripts[0], "core/registry.js");
  assert.equal(config.scripts.at(-1), "app.js");
  for (const relative of config.scripts)
    assert(fs.existsSync(path.join(root, "src", relative)), relative);
  // Every authored browser module must belong to the single build entry list.
  const sourceScripts = fs
    .readdirSync(path.join(root, "src"), { recursive: true })
    .filter((name) => name.endsWith(".js"))
    .map((name) => name.replaceAll(path.sep, "/"));
  assert.deepEqual(sourceScripts.sort(), [...config.scripts].sort());
  // Keep only icons actually selected by markup, feature code or mock configuration.
  const iconManifest = JSON.parse(
    fs.readFileSync(path.join(root, "src/assets/icons/bootstrap/SOURCES.json")),
  );
  const references = [
    ...config.scripts
      .filter((name) => name !== "core/icons.js")
      .map((name) => path.join(root, "src", name)),
    path.join(root, "src/index.html"),
    ...config.mock.files
      .filter((name) => name.startsWith("site/"))
      .map((name) => path.join(root, "mock", name + ".json")),
    path.join(root, "src/config/navigation.json"),
    path.join(root, "src/config/runtime.json"),
  ]
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");
  for (const name of iconManifest.icons)
    assert(references.includes(name), `Unused icon: ${name}`);
  const iconFiles = fs
    .readdirSync(path.join(root, "src/assets/icons/bootstrap"))
    .filter((name) => name.endsWith(".svg"))
    .map((name) => name.slice(0, -4));
  assert.deepEqual(iconFiles.sort(), [...iconManifest.icons].sort());
  for (const relative of fs.readdirSync(path.join(root, "src/styles"), {
    recursive: true,
  })) {
    if (!relative.endsWith(".css") || relative === "theme.css") continue;
    assert(
      !/#[0-9a-f]{3,8}\b/i.test(
        fs.readFileSync(path.join(root, "src/styles", relative), "utf8"),
      ),
      `${relative} has a hardcoded color`,
    );
  }
});
