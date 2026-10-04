/** Transport-independent resource client with response checks, request deduplication and successful-response caching. */
window.createPortfolioApi = (transport) => {
  const cache = new Map(),
    pending = new Map(),
    resources = new Map();
  /** Check a backend cursor page without decoding its opaque continuation token. */
  function cursorPage(page, items, limit) {
    return (
      page &&
      Number.isSafeInteger(page.limit) &&
      page.limit === limit &&
      Number.isSafeInteger(page.total) &&
      page.total >= 0 &&
      Array.isArray(items) &&
      items.length <= page.limit &&
      items.length <= page.total &&
      typeof page.hasMore === "boolean" &&
      (!page.hasMore || items.length > 0) &&
      (page.hasMore
        ? typeof page.nextCursor === "string" && !!page.nextCursor
        : page.nextCursor === null)
    );
  }
  /** Require localized skill labels directly in the item, as in the backend response. */
  function skill(item) {
    return (
      item &&
      typeof item.id === "string" &&
      !!item.id &&
      typeof item.label === "string" &&
      !!item.label.trim()
    );
  }
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
        if (["/portfolio/experiences", "/portfolio/projects"].includes(path)) {
          const { total, pages, page, size, items } = response || {};
          if (
            !Number.isSafeInteger(total) ||
            total < 0 ||
            size !== 6 ||
            !Number.isSafeInteger(page) ||
            page < 1 ||
            page !== Number(query.page ?? 1) ||
            size !== Number(query.size ?? 6) ||
            pages !== Math.ceil(total / size) ||
            !Array.isArray(items) ||
            items.length !==
              Math.min(size, Math.max(0, total - (page - 1) * size))
          )
            throw new Error("Invalid numbered pagination response.");
        } else if (path === "/portfolio/site") {
          if (
            !response ||
            Array.isArray(response) ||
            typeof response !== "object" ||
            !["brand", "profile", "social", "chatme"].every(
              (key) => response[key] && typeof response[key] === "object",
            )
          )
            throw new Error("Invalid site response.");
        } else if (path === "/portfolio/journey") {
          if (!Array.isArray(response))
            throw new Error("Invalid journey response.");
        } else if (path === "/portfolio/skill-categories") {
          const { items, page, included } = response || {};
          if (
            !cursorPage(page, items, Number(query.limit ?? 12)) ||
            !Array.isArray(included?.skills) ||
            !included.skills.every(skill) ||
            !items.every(
              (row) =>
                skill(row) &&
                Array.isArray(row.skillIds) &&
                row.skillIds.length <= 6 &&
                row.skillIds.every((id) => typeof id === "string") &&
                cursorPage(row.skillsPage, row.skillIds, 6) &&
                row.skillsPage.hasMore ===
                  (row.skillsPage.total > row.skillIds.length),
            )
          )
            throw new Error("Invalid skill categories response.");
          const previewIds = items.flatMap((row) => row.skillIds),
            includedIds = included.skills.map((row) => row.id);
          if (
            new Set(includedIds).size !== includedIds.length ||
            new Set(previewIds).size !== includedIds.length ||
            previewIds.some((id) => !includedIds.includes(id))
          )
            throw new Error("Invalid category skill references.");
        } else if (path === "/portfolio/skills") {
          if (
            !cursorPage(
              response?.page,
              response?.items,
              Number(query.limit ?? 12),
            ) ||
            !response.items.every(skill) ||
            new Set(response.items.map((row) => row.id)).size !==
              response.items.length
          )
            throw new Error("Invalid skills response.");
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
  /** Re-fetch direct and numbered resources; the store replays locale-bound skill cursors separately. */
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
