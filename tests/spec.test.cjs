/** Keep backend handoff schemas, examples and the actual mock responses aligned. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { context } = require("./helpers.cjs");
const spec = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../spec/openapi.json"), "utf8"),
);

/** Resolve an internal OpenAPI JSON pointer without interpreting arbitrary remote references. */
function resolve(pointer) {
  return pointer
    .slice(2)
    .split("/")
    .reduce(
      (value, key) => value?.[key.replaceAll("~1", "/").replaceAll("~0", "~")],
      spec,
    );
}

test("OpenAPI defines six unique GET operations and resolves every local reference", () => {
  assert.equal(spec.openapi, "3.1.0");
  assert.equal(Object.keys(spec.paths).length, 6);
  const ids = new Set();
  for (const [url, value] of Object.entries(spec.paths)) {
    assert.deepEqual(Object.keys(value), ["get"]);
    assert(!ids.has(value.get.operationId));
    ids.add(value.get.operationId);
    assert.equal(
      value.get["x-contract-status"],
      url.includes("skill") ? "pending-review" : "confirmed",
    );
  }
  for (const match of JSON.stringify(spec).matchAll(/"\$ref":"([^"]+)"/g)) {
    assert(match[1].startsWith("#/"));
    assert(resolve(match[1]), match[1]);
  }
});

test("OpenAPI response examples exactly match the mock transport and required domain keys", async () => {
  const { ctx, mock } = context({ empty: true });
  const api = ctx.createPortfolioApi(ctx.MockPortfolioTransport.create(mock));
  for (const [url, value] of Object.entries(spec.paths)) {
    const query =
      url === "/skills"
        ? {
            locale: "en",
            ownerType: "category",
            ownerId: mock.skills.categories[0].id,
          }
        : { locale: "en" };
    const result = JSON.parse(JSON.stringify(await api.request(url, query)));
    assert.deepEqual(
      value.get.responses["200"].content["application/json"].examples.en.value,
      result,
      url,
    );
  }
  for (const [name, row] of [
    ["SiteData", mock.site.en],
    ["JourneyItem", mock.journey.en[0]],
    ["Experience", mock.experiences.en[0]],
    ["Project", mock.projects.en[0]],
    ["ProjectDetail", mock.projects.en[0].detail],
  ]) {
    for (const field of spec.components.schemas[name].required)
      assert(Object.hasOwn(row, field), name + " missing " + field);
    for (const field of Object.keys(row))
      assert(
        Object.hasOwn(spec.components.schemas[name].properties, field),
        name + " undocumented " + field,
      );
  }
  assert.equal(
    spec.components.schemas.PositiveId.maximum,
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(spec.components.parameters.Size.schema.default, 6);
});

test("all collection shapes initialize from empty, one or many records and invalid records fail atomically", async () => {
  for (const count of [0, 1, 19]) {
    const { ctx, mock, data } = context({ empty: true });
    for (const locale of ["en", "zh-Hans", "zh-Hant"])
      for (const resource of ["journey", "experiences", "projects"]) {
        const base = mock[resource][locale][0];
        mock[resource][locale] = Array.from({ length: count }, (_, i) => ({
          ...structuredClone(base),
          id: i + 1,
        }));
      }
    const base = mock.skills.categories[0];
    mock.skills.categories = Array.from({ length: count }, (_, i) => ({
      ...structuredClone(base),
      id: "category-" + i,
    }));
    ctx.PortfolioApi = ctx.createPortfolioApi(
      ctx.MockPortfolioTransport.create(mock),
    );
    await data.initialize();
    assert.equal(data.journey.length, count);
    for (const name of ["experiences", "projects", "categories"])
      while (data.page(name).hasMore) await data.loadPage(name);
    assert.equal(data.projects.length, count);
    assert.equal(data.experiences.length, count);
    assert.equal(data.snapshot.skillCategories.length, count);
    const before = data.projects;
    assert.throws(() => data.replaceProjects([null]));
    assert.equal(data.projects, before);
    ctx.I18n.setLoader(data.prepareLocale);
    await ctx.I18n.setLanguage("zh-Hant");
    assert.equal(data.projects.length, count);
  }
});
