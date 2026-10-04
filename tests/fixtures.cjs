/** Load canonical JSON fixtures for tests without coupling browser features to the mock database. */
const fs = require("node:fs"),
  path = require("node:path");
/** Read fixed frontend inputs separately from mock API records. */
function frontend() {
  /** Read a frontend fixture from the source tree. */
  const read = (file) =>
    fs.readFileSync(path.join(__dirname, "../src", file), "utf8");
  const localization = JSON.parse(read("config/localization.json"));
  return {
    runtime: JSON.parse(read("config/runtime.json")),
    navigation: JSON.parse(read("config/navigation.json")),
    localization,
    locales: Object.fromEntries(
      localization.supported.map(({ code }) => [
        code,
        JSON.parse(read("locales/" + code + ".json")),
      ]),
    ),
    map: {
      svg: read("assets/maps/world.svg")
        .replace(/^<svg\b[^>]*>/, "")
        .replace(/<\/svg>\s*$/, ""),
    },
  };
}
/** Business labels arrive in localized API responses; UI catalogs stay independent. */
function catalogs() {
  return frontend().locales;
}
/** Return a detached dataset; each test can enlarge it without mutating files or another test. */
function fixture() {
  const root = path.resolve(__dirname, ".."),
    config = JSON.parse(
      fs.readFileSync(path.join(root, "config/build.json")),
    ).mock;
  const data = {
    site: {},
    journey: {},
    experiences: {},
    projects: {},
    skillCategories: {},
    skills: {},
  };
  for (const name of config.files) {
    const value = JSON.parse(
      fs.readFileSync(path.join(root, "mock", name + ".json")),
    );
    if (name.startsWith("skill-categories/"))
      data.skillCategories[name.slice(17)] = value;
    else if (name.startsWith("skills/")) data.skills[name.slice(7)] = value;
    else if (name.startsWith("journey/")) data.journey[name.slice(8)] = value;
    else if (name.startsWith("experiences/"))
      data.experiences[name.slice(12)] = value;
    else if (name.startsWith("projects/")) data.projects[name.slice(9)] = value;
    else if (name.startsWith("site/")) data.site[name.slice(5)] = value;
    else data[name] = value;
  }
  return data;
}
/** Build a complete normalized snapshot for import, policy and mutation tests. */
function snapshot(data = fixture()) {
  return {
    schemaVersion: 1,
    skills: data.skills.en,
    skillCategories: data.skillCategories.en,
  };
}
module.exports = { fixture, snapshot, frontend, catalogs };
