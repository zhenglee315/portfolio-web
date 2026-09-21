/** Load browser-independent modules in an isolated VM for contract and policy tests. */
const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path");
/** Create a fresh service graph without a browser or network connection. */
function context({ empty = false } = {}) {
  const { fixture, snapshot, frontend, catalogs } = require("./fixtures.cjs"),
    mock = fixture();
  const events = [];
  const ctx = {
    window: null,
    document: {
      querySelectorAll() {
        return [];
      },
      documentElement: { lang: "en" },
      addEventListener() {},
      dispatchEvent(event) {
        events.push(event.type);
      },
    },
    localStorage: {
      getItem() {
        return null;
      },
    },
    Intl,
    structuredClone,
    btoa,
    atob,
    setTimeout,
    clearTimeout,
    Date,
    CustomEvent: class {
      constructor(type) {
        this.type = type;
      }
    },
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  ctx.PORTFOLIO_MOCK = mock;
  ctx.PORTFOLIO_FRONTEND = frontend();
  ctx.PORTFOLIO_RUNTIME = { ...ctx.PORTFOLIO_FRONTEND.runtime };
  ctx.PORTFOLIO_NAVIGATION = ctx.PORTFOLIO_FRONTEND.navigation;
  ctx.MAP_DATA = ctx.PORTFOLIO_FRONTEND.map;
  ctx.PORTFOLIO_LOCALES = empty
    ? structuredClone(ctx.PORTFOLIO_FRONTEND.locales)
    : catalogs(mock);
  for (const file of [
    "core/registry",
    "core/i18n",
    "api/mock-transport",
    "api/client",
    "core/dates",
    "core/map-geometry",
    "core/data-contracts",
    "core/store",
  ])
    vm.runInContext(
      fs.readFileSync(path.join(__dirname, "../src", file + ".js"), "utf8"),
      ctx,
    );
  const data = ctx.Portfolio.get("data");
  if (!empty) {
    data.replace(snapshot(mock), false);
    data.replaceJourney(mock.journey.en, false);
    data.replaceExperiences(mock.experiences.en, false);
    data.replaceProjects(mock.projects.en, false);
  }
  return { ctx, data, events, mock };
}
module.exports = { context };
