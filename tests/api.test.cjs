/** Verify API resource boundaries, numbered pagination contracts, caching, retries and bounded store merges. */
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const { context } = require("./helpers.cjs");

test("journey returns direct localized fields in server order without lookup tables", async () => {
  const { ctx, mock } = setup();
  const source = structuredClone(mock);
  source.journey.en.reverse();
  source.journey.en[0].startMonth = source.journey.en[1].startMonth;
  const result = await ctx.MockPortfolioTransport.create(source).request({
    path: "/portfolio/journey",
    query: { locale: "en" },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), source.journey.en);
  for (const row of result) {
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
  const en = await api.request("/portfolio/site");
  assert.deepEqual(en.social, {
    linkedin: "https://www.linkedin.com/in/zhenglee315",
    github: "https://github.com/zhenglee315",
    medium: "https://medium.com/@WilsonLeee",
    email: "zhenglee315@gmail.com",
  });
  assert.equal(
    typeof ctx.PORTFOLIO_FRONTEND.locales.en["ui.linkedin"],
    "string",
  );
  assert.equal(transport.requests[0].query.locale, "en");
  assert.deepEqual(
    Object.keys(en).sort(),
    ["brand", "profile", "social", "chatme"].sort(),
  );
  assert(!("navigation" in en) && !("map" in en) && !("locales" in en));
  const chinese = await api.request("/portfolio/site", { locale: "zh-Hant" });
  assert.deepEqual(Object.keys(en.chatme).sort(), [
    "content",
    "icon",
    "title",
    "titleSub",
  ]);
  assert.equal(en.chatme.title, "London · 20 hours/week");
  assert(en.chatme.content.includes("\n"));
  assert.equal(chinese.chatme.title, mock.site["zh-Hant"].chatme.title);
  assert.notEqual(chinese.profile.content, en.profile.content);
  assert.equal(
    typeof ctx.PORTFOLIO_FRONTEND.locales["zh-Hant"]["ui.closeProject"],
    "string",
  );
  await assert.rejects(
    api.request("/portfolio/site", { locale: "fr" }),
    (e) => e.code === "INVALID_LOCALE" && e.status === 400,
  );
  const raw = ctx.MockPortfolioTransport.create(mock);
  assert.deepEqual(
    JSON.parse(JSON.stringify(await raw.request({ path: "/portfolio/site" }))),
    mock.site.en,
  );
});

test("language switches translate loaded pages only and preserve numbered pages with separate caches", async () => {
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
  const { ctx, data } = setup({
    failures: { "/portfolio/site?locale=zh-Hant": 1 },
  });
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
        request.path === "/portfolio/site" &&
        request.query.locale === "zh-Hant"
      )
        response.profile.content = null;
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
    [
      "/portfolio/site",
      "/portfolio/journey",
      "/portfolio/experiences",
      "/portfolio/projects",
      "/portfolio/skill-categories",
    ],
  );
});
test("numbered skill collections reject invalid pages, sizes and owners", async () => {
  const { api } = setup();
  for (const path of ["/portfolio/skill-categories", "/portfolio/skills"]) {
    const owner = path.endsWith("/skills") ? { ownerId: "backend-apis" } : {};
    for (const query of [
      { page: 0 },
      { page: "all" },
      { page: 1.5 },
      { page: "1.0" },
      { page: "1e0" },
      { page: true },
      { size: 12 },
      { size: "6.0" },
      { size: "6e0" },
    ])
      await assert.rejects(
        api.request(path, { ...owner, ...query }),
        (e) => e.status === 400,
      );
  }
  await assert.rejects(
    api.request("/portfolio/skills"),
    (e) => e.status === 422 && Array.isArray(e.body.detail),
  );
  await assert.rejects(
    api.request("/portfolio/skills", {
      ownerType: "project",
      ownerId: "backend-apis",
    }),
    (e) => e.code === "INVALID_OWNER",
  );
  await assert.rejects(
    api.request("/portfolio/skills", { ownerId: "missing" }),
    (e) => e.code === "NOT_FOUND",
  );
});
test("three languages use the same numbered response for categories and nested skills", async () => {
  const { api, mock } = setup();
  const keys = ["items", "page", "pages", "size", "total"];
  for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
    const labels = new Map(
      mock.skills[locale].map((row) => [row.id, row.label]),
    );
    const categories = [];
    for (
      let page = 1;
      page <= Math.ceil(mock.skillCategories[locale].length / 6);
      page++
    ) {
      const result = await api.request("/portfolio/skill-categories", {
        locale,
        page,
        size: 6,
      });
      assert.deepEqual(Object.keys(result).sort(), keys);
      assert.equal(result.total, mock.skillCategories[locale].length);
      for (const row of result.items) {
        const source = mock.skillCategories[locale].find(
          (item) => item.id === row.id,
        );
        assert.deepEqual(Object.keys(row).sort(), ["id", "label", "skills"]);
        assert.equal(row.label, source.label);
        assert.deepEqual(Object.keys(row.skills).sort(), keys);
        assert.deepEqual(
          row.skills.items.map((item) => item.id),
          source.skillIds.slice(0, 6),
        );
        assert.equal(row.skills.total, source.skillIds.length);
        assert(
          row.skills.items.every((item) => item.label === labels.get(item.id)),
        );
      }
      categories.push(...result.items);
    }
    assert.deepEqual(
      categories.map((row) => row.id),
      mock.skillCategories[locale].map((row) => row.id),
    );
    const source = mock.skillCategories[locale][0];
    const rest = await api.request("/portfolio/skills", {
      locale,
      ownerType: "category",
      ownerId: source.id,
      page: 2,
      size: 6,
    });
    assert.deepEqual(Object.keys(rest).sort(), keys);
    assert.deepEqual(
      rest.items.map((item) => item.id),
      source.skillIds.slice(6, 12),
    );
    assert(rest.items.every((item) => item.label === labels.get(item.id)));
    const beyond = await api.request("/portfolio/skills", {
      locale,
      ownerId: source.id,
      page: 100,
    });
    assert.deepEqual(beyond.items, []);
    assert.equal(beyond.total, source.skillIds.length);
  }
});
test("lazy offline transport loads requested chunks and matches in-memory API responses", async () => {
  const { ctx, mock } = setup();
  const root = path.resolve(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "dist/app.js"), "utf8");
  const manifest = JSON.parse(
    app.match(/^window\.PORTFOLIO_MOCK = (.+);$/m)[1],
  );
  const accessed = [];
  let failOnce = "mock-pages/projects/en/2.js";
  ctx.document.createElement = () => ({ remove() {} });
  ctx.document.head = {
    appendChild(script) {
      const relative = script.src;
      accessed.push(relative);
      queueMicrotask(() => {
        if (relative === failOnce) {
          failOnce = null;
          script.onerror();
          return;
        }
        try {
          vm.runInContext(
            fs.readFileSync(path.join(root, "dist", relative), "utf8"),
            ctx,
          );
          script.onload();
        } catch {
          script.onerror();
        }
      });
    },
  };
  const lazy = ctx.MockPortfolioTransport.createLazy(manifest);
  const memory = ctx.MockPortfolioTransport.create(mock);
  /** Confirm one response agrees with the in-memory contract for the same query. */
  const same = async (path, query = {}) => {
    const input = { path, query };
    assert.deepEqual(
      JSON.parse(JSON.stringify(await lazy.request(input))),
      JSON.parse(JSON.stringify(await memory.request(input))),
    );
  };
  await same("/portfolio/site", { locale: "en" });
  assert.deepEqual(accessed, ["mock-pages/site/en.js"]);
  await same("/portfolio/projects", { locale: "en", page: 1, size: 6 });
  assert(accessed.includes("mock-pages/projects/en/0.js"));
  assert(!accessed.includes("mock-pages/projects/en/1.js"));
  await same("/portfolio/projects", { locale: "en", page: 2, size: 6 });
  assert(accessed.includes("mock-pages/projects/en/1.js"));
  await assert.rejects(
    lazy.request({
      path: "/portfolio/projects",
      query: { locale: "en", page: 3 },
    }),
    (error) => error.status === 503,
  );
  await same("/portfolio/projects", { locale: "en", page: 3 });
  assert.equal(
    accessed.filter((name) => name === "mock-pages/projects/en/2.js").length,
    2,
  );
  const query = { locale: "zh-Hant", page: 1, size: 6 };
  await same("/portfolio/skill-categories", query);
  assert(accessed.includes("mock-pages/skill-categories/zh-Hant/0.js"));
  assert(accessed.includes("mock-pages/skills/zh-Hant/backend-apis/0.js"));
  assert(!accessed.includes("mock-pages/skills/zh-Hant/backend-apis/1.js"));
  assert(!accessed.includes("mock-pages/skill-categories/zh-Hant/1.js"));
  await same("/portfolio/skill-categories", { ...query, page: 2 });
  assert(accessed.includes("mock-pages/skill-categories/zh-Hant/1.js"));
  const beforeBeyond = accessed.length;
  await same("/portfolio/skill-categories", { ...query, page: 3 });
  assert.equal(accessed.length, beforeBeyond);
  const first = await lazy.request({
    path: "/portfolio/skill-categories",
    query,
  });
  await same("/portfolio/skills", {
    locale: "zh-Hant",
    ownerType: "category",
    ownerId: first.items[0].id,
    page: first.items[0].skills.page + 1,
    size: first.items[0].skills.size,
  });
  assert(accessed.includes("mock-pages/skills/zh-Hant/backend-apis/1.js"));
});
test("language switching replays the same numbered category and skill pages", async () => {
  const { ctx, data, mock } = setup();
  for (const locale of ["en", "zh-Hans", "zh-Hant"]) {
    const base = mock.skillCategories[locale][0];
    mock.skillCategories[locale] = Array.from({ length: 17 }, (_, index) => ({
      ...structuredClone(base),
      id: `category-${index}`,
      label: `${base.label} ${index}`,
    }));
  }
  const transport = ctx.MockPortfolioTransport.create(mock);
  ctx.PortfolioApi = ctx.createPortfolioApi(transport);
  await data.initialize();
  await data.loadPage("categories");
  await data.loadPage("categories");
  const owner = "category-category-0";
  await data.loadSkills(owner);
  const loaded = data.skillsState(owner);
  assert.equal(data.page("categories").ids.length, 17);
  assert.equal(loaded.ids.length, mock.skillCategories.en[0].skillIds.length);
  ctx.I18n.setLoader(data.prepareLocale);
  await ctx.I18n.setLanguage("zh-Hant");
  assert.deepEqual(data.skillsState(owner).ids, loaded.ids);
  assert.equal(data.page("categories").ids.length, 17);
  assert.equal(
    data.find("skillCategories", "category-0").label,
    mock.skillCategories["zh-Hant"][0].label,
  );
  const localizedSkill = data.find("skills", loaded.ids[0]);
  assert.equal(
    localizedSkill.label,
    mock.skills["zh-Hant"].find((row) => row.id === loaded.ids[0]).label,
  );
  assert(
    transport.requests.some(
      (row) =>
        row.path === "/portfolio/skills" && row.query.locale === "zh-Hant",
    ),
  );
  assert(
    transport.requests.filter(
      (row) =>
        row.path === "/portfolio/skill-categories" &&
        row.query.locale === "zh-Hant",
    ).length === 3,
  );
});
test("category skills remain paginated and errors preserve prior content", async () => {
  const { data, ctx, mock } = setup();
  await data.initialize();
  const owner = "category-" + mock.skillCategories.en[0].id;
  const old = data.skillsState(owner);
  await data.loadSkills(owner);
  assert(data.skillsState(owner).ids.length >= old.ids.length);
  const empty = structuredClone(mock);
  for (const locale of Object.keys(empty.skillCategories))
    empty.skillCategories[locale] = [];
  const result = await ctx
    .createPortfolioApi(ctx.MockPortfolioTransport.create(empty))
    .request("/portfolio/skill-categories");
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {
    items: [],
    total: 0,
    pages: 0,
    page: 1,
    size: 6,
  });
  await assert.rejects(
    ctx.PortfolioApi.request("/portfolio/skills", {
      ownerType: "project",
      ownerId: 1,
    }),
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
test("the client coalesces equivalent queries and rejects malformed direct responses", async () => {
  const { api, transport, ctx, mock } = setup({ delayMs: 5 });
  await Promise.all([
    api.request("/portfolio/projects", { page: 1, size: 6 }),
    api.request("/portfolio/projects", { size: 6, page: 1 }),
  ]);
  assert.equal(transport.requests.length, 1);
  let malformed = false;
  const raw = ctx.MockPortfolioTransport.create(mock),
    client = ctx.createPortfolioApi({
      async request(request) {
        const result = await raw.request(request);
        if (malformed && request.path === "/portfolio/journey")
          return { data: result, meta: { revision: "old" } };
        return result;
      },
    });
  await client.request("/portfolio/site");
  malformed = true;
  await assert.rejects(
    client.request("/portfolio/journey"),
    /Journey must be an array/,
  );
});

test("failed and malformed skill pages preserve content and retry the same numbered page", async () => {
  const { ctx, data, mock } = setup();
  const raw = ctx.MockPortfolioTransport.create(mock, {
    failures: { "/portfolio/skills?page=2": 1 },
  });
  let malformed = true;
  ctx.PortfolioApi = ctx.createPortfolioApi({
    async request(request) {
      const response = await raw.request(request);
      if (malformed && request.path === "/portfolio/skills") {
        malformed = false;
        response.pages = 99;
      }
      return response;
    },
  });
  await data.initialize();
  const owner = "category-" + mock.skillCategories.en[0].id;
  const before = data.skillsState(owner);
  await assert.rejects(data.loadSkills(owner));
  assert.deepEqual(data.skillsState(owner), before);
  await assert.rejects(data.loadSkills(owner), /pagination/);
  assert.deepEqual(data.skillsState(owner), before);
  await Promise.all([data.loadSkills(owner), data.loadSkills(owner)]);
  assert.equal(data.skillsState(owner).page, 2);
  assert.equal(
    data.skillsState(owner).ids.length,
    mock.skillCategories.en[0].skillIds.length,
  );
  const calls = raw.requests.filter((r) => r.path === "/portfolio/skills");
  assert.equal(calls.length, 3);
  assert(calls.every((r) => r.query.page === 2 && r.query.size === 6));
});
