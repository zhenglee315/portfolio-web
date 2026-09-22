/** In-memory GET transport over JSON fixtures. It implements the documented HTTP-shaped contract without AJAX. */
window.MockPortfolioTransport = (() => {
  /** Detach JSON fixtures and responses so consumers cannot mutate the transport database. */
  const clone = (value) => JSON.parse(JSON.stringify(value));
  /** Create an isolated transport so tests can inject larger datasets, delays or retryable failures. */
  function create(source, options = {}) {
    const db = clone(source),
      requests = [],
      failures = { ...options.failures };
    const revision = db.revision;
    const pagination = {
      experiences: 6,
      projects: 6,
      categories: 12,
      skills: 12,
      skillPreview: 6,
    };
    /** Represent failures with the same fields a future HTTP adapter will expose. */
    function fail(status, code, message) {
      throw Object.assign(new Error(message), {
        status,
        code,
        retryable: status >= 500,
        body: {
          error: { code, message, retryable: status >= 500 },
          meta: { apiVersion: 1, revision },
        },
      });
    }
    /** Bind opaque cursors to both the dataset revision and the exact filtered collection. */
    function cursorFor(resource, offset) {
      return btoa(JSON.stringify({ revision, resource, offset }))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
    }
    /** Reject malformed, cross-resource and stale cursors before slicing a collection. */
    function offsetFor(resource, cursor, length) {
      if (!cursor) return 0;
      let value;
      try {
        value = JSON.parse(
          atob(cursor.replaceAll("-", "+").replaceAll("_", "/")),
        );
      } catch {
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      }
      if (!value || typeof value !== "object" || Array.isArray(value))
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      if (value.revision !== revision)
        fail(409, "STALE_CURSOR", "The dataset revision has changed.");
      if (
        value.resource !== resource ||
        !Number.isInteger(value.offset) ||
        value.offset < 0 ||
        value.offset > length
      )
        fail(
          400,
          "INVALID_CURSOR",
          "The cursor does not belong to this collection.",
        );
      return value.offset;
    }
    /** Return a bounded page with authoritative totals, including the empty and terminal cases. */
    function paginate(records, resource, query, fallback) {
      const limit = query.limit === undefined ? fallback : Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50)
        fail(400, "INVALID_LIMIT", "limit must be an integer from 1 to 50.");
      const offset = offsetFor(resource, query.cursor, records.length),
        end = Math.min(records.length, offset + limit);
      return {
        items: records.slice(offset, end),
        page: {
          limit,
          total: records.length,
          hasMore: end < records.length,
          nextCursor: end < records.length ? cursorFor(resource, end) : null,
        },
      };
    }
    /** Include category skill labels only; direct-text resources need no entity tables. */
    function include(records, locale) {
      const ids = new Set(records.flatMap((row) => row.skillIds || []));
      const skills = db.skills.items.filter((row) => ids.has(row.id));
      const keys = new Set(
        [
          ...records.map((row) => row.labelKey),
          ...skills.map((row) => row.labelKey),
        ].filter(Boolean),
      );
      const translations = Object.fromEntries(
        [...keys].map((key) => {
          const value = db.locales[locale][key] ?? db.locales.en[key];
          if (typeof value !== "string")
            fail(500, "INVALID_FIXTURE", "Missing translation: " + key);
          return [key, value];
        }),
      );
      return {
        organizations: [],
        countries: [],
        locations: [],
        skills,
        translations: { [locale]: translations },
      };
    }
    /** Direct-text resources require no entity tables or business translation catalogs. */
    const emptyIncluded = (locale) => ({
      organizations: [],
      countries: [],
      locations: [],
      skills: [],
      translations: { [locale]: {} },
    });
    /** Attach a small relationship preview; the remaining skills have their own cursor endpoint. */
    function preview(record, type) {
      const result = paginate(
        record.skillIds,
        "skills:" + type + ":" + record.id,
        {},
        pagination.skillPreview,
      );
      return { ...record, skillIds: result.items, skillsPage: result.page };
    }
    /** Dispatch one documented resource request; no UI module reads fixtures directly. */
    function route(path, query) {
      const locale = query.locale ?? "en";
      if (!["en", "zh-Hans", "zh-Hant"].includes(locale))
        fail(400, "INVALID_LOCALE", "Unsupported locale.");
      let data,
        page = null,
        included;
      if (path === "/site") {
        // Each locale provides the complete approved site object, not translation-key mappings.
        data = db.site[locale] ?? db.site.en;
        included = emptyIncluded(locale);
      } else if (path === "/journey") {
        // Preserve the server array order; no sorting or lookup tables belong to Journey.
        data = db.journey[locale] ?? db.journey.en;
        included = emptyIncluded(locale);
      } else if (["/experiences", "/projects"].includes(path)) {
        // Direct collections share numbered pagination and retain server array order.
        const page = query.page === undefined ? 1 : Number(query.page);
        const size =
          query.size === undefined
            ? pagination[path.slice(1)]
            : Number(query.size);
        if (!Number.isSafeInteger(page) || page < 1)
          fail(400, "INVALID_PAGE", "page must be a positive integer.");
        if (size !== pagination[path.slice(1)])
          fail(400, "INVALID_SIZE", "size must be 6.");
        if (
          query.cursor !== undefined ||
          query.limit !== undefined ||
          query.scope !== undefined
        )
          fail(400, "INVALID_QUERY", "This collection uses page and size.");
        const records = db[path.slice(1)][locale] ?? db[path.slice(1)].en;
        return clone({
          total: records.length,
          pages: Math.ceil(records.length / size),
          page,
          size,
          items: records.slice((page - 1) * size, page * size),
        });
      } else if (path === "/skill-categories") {
        const result = paginate(
          db.skills.categories,
          "skill-categories",
          query,
          pagination.categories,
        );
        data = result.items.map((row) => preview(row, "category"));
        page = result.page;
        included = include(data, locale);
      } else if (path === "/skills") {
        const tables = {
          category: db.skills.categories,
        };
        if (!Object.hasOwn(tables, query.ownerType))
          fail(400, "INVALID_OWNER", "Unsupported skill owner type.");
        const owner = tables[query.ownerType].find(
          (row) => row.id === query.ownerId,
        );
        if (!owner) fail(404, "NOT_FOUND", "The skill owner does not exist.");
        const result = paginate(
          owner.skillIds,
          "skills:" + query.ownerType + ":" + owner.id,
          query,
          pagination.skills,
        );
        data = result.items.map((id) =>
          db.skills.items.find((skill) => skill.id === id),
        );
        page = result.page;
        included = include([{ skillIds: result.items }], locale);
      } else fail(404, "NOT_FOUND", "Unknown resource.");
      return clone({
        data,
        included,
        page,
        meta: { apiVersion: 1, revision, locale },
      });
    }
    /** Preserve asynchronous request semantics now so a future HTTP transport can be substituted. */
    async function request({ method = "GET", path, query = {} }) {
      requests.push({ method, path, query: clone(query) });
      if (options.delayMs)
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      if (method !== "GET")
        fail(405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
      const failureKey = failures[path + "?locale=" + query.locale]
        ? path + "?locale=" + query.locale
        : failures[path + "?page=" + query.page]
          ? path + "?page=" + query.page
          : path;
      if (failures[failureKey] > 0) {
        failures[failureKey]--;
        fail(503, "TEMPORARILY_UNAVAILABLE", "Please retry this request.");
      }
      return route(path, query);
    }
    return Object.freeze({
      request,
      /** Return a detached request history for transport diagnostics and tests. */
      get requests() {
        return clone(requests);
      },
    });
  }
  return Object.freeze({ create });
})();
