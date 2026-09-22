/** Verify normalized references, atomic updates, stable identity and translated view construction. */
const test = require("node:test"),
  assert = require("node:assert/strict");
const { context } = require("./helpers.cjs");
/** Clone across VM boundaries to obtain a mutable candidate snapshot. */
const copy = (value) => JSON.parse(JSON.stringify(value));
test("all locale catalogs share keys and interpolation contracts", () => {
  const { ctx } = context(),
    catalogs = ctx.PORTFOLIO_LOCALES,
    en = catalogs.en,
    keys = Object.keys(en).sort();
  for (const locale of ["zh-Hans", "zh-Hant"]) {
    assert.deepEqual(Object.keys(catalogs[locale]).sort(), keys);
    for (const key of keys) {
      assert.ok(catalogs[locale][key].trim(), key);
      assert.deepEqual(
        catalogs[locale][key].match(/\{\w+\}/g)?.sort() || [],
        en[key].match(/\{\w+\}/g)?.sort() || [],
        key,
      );
    }
  }
});
test("localized collections use original API fields and categories retain unique skill IDs", () => {
  const { data } = context();
  assert.ok(
    data.projects.every((row) => row.projectName && !row.text && !row.skillIds),
  );
  assert.ok(
    data.experiences.every((row) => row.organizationName && row.content),
  );
  assert.equal(
    new Set(data.snapshot.skills.map((row) => row.id)).size,
    data.snapshot.skills.length,
  );
});
test("invalid snapshots fail atomically and emit no update event", () => {
  const { data, events } = context(),
    original = data.snapshot;
  for (const mutate of [
    (s) => (s.skillCategories[0].skillIds = ["missing"]),
    (s) => (s.skills[0].labelKey = "missing.key"),
    (s) => (s.schemaVersion = 2),
  ]) {
    const candidate = copy(original);
    mutate(candidate);
    assert.throws(() => data.replace(candidate));
    assert.equal(data.snapshot, original);
  }
  assert.deepEqual(events, []);
});
test("Experience array order and fields are preserved without entity mappings", () => {
  const { data, events } = context();
  const rows = copy(data.experiences).reverse();
  data.replaceExperiences(rows);
  assert.deepEqual(copy(data.experiences), rows);
  assert.deepEqual(events, ["portfolio:datachange"]);
  assert.ok(Object.isFrozen(data.experiences[0].skills));
});
test("empty collections are valid and localized services return empty views", () => {
  const { data } = context(),
    candidate = copy(data.snapshot);
  data.replaceExperiences([]);
  data.replaceProjects([]);
  candidate.skillCategories = [];
  data.replace(candidate);
  assert.equal(data.experiences.length, 0);
  assert.equal(data.projects.length, 0);
});
test("month arithmetic counts inclusive unions and excludes education", () => {
  const { ctx } = context(),
    dates = ctx.CareerDates;
  /** Create a minimal work record for inclusive month-union cases. */
  const work = (startMonth, endMonth) => ({
    type: "work",
    startMonth,
    endMonth,
  });
  assert.equal(
    dates.workDuration([work("2023-01", "2023-03"), work("2023-03", "2023-05")])
      .totalMonths,
    5,
  );
  assert.equal(
    dates.workDuration([work("2023-01", "2023-01"), work("2023-03", "2023-03")])
      .totalMonths,
    2,
  );
  assert.equal(
    dates.workDuration([
      { type: "education", startMonth: "2000-01", endMonth: "2030-12" },
    ]).totalMonths,
    0,
  );
  assert.equal(
    dates.workDuration([work("2026-08", null)], new Date(2026, 8, 21))
      .totalMonths,
    2,
  );
  assert.equal(dates.monthDuration("2025-09", "2026-01"), 5);
  assert.equal(dates.monthDuration("2024-02", "2024-02"), 1);
  assert.throws(() => dates.monthDuration("2026-09", "2026-04"));
  assert.throws(() => dates.monthDuration("2026-13", "2027-01"));
});
test("module factories initialize once and reject cyclic dependencies", () => {
  const { ctx } = context();
  let count = 0;
  ctx.Portfolio.register("example", [], () => ({ value: ++count }));
  assert.equal(ctx.Portfolio.get("example"), ctx.Portfolio.get("example"));
  assert.equal(count, 1);
  ctx.Portfolio.register("cycleA", ["cycleB"], () => ({}));
  ctx.Portfolio.register("cycleB", ["cycleA"], () => ({}));
  assert.throws(() => ctx.Portfolio.get("cycleA"), /Circular/);
});
