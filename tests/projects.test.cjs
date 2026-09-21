/** Verify the approved Projects contract, complete details and atomic localized pagination. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { context } = require("./helpers.cjs");
/** Create a plain detached value for cross-context contract assertions. */
const copy = (value) => JSON.parse(JSON.stringify(value));

test("Projects preserve API keys, numeric identities and server order in six-item pages", async () => {
  const { ctx, mock } = context({ empty: true });
  delete mock.skills;
  delete mock.locales;
  const api = ctx.createPortfolioApi(ctx.MockPortfolioTransport.create(mock));
  for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
    const rows = [];
    for (let page = 1; page <= 3; page++) {
      const result = await api.request("/projects", { locale, page, size: 6 });
      assert.deepEqual(Object.keys(result).sort(), [
        "items",
        "page",
        "pages",
        "size",
        "total",
      ]);
      assert.equal(result.total, 15);
      assert.equal(result.pages, 3);
      assert.equal(result.items.length, page === 3 ? 3 : 6);
      rows.push(...result.items);
    }
    assert.deepEqual(copy(rows), mock.projects[locale]);
  }
  for (const query of [
    { page: 0 },
    { page: "all" },
    { size: 7 },
    { size: "all" },
    { cursor: "old" },
    { limit: 6 },
    { scope: "earlier" },
  ])
    await assert.rejects(api.request("/projects", query));
  await assert.rejects(api.request("/projects/1"), /Unknown resource/);
  mock.projects.en = [];
  assert.deepEqual(
    copy(
      await ctx.MockPortfolioTransport.create(mock).request({
        path: "/projects",
      }),
    ),
    { total: 0, pages: 0, page: 1, size: 6, items: [] },
  );
});

test("Projects retry failed pages, deduplicate loads and translate only loaded pages", async () => {
  const { ctx, mock, data } = context({ empty: true });
  const raw = ctx.MockPortfolioTransport.create(mock, {
    delayMs: 5,
    failures: { "/projects?page=2": 1 },
  });
  ctx.PortfolioApi = ctx.createPortfolioApi(raw);
  await data.initialize();
  const before = data.projects;
  await assert.rejects(data.loadPage("projects"));
  assert.equal(data.projects, before);
  assert.equal(data.page("projects").page, 1);
  const a = data.loadPage("projects"),
    b = data.loadPage("projects");
  assert.equal(a, b);
  await a;
  assert.equal(data.projects.length, 12);
  const count = raw.requests.length;
  await data.loadSkills("project-4");
  await data.loadSkills("dialog-4");
  assert.equal(raw.requests.length, count);
  ctx.I18n.setLoader(data.prepareLocale);
  await ctx.I18n.setLanguage("zh-Hant");
  assert.deepEqual(copy(data.projects), mock.projects["zh-Hant"].slice(0, 12));
  assert.deepEqual(
    copy(
      raw.requests
        .filter((r) => r.path === "/projects" && r.query.locale === "zh-Hant")
        .map((r) => r.query.page),
    ),
    [1, 2],
  );
  await data.loadPage("projects");
  assert.equal(data.projects.length, 15);
  const done = raw.requests.length;
  await data.loadPage("projects");
  assert.equal(raw.requests.length, done);
});

test("Projects accept empty content but reject unsafe IDs, malformed fields and invalid dates atomically", () => {
  const { data } = context();
  for (const change of [
    (r) => r.push(r[0]),
    (r) => (r[0].id = "1"),
    (r) => (r[0].id = 0),
    (r) => (r[0].id = Number.MAX_SAFE_INTEGER + 1),
    (r) => (r[0].skills = [{}]),
    (r) => (r[0].detail = []),
    (r) => (r[0].detail.flow = [null]),
    (r) => (r[0].endMonth = "1900-01"),
    (r) => {
      r[0].endMonth = null;
      r[0].expected = true;
    },
  ]) {
    const before = data.projects,
      rows = copy(before);
    change(rows);
    assert.throws(() => data.replaceProjects(rows));
    assert.equal(data.projects, before);
  }
  for (const detail of [
    null,
    "",
    {
      workflowDescription: null,
      flow: [],
      technicalDescription: "",
      contribution: null,
      outcome: "",
    },
  ]) {
    const rows = copy(data.projects);
    rows[0].detail = detail;
    rows[0].skills = null;
    rows[0].endMonth = null;
    data.replaceProjects(rows);
    assert.deepEqual(copy(data.projects), rows);
  }
});

test("Projects reject changed localized identity and keep the previous language until corrected", async () => {
  const { ctx, mock, data } = context({ empty: true });
  const raw = ctx.MockPortfolioTransport.create(mock);
  let corrupt = true;
  ctx.PortfolioApi = ctx.createPortfolioApi({
    async request(req) {
      const response = await raw.request(req);
      if (corrupt && req.path === "/projects" && req.query.locale === "zh-Hant")
        response.items.reverse();
      return response;
    },
  });
  await data.initialize();
  const before = data.projects;
  ctx.I18n.setLoader(data.prepareLocale);
  await assert.rejects(ctx.I18n.setLanguage("zh-Hant"));
  assert.equal(ctx.I18n.locale, "en");
  assert.equal(data.projects, before);
  corrupt = false;
  await ctx.I18n.setLanguage("zh-Hant");
  assert.deepEqual(copy(data.projects), mock.projects["zh-Hant"].slice(0, 6));
});
