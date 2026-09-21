/** Verify API resource boundaries, cursor contracts, caching, retries and bounded store merges. */
const test = require("node:test"),
  assert = require("node:assert/strict");
const { context } = require("./helpers.cjs");

test("journey returns direct localized fields in server order without lookup tables", async () => {
  const { ctx, mock } = setup();
  const source = structuredClone(mock);
  source.journey.en.reverse();
  source.journey.en[0].startMonth = source.journey.en[1].startMonth;
  delete source.entities;
  delete source.locales;
  const result = await ctx.MockPortfolioTransport.create(source).request({
    path: "/journey",
    query: { locale: "en" },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result.data)), source.journey.en);
  assert.equal(result.page, null);
  assert.deepEqual(JSON.parse(JSON.stringify(result.included.translations)), {
    en: {},
  });
  for (const row of result.data) {
    assert(Number.isSafeInteger(row.id));
    for (const key of [
      "order",
      "text",
      "locationId",
      "organizationId",
      "point",
      "labelOffset",
      "routeBend",
      "interactiveLabel",
    ])
      assert.equal(key in row, false, key);
  }
});

test("journey validates dates and coordinates atomically and preserves numeric IDs and array order", () => {
  const { data, mock, ctx } = setup();
  const rows = structuredClone(mock.journey.en).reverse();
  rows[0].startMonth = rows[1].startMonth;
  rows[0].endMonth = null;
  data.replaceJourney(rows, false);
  assert.deepEqual(JSON.parse(JSON.stringify(data.journey)), rows);
  const original = data.journey;
  for (const mutate of [
    (r) => r.push(r[0]),
    (r) => (r[0].id = "6"),
    (r) => (r[0].latitude = 91),
    (r) => (r[0].longitude = -181),
    (r) => (r[0].endDay = 1),
    (r) => {
      r[0].endMonth = "2027-02";
      r[0].endDay = 29;
    },
    (r) => (r[0].expected = "true"),
    (r) =>
      (r[0].detail = {
        startMonth: "2026-01",
        endMonth: "2025-01",
        content: "TA",
      }),
  ]) {
    const invalid = structuredClone(rows);
    mutate(invalid);
    assert.throws(() => data.replaceJourney(invalid));
    assert.equal(data.journey, original);
  }
  assert(Object.isFrozen(data.journey[0]));
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(ctx.MapGeometry.project({ latitude: 34, longitude: 58 })),
    ),
    [540, 245],
  );
  const london = ctx.MapGeometry.project(mock.journey.en.at(-1));
  assert(Math.abs(london[0] - 169.66015681564997) < 0.001);
  assert(Math.abs(london[1] - 91.299428078798) < 0.001);
  assert.notDeepEqual(
    ctx.MapGeometry.project({ latitude: 0, longitude: 0 }),
    london,
  );
});

test("invalid localized journey preserves the active language and can be retried", async () => {
  const { ctx, data, mock } = setup();
  const source = structuredClone(mock);
  source.journey["zh-Hant"][0].latitude = 200;
  let raw = ctx.MockPortfolioTransport.create(source);
  ctx.PortfolioApi = ctx.createPortfolioApi({ request: (r) => raw.request(r) });
  await data.initialize();
  ctx.I18n.setLoader(data.prepareLocale);
  const original = data.journey;
  await assert.rejects(ctx.I18n.setLanguage("zh-Hant"));
  assert.equal(ctx.I18n.locale, "en");
  assert.equal(data.journey, original);
  raw = ctx.MockPortfolioTransport.create(mock);
  await ctx.I18n.setLanguage("zh-Hant");
  assert.equal(data.journey.at(-1).city, "倫敦");
});
/** Install an observable transport while keeping tests independent from the embedded bundle. */
function setup(options = {}) {
  const result = context({ empty: true }),
    transport = result.ctx.MockPortfolioTransport.create(result.mock, options);
  result.ctx.PortfolioApi = result.ctx.createPortfolioApi(transport);
  return { ...result, transport, api: result.ctx.PortfolioApi };
}

test("site exposes content only; locale is explicit, validated and returned one language at a time", async () => {
  const { api, transport, ctx, mock } = setup();
  const en = await api.request("/site");
  assert.deepEqual(en.data.social, {
    linkedin: "https://www.linkedin.com/in/zhenglee315",
    github: "https://github.com/zhenglee315",
    medium: "https://medium.com/@WilsonLeee",
    email: "zhenglee315@gmail.com",
  });
  assert.equal(en.included.translations.en["ui.linkedin"], undefined);
  assert.equal(
    typeof ctx.PORTFOLIO_FRONTEND.locales.en["ui.linkedin"],
    "string",
  );
  assert.equal(transport.requests[0].query.locale, "en");
  assert.deepEqual(
    Object.keys(en.data).sort(),
    ["brand", "profile", "social", "chatme"].sort(),
  );
  assert(
    !("navigation" in en.data) &&
      !("map" in en.data) &&
      !("locales" in en.data),
  );
  const chinese = await api.request("/site", { locale: "zh-Hant" });
  assert.deepEqual(Object.keys(en.data.chatme).sort(), [
    "content",
    "icon",
    "title",
    "titleSub",
  ]);
  assert.equal(en.data.chatme.title, "London · 20 hours/week");
  assert(en.data.chatme.content.includes("\n"));
  assert.equal(chinese.data.chatme.title, mock.site["zh-Hant"].chatme.title);
  // Direct site content must not leak into the business translation dictionary.
  assert.deepEqual(chinese.included.translations["zh-Hant"], {});
  assert.deepEqual(Object.keys(chinese.included.translations), ["zh-Hant"]);
  assert.equal(chinese.meta.locale, "zh-Hant");
  assert.notEqual(chinese.data.profile.content, en.data.profile.content);
  assert.equal(
    chinese.included.translations["zh-Hant"]["ui.closeProject"],
    undefined,
  );
  assert.equal(
    typeof ctx.PORTFOLIO_FRONTEND.locales["zh-Hant"]["ui.closeProject"],
    "string",
  );
  await assert.rejects(
    api.request("/site", { locale: "fr" }),
    (e) => e.code === "INVALID_LOCALE" && e.status === 400,
  );
  const raw = ctx.MockPortfolioTransport.create(mock);
  assert.equal((await raw.request({ path: "/site" })).meta.locale, "en");
});

test("language switches translate loaded pages only and preserve page cursors with separate caches", async () => {
  const { ctx, data, transport } = setup();
  await data.initialize();
  await data.loadPage("projects");
  ctx.I18n.setLoader(data.prepareLocale);
  const before = JSON.stringify(data.page("projects"));
  await ctx.I18n.setLanguage("zh-Hant");
  assert.equal(ctx.I18n.locale, "zh-Hant");
  assert.equal(data.site.chatme.title, "倫敦 · 每週 20 小時");
  assert.equal(data.journey.at(-1).city, "倫敦");
  assert.equal(JSON.stringify(data.page("projects")), before);
  const chinese = transport.requests.filter(
    (r) => r.query.locale === "zh-Hant",
  );
  assert.equal(chinese.length, 6);
  assert(!chinese.some((r) => r.path.startsWith("/projects/")));
  const count = transport.requests.length;
  await ctx.I18n.setLanguage("en");
  await ctx.I18n.setLanguage("zh-Hant");
  assert.equal(transport.requests.length, count);
  await data.loadPage("projects");
  assert.equal(transport.requests.at(-1).query.locale, "zh-Hant");
});

test("failed language loads keep the current language and can be retried", async () => {
  const { ctx, data } = setup({ failures: { "/site?locale=zh-Hant": 1 } });
  await data.initialize();
  ctx.I18n.setLoader(data.prepareLocale);
  await assert.rejects(ctx.I18n.setLanguage("zh-Hant"));
  assert.equal(ctx.I18n.locale, "en");
  assert.equal(data.journey.at(-1).city, "London");
  await ctx.I18n.setLanguage("zh-Hant");
  assert.equal(ctx.I18n.locale, "zh-Hant");
});

test("localized site validation rejects malformed fields atomically and allows corrected retry", async () => {
  const { ctx, data, mock } = setup();
  const raw = ctx.MockPortfolioTransport.create(mock);
  let corrupt = true;
  ctx.PortfolioApi = ctx.createPortfolioApi({
    async request(request) {
      const response = await raw.request(request);
      if (
        corrupt &&
        request.path === "/site" &&
        request.query.locale === "zh-Hant"
      )
        response.data.profile.content = null;
      return response;
    },
  });
  await data.initialize();
  ctx.I18n.setLoader(data.prepareLocale);
  const before = data.site;
  await assert.rejects(ctx.I18n.setLanguage("zh-Hant"), /profile.content/);
  assert.equal(data.site, before);
  assert.equal(ctx.I18n.locale, "en");
  corrupt = false;
  await ctx.I18n.setLanguage("zh-Hant");
  assert.deepEqual(JSON.parse(JSON.stringify(data.site)), mock.site["zh-Hant"]);
  assert.equal(Object.isFrozen(data.site.profile), true);
});
test("bootstrap loads six Projects with complete detail and no additional detail resource", async () => {
  const { data, transport } = setup();
  await data.initialize();
  assert.equal(data.projects.length, 6);
  assert.equal(data.page("projects").total, 15);
  assert(
    data.projects.every(
      (row) => row.detail.workflowDescription && Array.isArray(row.skills),
    ),
  );
  assert.deepEqual(
    Array.from(transport.requests, (r) => r.path),
    ["/site", "/journey", "/experiences", "/projects", "/skill-categories"],
  );
});
test("category cursors reject invalid owners, stale revisions and invalid limits", async () => {
  const { api, ctx, mock } = setup();
  const first = await api.request("/skill-categories", { limit: 1 });
  await assert.rejects(
    api.request("/skills", {
      ownerType: "category",
      ownerId: mock.skills.categories[0].id,
      cursor: first.page.nextCursor,
    }),
    (e) => e.code === "INVALID_CURSOR",
  );
  await assert.rejects(
    api.request("/skill-categories", { cursor: "broken" }),
    (e) => e.code === "INVALID_CURSOR",
  );
  await assert.rejects(
    api.request("/skill-categories", { limit: 51 }),
    (e) => e.code === "INVALID_LIMIT",
  );
  const changed = ctx.createPortfolioApi(
    ctx.MockPortfolioTransport.create({ ...mock, revision: "new" }),
  );
  await assert.rejects(
    changed.request("/skill-categories", { cursor: first.page.nextCursor }),
    (e) => e.code === "STALE_CURSOR",
  );
});
test("category skills remain paginated and errors preserve prior content", async () => {
  const { data, ctx, mock } = setup();
  await data.initialize();
  const owner = "category-" + mock.skills.categories[0].id;
  const old = data.skillsState(owner);
  await data.loadSkills(owner);
  assert(data.skillsState(owner).ids.length >= old.ids.length);
  const empty = structuredClone(mock);
  empty.skills.categories = [];
  const result = await ctx
    .createPortfolioApi(ctx.MockPortfolioTransport.create(empty))
    .request("/skill-categories");
  assert.deepEqual(JSON.parse(JSON.stringify(result.page)), {
    limit: 12,
    total: 0,
    hasMore: false,
    nextCursor: null,
  });
  await assert.rejects(
    ctx.PortfolioApi.request("/skills", { ownerType: "project", ownerId: 1 }),
    (e) => e.code === "INVALID_OWNER",
  );
});
test("chatme is standalone plain content even with empty collections", async () => {
  const { ctx, mock, data } = setup();
  for (const name of ["journey", "experiences", "projects"])
    for (const locale of Object.keys(mock[name])) mock[name][locale] = [];
  ctx.PortfolioApi = ctx.createPortfolioApi(
    ctx.MockPortfolioTransport.create(mock),
  );
  await data.initialize();
  assert.equal(data.projects.length, 0);
  assert.equal(data.experiences.length, 0);
  assert.equal(data.site.chatme.title, mock.site.en.chatme.title);
});
test("the client coalesces equivalent queries and rejects a mixed-revision snapshot", async () => {
  const { api, transport, ctx, mock } = setup({ delayMs: 5 });
  await Promise.all([
    api.request("/projects", { page: 1, size: 6 }),
    api.request("/projects", { size: 6, page: 1 }),
  ]);
  assert.equal(transport.requests.length, 1);
  let changed = false;
  const raw = ctx.MockPortfolioTransport.create(mock),
    client = ctx.createPortfolioApi({
      async request(request) {
        const result = await raw.request(request);
        if (changed) result.meta.revision = "changed";
        return result;
      },
    });
  await client.request("/site");
  changed = true;
  await assert.rejects(
    client.request("/journey"),
    (e) => e.code === "STALE_REVISION",
  );
});
