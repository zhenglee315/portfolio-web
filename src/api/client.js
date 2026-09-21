/** Transport-independent resource client with revision checks, request deduplication and successful-response caching. */
window.createPortfolioApi = (transport) => {
  const cache = new Map(),
    pending = new Map(),
    resources = new Map();
  let revision = null;
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
        // Numbered collections use the backend's Page schema without an envelope.
        if (["/experiences", "/projects"].includes(path)) {
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
          cache.set(key, structuredClone(response));
          resources.set(key, { path, query });
          return response;
        }
        if (
          response?.meta?.apiVersion !== 1 ||
          typeof response.meta.revision !== "string" ||
          !response.included ||
          response.meta.locale !== query.locale
        )
          throw new Error("Invalid API response envelope.");
        if (revision !== null && revision !== response.meta.revision)
          throw Object.assign(
            new Error(
              "Dataset changed; reload to start a consistent snapshot.",
            ),
            { code: "STALE_REVISION", status: 409 },
          );
        if (response.page) {
          const p = response.page;
          if (
            !Number.isInteger(p.total) ||
            p.total < 0 ||
            !Number.isInteger(p.limit) ||
            p.limit < 1 ||
            p.limit > 50 ||
            !Array.isArray(response.data) ||
            response.data.length > p.limit ||
            response.data.length > p.total ||
            (p.hasMore && response.data.length === 0) ||
            typeof p.hasMore !== "boolean" ||
            (p.hasMore
              ? typeof p.nextCursor !== "string" || !p.nextCursor
              : p.nextCursor !== null)
          )
            throw new Error("Invalid pagination response.");
        }
        revision = response.meta.revision;
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
  /** Re-fetch only previously requested resources, preserving lazy pages and isolating locale caches. */
  async function translate(locale) {
    const translated = new Map();
    while (true) {
      await Promise.allSettled([...pending.values()]);
      const targets = new Map(
        [...resources.values()].map(({ path, query }) => {
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
// The build embeds JSON solely for file:// support; application modules only see the client.
window.PortfolioApi = createPortfolioApi(
  MockPortfolioTransport.create(window.PORTFOLIO_MOCK),
);
delete window.PORTFOLIO_MOCK;
