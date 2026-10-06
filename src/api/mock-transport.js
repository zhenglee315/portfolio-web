/** Local mock transports matching the shared numbered Portfolio responses. */
window.MockPortfolioTransport = (() => {
  /** Detach fixtures and responses from the authored mock database. */
  const clone = (value) => JSON.parse(JSON.stringify(value));

  /** Validate the same one-based page and fixed size used by the backend. */
  function pagination(query, fail) {
    // HTTP query integers reject decimal/exponent coercion, just like the common parser.
    const pageText = String(query.page === undefined ? 1 : query.page).trim();
    const sizeText = String(query.size === undefined ? 6 : query.size).trim();
    const integer = /^[+-]?\d(?:_?\d)*$/;
    const page = integer.test(pageText)
      ? Number(pageText.replaceAll("_", ""))
      : NaN;
    const size = integer.test(sizeText)
      ? Number(sizeText.replaceAll("_", ""))
      : NaN;
    if (!Number.isSafeInteger(page) || page < 1)
      fail(400, "INVALID_PAGE", "page must be a positive safe integer.");
    if (size !== 6) fail(400, "INVALID_SIZE", "size must be 6.");
    return { page, size };
  }

  /** Build the five-field response, including empty and beyond-end pages. */
  function records(items, total, page, size) {
    return { items, total, pages: Math.ceil(total / size), page, size };
  }

  /** Select one numbered slice without decoding or creating cursor tokens. */
  function paginate(items, query, fail) {
    const { page, size } = pagination(query, fail);
    return records(
      items.slice((page - 1) * size, page * size),
      items.length,
      page,
      size,
    );
  }

  /** Create a detached in-memory mock with optional delay and failure injection. */
  function create(source, options = {}) {
    const db = clone(source),
      requests = [],
      failures = { ...options.failures };
    /** Report safe API errors, including FastAPI's missing-query detail array. */
    function fail(status, code, message) {
      throw Object.assign(new Error(message), {
        status,
        code,
        retryable: status >= 500,
        body: {
          detail:
            status === 422
              ? [
                  {
                    type: "missing",
                    loc: ["query", "ownerId"],
                    msg: "Field required",
                    input: null,
                  },
                ]
              : code,
        },
      });
    }
    /** Read exactly one authored language without merging localized content. */
    function localized(group, locale) {
      const value = db[group]?.[locale];
      if (value === undefined)
        fail(500, "INVALID_FIXTURE", `Missing ${group}/${locale} fixture.`);
      return value;
    }
    /** Resolve a category's ordered skill IDs into directly localized items. */
    function categorySkills(category, locale, query) {
      const labels = new Map(
        localized("skills", locale).map((row) => [row.id, row]),
      );
      const result = paginate(category.skillIds, query, fail);
      result.items = result.items.map((id) => {
        const item = labels.get(id);
        if (!item) fail(500, "INVALID_FIXTURE", `Missing skill: ${id}`);
        return item;
      });
      return result;
    }
    /** Project normalized authoring fixtures into the six public response shapes. */
    function route(path, query) {
      const locale = query.locale ?? "en";
      if (!["en", "zh-Hans", "zh-Hant"].includes(locale))
        fail(400, "INVALID_LOCALE", "Unsupported locale.");
      if (path === "/portfolio/site") return clone(localized("site", locale));
      if (path === "/portfolio/journey")
        return clone(localized("journey", locale));
      if (["/portfolio/experiences", "/portfolio/projects"].includes(path))
        return clone(
          paginate(
            localized(path.slice("/portfolio/".length), locale),
            query,
            fail,
          ),
        );
      if (path === "/portfolio/skill-categories") {
        const result = paginate(
          localized("skillCategories", locale),
          query,
          fail,
        );
        result.items = result.items.map((category) => ({
          id: category.id,
          label: category.label,
          skills: categorySkills(category, locale, { page: 1, size: 6 }),
        }));
        return clone(result);
      }
      if (path === "/portfolio/skills") {
        if ((query.ownerType ?? "category") !== "category")
          fail(400, "INVALID_OWNER", "Unsupported skill owner type.");
        if (query.ownerId == null)
          fail(422, "MISSING_OWNER_ID", "ownerId is required.");
        const ownerId = String(query.ownerId).trim();
        if (!ownerId) fail(400, "INVALID_OWNER_ID", "ownerId is required.");
        const owner = localized("skillCategories", locale).find(
          (row) => row.id === ownerId,
        );
        if (!owner) fail(404, "NOT_FOUND", "The skill owner does not exist.");
        return clone(categorySkills(owner, locale, query));
      }
      fail(404, "NOT_FOUND", "Unknown resource.");
    }
    /** Keep local requests asynchronous and retain retryable failure behavior. */
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
      /** Return a detached request history for diagnostics and tests. */
      get requests() {
        return clone(requests);
      },
    });
  }

  /** Load only requested local scripts, preserving direct file:// mock delivery. */
  function createLazy(manifest) {
    /** Build an API-shaped fault without exposing private runtime information. */
    const fault = (status, code, message) =>
      Object.assign(new Error(message), {
        status,
        code,
        retryable: status >= 500,
        body: {
          detail:
            status === 422
              ? [
                  {
                    type: "missing",
                    loc: ["query", "ownerId"],
                    msg: "Field required",
                    input: null,
                  },
                ]
              : code,
        },
      });
    /** Stop invalid requests before accepting or caching any chunk data. */
    const fail = (status, code, message) => {
      throw fault(status, code, message);
    };
    const idPattern = /^[A-Za-z0-9_-]+$/;
    if (
      manifest?.kind !== "lazy" ||
      manifest.prefix !== "mock-pages" ||
      !manifest.totals ||
      !["experiences", "projects"].every(
        (key) =>
          Number.isSafeInteger(manifest.totals[key]) &&
          manifest.totals[key] >= 0,
      ) ||
      !Array.isArray(manifest.categories) ||
      !manifest.categories.every(
        (row) =>
          row &&
          typeof row.id === "string" &&
          idPattern.test(row.id) &&
          Array.isArray(row.skillIds) &&
          row.skillIds.every(
            (id) => typeof id === "string" && idPattern.test(id),
          ) &&
          new Set(row.skillIds).size === row.skillIds.length,
      ) ||
      new Set(manifest.categories.map((row) => row.id)).size !==
        manifest.categories.length
    )
      fail(500, "INVALID_FIXTURE", "The lazy mock manifest is invalid.");
    const requests = [],
      loaded = new Map(),
      pending = new Map(),
      categories = manifest.categories,
      owners = new Map(categories.map((row) => [row.id, row]));
    /** Generated chunks register only while their matching script is loading. */
    window.PortfolioMockChunks = (key, payload) => {
      const entry = pending.get(key);
      if (entry && !entry.received) {
        entry.payload = payload;
        entry.received = true;
      }
    };

    /** Deduplicate an in-flight script, retain successful chunks and retry failures. */
    function chunk(key) {
      if (loaded.has(key)) return Promise.resolve(clone(loaded.get(key)));
      if (pending.has(key)) return pending.get(key).promise.then(clone);
      const script = document.createElement("script"),
        entry = { received: false, payload: undefined, promise: null };
      entry.promise = new Promise((resolve, reject) => {
        script.async = true;
        script.src = `${manifest.prefix}/${key}.js`;
        script.onerror = () => {
          if (pending.get(key) !== entry) return;
          pending.delete(key);
          script.remove?.();
          reject(
            fault(503, "MOCK_CHUNK_UNAVAILABLE", `Unable to load ${key}.`),
          );
        };
        script.onload = () => {
          if (pending.get(key) !== entry) return;
          pending.delete(key);
          script.remove?.();
          if (!entry.received) {
            reject(fault(500, "INVALID_FIXTURE", `Missing ${key} payload.`));
            return;
          }
          loaded.set(key, clone(entry.payload));
          resolve(clone(entry.payload));
        };
        pending.set(key, entry);
        (document.head || document.documentElement).appendChild(script);
      });
      return entry.promise.then(clone);
    }

    /** An invalid chunk is evicted, so a corrected file can be loaded on retry. */
    function invalid(key, message) {
      loaded.delete(key);
      fail(500, "INVALID_FIXTURE", `${key}: ${message}`);
    }

    /** Load one requested numbered data chunk; beyond-end pages require no script. */
    async function numbered(resource, locale, query) {
      const { page, size } = pagination(query, fail),
        total = manifest.totals[resource];
      let items = [];
      if (page <= Math.ceil(total / size)) {
        const key = `${resource}/${locale}/${page - 1}`;
        items = await chunk(key);
        if (
          !Array.isArray(items) ||
          items.length !== Math.min(size, total - (page - 1) * size)
        )
          invalid(key, "Invalid numbered page.");
      }
      return records(items, total, page, size);
    }
    /** Read one category's skill page and require its authored identity order. */
    async function ownerPage(locale, owner, query) {
      const { page, size } = pagination(query, fail),
        total = owner.skillIds.length;
      let items = [];
      if (page <= Math.ceil(total / size)) {
        const key = `skills/${locale}/${owner.id}/${page - 1}`,
          ids = owner.skillIds.slice((page - 1) * size, page * size);
        items = await chunk(key);
        if (
          !Array.isArray(items) ||
          items.length !== ids.length ||
          items.some(
            (row, i) =>
              row?.id !== ids[i] ||
              typeof row.label !== "string" ||
              !row.label.trim(),
          )
        )
          invalid(key, "Invalid localized skill page.");
      }
      return records(items, total, page, size);
    }
    /** Materialize a category page with nested first skill pages and no included envelope. */
    async function categoryPage(locale, query) {
      const { page, size } = pagination(query, fail),
        total = categories.length;
      let items = [];
      if (page <= Math.ceil(total / size)) {
        const key = `skill-categories/${locale}/${page - 1}`,
          selected = categories.slice((page - 1) * size, page * size),
          rows = await chunk(key);
        if (
          !Array.isArray(rows) ||
          rows.length !== selected.length ||
          rows.some(
            (row, i) =>
              row?.id !== selected[i].id ||
              typeof row.label !== "string" ||
              !row.label.trim() ||
              JSON.stringify(row.skillIds) !==
                JSON.stringify(selected[i].skillIds),
          )
        )
          invalid(key, "Invalid localized category page.");
        items = await Promise.all(
          rows.map(async (row) => ({
            id: row.id,
            label: row.label,
            skills: await ownerPage(locale, owners.get(row.id), {
              page: 1,
              size,
            }),
          })),
        );
      }
      return records(items, total, page, size);
    }
    /** Validate owner aliases before selecting a numbered skill page. */
    async function skillsPage(locale, query) {
      if ((query.ownerType ?? "category") !== "category")
        fail(400, "INVALID_OWNER", "Unsupported skill owner type.");
      if (query.ownerId == null)
        fail(422, "MISSING_OWNER_ID", "ownerId is required.");
      const id = String(query.ownerId).trim();
      if (!id) fail(400, "INVALID_OWNER_ID", "ownerId is required.");
      const owner = owners.get(id);
      if (!owner) fail(404, "NOT_FOUND", "The skill owner does not exist.");
      return ownerPage(locale, owner, query);
    }
    /** Dispatch lazy GETs without requesting unneeded locales, categories or later pages. */
    async function request({ method = "GET", path, query = {} }) {
      requests.push({ method, path, query: clone(query) });
      if (method !== "GET")
        fail(405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
      const locale = query.locale ?? "en";
      if (!["en", "zh-Hans", "zh-Hant"].includes(locale))
        fail(400, "INVALID_LOCALE", "Unsupported locale.");
      if (path === "/portfolio/site") {
        const key = `site/${locale}`,
          payload = await chunk(key);
        if (!payload || Array.isArray(payload) || typeof payload !== "object")
          invalid(key, "Invalid site record.");
        return payload;
      }
      if (path === "/portfolio/journey") {
        const key = `journey/${locale}`,
          payload = await chunk(key);
        if (!Array.isArray(payload)) invalid(key, "Invalid journey records.");
        return payload;
      }
      if (path === "/portfolio/experiences" || path === "/portfolio/projects")
        return numbered(path.slice("/portfolio/".length), locale, query);
      if (path === "/portfolio/skill-categories")
        return categoryPage(locale, query);
      if (path === "/portfolio/skills") return skillsPage(locale, query);
      fail(404, "NOT_FOUND", "Unknown resource.");
    }
    return Object.freeze({
      /** Clone every response before exposing it to the consumer. */
      request: async (input) => clone(await request(input)),
      /** Return a detached request history for diagnostics and tests. */
      get requests() {
        return clone(requests);
      },
    });
  }
  return Object.freeze({ create, createLazy });
})();
