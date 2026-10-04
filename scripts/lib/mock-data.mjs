/** Load API fixtures and separate frontend inputs for deterministic builds and contract tests. */
import fs from "node:fs";
import path from "node:path";
/** Load fixed frontend settings and trusted map geometry independently from API fixtures. */
export function loadFrontend(root, config) {
  const source = path.join(root, "src");
  /** Read a frontend input only after verifying that its path stays inside src. */
  const read = (relative) => {
    const file = path.resolve(source, relative);
    if (!file.startsWith(source + path.sep))
      throw new Error("Unsafe frontend path");
    return fs.readFileSync(file, "utf8");
  };
  const localization = JSON.parse(read(config.localization));
  return {
    runtime: JSON.parse(read(config.runtime)),
    navigation: JSON.parse(read(config.navigation)),
    localization,
    locales: Object.fromEntries(
      localization.supported.map(({ code }) => [
        code,
        JSON.parse(read("locales/" + code + ".json")),
      ]),
    ),
    map: {
      svg: read(config.map)
        .replace(/^<svg\b[^>]*>/, "")
        .replace(/<\/svg>\s*$/, ""),
    },
  };
}
/**
 * Read only the mock files registered in config/build.json; missing files fail the build.
 * Every registered locale file contains the localized API content. Companion Markdown is never bundled.
 */
export function loadMock(root, config) {
  const directory = path.join(root, "mock"),
    result = {
      site: {},
      journey: {},
      experiences: {},
      projects: {},
      skillCategories: {},
      skills: {},
    };
  for (const name of config.files) {
    const file = path.resolve(directory, name + ".json");
    if (!file.startsWith(directory + path.sep))
      throw new Error("Unsafe mock path: " + name);
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    if (name.startsWith("skill-categories/"))
      result.skillCategories[name.slice(17)] = value;
    else if (name.startsWith("skills/")) result.skills[name.slice(7)] = value;
    else if (name.startsWith("journey/")) result.journey[name.slice(8)] = value;
    else if (name.startsWith("experiences/"))
      result.experiences[name.slice(12)] = value;
    else if (name.startsWith("projects/"))
      result.projects[name.slice(9)] = value;
    else if (name.startsWith("site/")) result.site[name.slice(5)] = value;
    else result[name] = value;
  }
  if (
    !result.site?.en ||
    !Array.isArray(result.journey?.en) ||
    !Array.isArray(result.skillCategories?.en) ||
    !Array.isArray(result.skills?.en) ||
    !Array.isArray(result.experiences?.en) ||
    !Array.isArray(result.projects?.en)
  )
    throw new Error("Incomplete mock dataset.");
  return result;
}
