/** Transport-independent resource client with response checks, request deduplication and successful-response caching. */
window.createPortfolioApi = (transport) => {
  const cache = new Map(),
    pending = new Map(),
    resources = new Map();
  /** Resolve one stable cache key regardless of query object property order. */
  function keyFor(path, query) {
    return (
      path +
      "?" +
      JSON.stringify(
        Object.entries(query)
          .filter(([, value]) => value !== undefined && value !== null)
          .sort(([a], [b]) => a.localeCompare(b)),
      )
    );
  }
  /** Fetch or reuse a bounded response; failures remain retryable and never advance a page. */
  function request(path, query = {}) {
    query = { ...query, locale: query.locale ?? I18n.locale };
    const key = keyFor(path, query);
    if (cache.has(key)) return Promise.resolve(structuredClone(cache.get(key)));
    if (pending.has(key)) return pending.get(key).then(structuredClone);
    const task = Promise.resolve()
      .then(() => transport.request({ method: "GET", path, query }))
      .then((response) => {
        const contracts = Portfolio.get("dataContracts");
        if (
          [
            "/portfolio/experiences",
            "/portfolio/projects",
            "/portfolio/skill-categories",
            "/portfolio/skills",
          ].includes(path)
        ) {
          contracts.validatePage(response);
          if (
            response.page !== Number(query.page ?? 1) ||
            response.size !== Number(query.size ?? 6)
          )
            throw new Error("Unexpected numbered pagination response.");
          if (path === "/portfolio/skill-categories")
            contracts.validateCategoriesPage(response);
          if (path === "/portfolio/skills")
            contracts.validateSkillsPage(response);
        } else if (path === "/portfolio/site") {
          contracts.validateSite(response);
        } else if (path === "/portfolio/journey") {
          contracts.validateJourney(response);
        } else {
          throw new Error("Unknown API resource: " + path);
        }
        cache.set(key, structuredClone(response));
        resources.set(key, { path, query });
        return response;
      })
      .finally(() => pending.delete(key));
    pending.set(key, task);
    return task.then(structuredClone);
  }
  /** Evict a structurally valid response that the domain store rejected, allowing a corrected retry. */
  function invalidate(path, query = {}) {
    const key = keyFor(path, { ...query, locale: query.locale ?? I18n.locale });
    cache.delete(key);
    resources.delete(key);
  }
  /** Re-fetch direct and numbered resources; the store stages category-owned numbered pages separately. */
  async function translate(locale) {
    const translated = new Map();
    while (true) {
      await Promise.allSettled([...pending.values()]);
      const targets = new Map(
        [...resources.values()]
          .filter(
            ({ path }) =>
              !["/portfolio/skill-categories", "/portfolio/skills"].includes(
                path,
              ),
          )
          .map(({ path, query }) => {
            const next = { ...query, locale };
            return [keyFor(path, next), { path, query: next }];
          }),
      );
      const missing = [...targets].filter(([key]) => !translated.has(key));
      if (!missing.length) return [...translated.values()];
      await Promise.all(
        missing.map(async ([key, { path, query }]) =>
          translated.set(key, {
            path,
            query,
            response: await request(path, query),
          }),
        ),
      );
    }
  }
  return Object.freeze({ request, invalidate, translate });
};
// The build embeds a small manifest; localized page scripts load only when requested.
window.PortfolioApi = createPortfolioApi(
  window.PORTFOLIO_MOCK?.kind === "lazy"
    ? MockPortfolioTransport.createLazy(window.PORTFOLIO_MOCK)
    : MockPortfolioTransport.create(window.PORTFOLIO_MOCK),
);
delete window.PORTFOLIO_MOCK;
