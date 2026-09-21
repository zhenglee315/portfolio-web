/** Verify approved Experience contracts independently of legacy collection envelopes. */
const test = require("node:test");
const assert = require("node:assert/strict");
const { context } = require("./helpers.cjs");
/** Create a plain detached value for cross-context comparisons and mutations. */
const copy = (value) => JSON.parse(JSON.stringify(value));
/** Keep identical record identities and order across the localized test pages. */
function expanded(mock) {
  for (const locale of Object.keys(mock.experiences)) {
    const base = mock.experiences[locale][0];
    mock.experiences[locale] = Array.from({ length: 14 }, (_, i) => ({
      ...structuredClone(base),
      id: 100 + i,
      order: 14 - i,
      expected: undefined,
      detail:
        i === 0
          ? { startMonth: "2025-01", endMonth: null, content: "TA" }
          : null,
    }));
  }
  return mock;
}
test("Experience has direct localized fields, authoritative array order and exact page/size response", async () => {
  const { ctx, mock } = context({ empty: true });
  expanded(mock);
  delete mock.entities;
  delete mock.locales;
  delete mock.skills;
  const api = ctx.createPortfolioApi(ctx.MockPortfolioTransport.create(mock));
  for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
    const first = await api.request("/experiences", {
      locale,
      page: 1,
      size: 6,
    });
    assert.deepEqual(Object.keys(first).sort(), [
      "items",
      "page",
      "pages",
      "size",
      "total",
    ]);
    assert.deepEqual(
      copy(first.items),
      copy(mock.experiences[locale].slice(0, 6)),
    );
    assert.equal(first.total, 14);
    assert.equal(first.pages, 3);
    const last = await api.request("/experiences", {
      locale,
      page: 3,
      size: 6,
    });
    assert.equal(last.items.length, 2);
    assert.equal(last.size, 6);
    const beyond = await api.request("/experiences", {
      locale,
      page: 4,
      size: 6,
    });
    assert.deepEqual(beyond.items, []);
  }
  for (const query of [
    { page: 0 },
    { page: "all" },
    { size: 7 },
    { size: "all" },
    { cursor: "old" },
    { limit: 6 },
  ])
    await assert.rejects(api.request("/experiences", query));
  mock.experiences.en = [];
  const empty = await ctx.MockPortfolioTransport.create(mock).request({
    path: "/experiences",
  });
  assert.deepEqual(copy(empty), {
    total: 0,
    pages: 0,
    page: 1,
    size: 6,
    items: [],
  });
});
test("Experience pagination retries the same page, deduplicates requests and preserves translated loaded pages", async () => {
  const { ctx, mock, data } = context({ empty: true });
  expanded(mock);
  const raw = ctx.MockPortfolioTransport.create(mock, { delayMs: 5 });
  let fail = true;
  ctx.PortfolioApi = ctx.createPortfolioApi({
    async request(req) {
      const response = await raw.request(req);
      if (req.path === "/experiences" && req.query.page === 2 && fail) {
        fail = false;
        response.items[0].skills = null;
      }
      return response;
    },
  });
  await data.initialize();
  const before = data.experiences;
  await assert.rejects(data.loadPage("experiences"), /skills/);
  assert.equal(data.page("experiences").page, 1);
  assert.equal(data.experiences, before);
  const a = data.loadPage("experiences"),
    b = data.loadPage("experiences");
  assert.equal(a, b);
  await a;
  assert.equal(data.experiences.length, 12);
  assert.equal(data.page("experiences").page, 2);
  const count = raw.requests.length;
  await data.loadSkills("experience-100");
  assert.equal(raw.requests.length, count);
  ctx.I18n.setLoader(data.prepareLocale);
  await ctx.I18n.setLanguage("zh-Hant");
  assert.equal(
    data.experiences[0].organizationName,
    mock.experiences["zh-Hant"][0].organizationName,
  );
  assert.deepEqual(
    copy(
      raw.requests
        .filter(
          (r) => r.path === "/experiences" && r.query.locale === "zh-Hant",
        )
        .map((r) => r.query.page),
    ),
    [1, 2],
  );
  assert.equal(data.page("experiences").page, 2);
  await data.loadPage("experiences");
  assert.equal(data.experiences.length, 14);
  const done = raw.requests.length;
  await data.loadPage("experiences");
  assert.equal(raw.requests.length, done);
});
test("Experience field validation is atomic and localized malformed content can be retried", async () => {
  const { ctx, mock, data } = context({ empty: true });
  const raw = ctx.MockPortfolioTransport.create(mock);
  let corrupt = true;
  ctx.PortfolioApi = ctx.createPortfolioApi({
    async request(req) {
      const result = await raw.request(req);
      if (
        corrupt &&
        req.path === "/experiences" &&
        req.query.locale === "zh-Hant"
      )
        result.items[0].detail = {
          content: "TA",
          startMonth: "2027-01",
          endMonth: "2026-01",
        };
      return result;
    },
  });
  await data.initialize();
  const before = data.experiences;
  ctx.I18n.setLoader(data.prepareLocale);
  await assert.rejects(ctx.I18n.setLanguage("zh-Hant"));
  assert.equal(ctx.I18n.locale, "en");
  assert.equal(data.experiences, before);
  corrupt = false;
  await ctx.I18n.setLanguage("zh-Hant");
  assert.equal(ctx.I18n.locale, "zh-Hant");
  for (const mutate of [
    (r) => r.push(r[0]),
    (r) => (r[0].id = "6"),
    (r) => (r[0].skills = [{}]),
    (r) => (r[0].expected = "true"),
    (r) => (r[0].detail = []),
    (r) => {
      r[0].endMonth = null;
      r[0].endDay = 1;
    },
  ]) {
    const rows = copy(data.experiences);
    mutate(rows);
    assert.throws(() => data.replaceExperiences(rows));
  }
  const rows = copy(data.experiences);
  delete rows[0].detail;
  delete rows[0].expected;
  rows[0].endMonth = null;
  rows[0].skills = [];
  data.replaceExperiences(rows);
  assert.deepEqual(copy(data.experiences), rows);
});
