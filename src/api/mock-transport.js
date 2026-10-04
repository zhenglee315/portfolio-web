/** In-memory GET transport matching the six public Portfolio response shapes. */
window.MockPortfolioTransport = (() => {
  /** Detach fixtures and responses so consumers cannot mutate the transport database. */
  const clone = (value) => JSON.parse(JSON.stringify(value));

  /** Create an isolated transport for the embedded site or injectable test datasets. */
  function create(source, options = {}) {
    const db = clone(source),
      requests = [],
      failures = { ...options.failures };
    const pagination = {
      experiences: 6,
      projects: 6,
      categories: 12,
      skills: 12,
      skillPreview: 6,
    };

    /** Match FastAPI's public error body while preserving fields useful to callers. */
    function fail(status, code, message) {
      throw Object.assign(new Error(message), {
        status,
        code,
        retryable: status >= 500,
        body: { detail: code },
      });
    }

    /** Encode the same scoped keyset fields as the backend's skill cursor. */
    function cursorFor(resource, locale, position, id) {
      return btoa(JSON.stringify({ v: 1, resource, locale, position, id }))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
    }

    /** Reject malformed or cross-resource/language cursors before fetching a page. */
    function parseCursor(resource, locale, cursor) {
      if (cursor === undefined || cursor === null) return null;
      let value;
      try {
        if (
          typeof cursor !== "string" ||
          cursor.length < 1 ||
          cursor.length > 512 ||
          !/^[A-Za-z0-9_-]+$/.test(cursor)
        )
          throw new Error("Invalid cursor alphabet.");
        value = JSON.parse(
          atob(cursor.replaceAll("-", "+").replaceAll("_", "/")),
        );
      } catch {
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      }
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).sort().join(",") !==
          "id,locale,position,resource,v" ||
        value.v !== 1 ||
        value.resource !== resource ||
        value.locale !== locale ||
        !Number.isSafeInteger(value.position) ||
        value.position < 0 ||
        typeof value.id !== "string" ||
        value.id.length < 1 ||
        value.id.length > 128
      )
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      return value;
    }

    /** Return a bounded keyset page and the full collection's authoritative total. */
    function paginate(records, resource, locale, query, fallback) {
      const limit = query.limit === undefined ? fallback : Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50)
        fail(400, "INVALID_LIMIT", "limit must be an integer from 1 to 50.");
      const cursor = parseCursor(resource, locale, query.cursor);
      const remaining = records
        .map((item, position) => ({
          item,
          position,
          id: typeof item === "string" ? item : item.id,
        }))
        .filter(
          (row) =>
            !cursor ||
            row.position > cursor.position ||
            (row.position === cursor.position && row.id > cursor.id),
        );
      const selected = remaining.slice(0, limit),
        hasMore = remaining.length > limit,
        last = selected.at(-1);
      return {
        items: selected.map((row) => row.item),
        page: {
          limit,
          total: records.length,
          hasMore,
          nextCursor: hasMore
            ? cursorFor(resource, locale, last.position, last.id)
            : null,
        },
      };
    }

    /** Read a localized fixture; all supported languages are authored independently. */
    function localized(group, locale) {
      const value = db[group]?.[locale];
      if (value === undefined)
        fail(500, "INVALID_FIXTURE", `Missing ${group}/${locale} fixture.`);
      return value;
    }

    /** Dispatch the public paths with their direct, resource-specific responses. */
    function route(path, query) {
      const locale = query.locale ?? "en";
      if (!["en", "zh-Hans", "zh-Hant"].includes(locale))
        fail(400, "INVALID_LOCALE", "Unsupported locale.");
      if (path === "/portfolio/site") return clone(localized("site", locale));
      if (path === "/portfolio/journey")
        return clone(localized("journey", locale));

      if (["/portfolio/experiences", "/portfolio/projects"].includes(path)) {
        const resource = path.slice("/portfolio/".length),
          page = query.page === undefined ? 1 : Number(query.page),
          size = query.size === undefined ? pagination[resource] : Number(query.size);
        if (!Number.isSafeInteger(page) || page < 1)
          fail(400, "INVALID_PAGE", "page must be a positive integer.");
        if (size !== pagination[resource])
          fail(400, "INVALID_SIZE", "size must be 6.");
        const records = localized(resource, locale);
        return clone({
          total: records.length,
          pages: Math.ceil(records.length / size),
          page,
          size,
          items: records.slice((page - 1) * size, page * size),
        });
      }

      if (path === "/portfolio/skill-categories") {
        const categories = localized("skillCategories", locale),
          skills = localized("skills", locale),
          labels = new Map(skills.map((row) => [row.id, row]));
        const result = paginate(
          categories,
          "portfolio:skill-categories",
          locale,
          query,
          pagination.categories,
        );
        const included = new Map();
        const items = result.items.map((category) => {
          const preview = paginate(
            category.skillIds,
            `portfolio:skills:category:${category.id}`,
            locale,
            {},
            pagination.skillPreview,
          );
          for (const id of preview.items) {
            const skill = labels.get(id);
            if (!skill) fail(500, "INVALID_FIXTURE", `Missing skill: ${id}`);
            included.set(id, skill);
          }
          return {
            id: category.id,
            label: category.label,
            skillIds: preview.items,
            skillsPage: preview.page,
          };
        });
        return clone({
          items,
          page: result.page,
          included: { skills: [...included.values()] },
        });
      }

      if (path === "/portfolio/skills") {
        const ownerType = query.ownerType ?? "category";
        if (ownerType !== "category")
          fail(400, "INVALID_OWNER", "Unsupported skill owner type.");
        if (query.ownerId === undefined || query.ownerId === null)
          fail(422, "MISSING_OWNER_ID", "ownerId is required.");
        const ownerId = String(query.ownerId).trim();
        if (!ownerId) fail(400, "INVALID_OWNER_ID", "ownerId is required.");
        const owner = localized("skillCategories", locale).find(
          (row) => row.id === ownerId,
        );
        if (!owner) fail(404, "NOT_FOUND", "The skill owner does not exist.");
        const result = paginate(
          owner.skillIds,
          `portfolio:skills:category:${ownerId}`,
          locale,
          query,
          pagination.skills,
        );
        const labels = new Map(
          localized("skills", locale).map((row) => [row.id, row]),
        );
        return clone({
          items: result.items.map((id) => {
            const skill = labels.get(id);
            if (!skill) fail(500, "INVALID_FIXTURE", `Missing skill: ${id}`);
            return skill;
          }),
          page: result.page,
        });
      }
      fail(404, "NOT_FOUND", "Unknown resource.");
    }

    /** Keep requests asynchronous so a real HTTP transport can replace this one. */
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
  /** Load generated page scripts on demand; script tags also work under file://. */
  function createLazy(manifest) {
    /** Create an API-shaped error for failed local resource reads. */
    const fault = (status, code, message) =>
      Object.assign(new Error(message), {
        status,
        code,
        retryable: status >= 500,
        body: { detail: code },
      });
    /** Stop a request with a status and error code matching the mock API. */
    const fail = (status, code, message) => {
      throw fault(status, code, message);
    };
    const idPattern = /^[A-Za-z0-9_-]+$/;
    if (
      manifest?.kind !== "lazy" ||
      manifest.prefix !== "mock-pages" ||
      !manifest.totals ||
      !["experiences", "projects"].every(
        (key) => Number.isSafeInteger(manifest.totals[key]) && manifest.totals[key] >= 0,
      ) ||
      !Array.isArray(manifest.categories) ||
      !manifest.categories.every(
        (row) =>
          row &&
          typeof row.id === "string" &&
          idPattern.test(row.id) &&
          Array.isArray(row.skillIds) &&
          row.skillIds.every((id) => typeof id === "string" && idPattern.test(id)) &&
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

    /** Load one numbered chunk only when the requested page exists. */
    async function numbered(resource, locale, query) {
      const page = query.page === undefined ? 1 : Number(query.page),
        size = query.size === undefined ? 6 : Number(query.size),
        total = manifest.totals[resource],
        pages = Math.ceil(total / 6);
      if (!Number.isSafeInteger(page) || page < 1)
        fail(400, "INVALID_PAGE", "page must be a positive integer.");
      if (size !== 6) fail(400, "INVALID_SIZE", "size must be 6.");
      let items = [];
      if (page <= pages) {
        const key = `${resource}/${locale}/${page - 1}`;
        items = await chunk(key);
        if (
          !Array.isArray(items) ||
          items.length !== Math.min(6, total - (page - 1) * 6)
        )
          invalid(key, "Invalid numbered page.");
      }
      return { total, pages, page, size, items };
    }

    /** Encode the backend-compatible resource, language and position scope. */
    function cursorFor(resource, locale, position, id) {
      return btoa(JSON.stringify({ v: 1, resource, locale, position, id }))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "");
    }

    /** Validate an opaque continuation against its resource and language. */
    function parseCursor(resource, locale, cursor) {
      if (cursor === undefined || cursor === null) return null;
      let value;
      try {
        if (
          typeof cursor !== "string" ||
          cursor.length < 1 ||
          cursor.length > 512 ||
          !/^[A-Za-z0-9_-]+$/.test(cursor)
        )
          throw new Error("Invalid cursor alphabet.");
        value = JSON.parse(
          atob(cursor.replaceAll("-", "+").replaceAll("_", "/")),
        );
      } catch {
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      }
      if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).sort().join(",") !== "id,locale,position,resource,v" ||
        value.v !== 1 ||
        value.resource !== resource ||
        value.locale !== locale ||
        !Number.isSafeInteger(value.position) ||
        value.position < 0 ||
        typeof value.id !== "string" ||
        value.id.length < 1 ||
        value.id.length > 128
      )
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      return value;
    }

    /** Enforce the backend's allowed cursor page size. */
    function limitFor(query, fallback) {
      const limit = query.limit === undefined ? fallback : Number(query.limit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 50)
        fail(400, "INVALID_LIMIT", "limit must be an integer from 1 to 50.");
      return limit;
    }

    /** Describe one requested slice with a continuation token when needed. */
    function pageFor(ids, resource, locale, start, limit) {
      const end = Math.min(ids.length, start + limit),
        hasMore = end < ids.length;
      return {
        limit,
        total: ids.length,
        hasMore,
        nextCursor: hasMore
          ? cursorFor(resource, locale, end - 1, ids[end - 1])
          : null,
      };
    }

    /** Materialize only chunks intersecting the selected positions. */
    async function rowsFor(resource, locale, start, end, chunkSize, ids) {
      /** Resolve a category or skill chunk from one record position. */
      const keyFor = (position) => {
        const index = Math.floor(position / chunkSize);
        return resource.startsWith("skills/")
          ? `skills/${locale}/${resource.slice("skills/".length)}/${index}`
          : `${resource}/${locale}/${index}`;
      };
      const keys = new Set();
      for (let position = start; position < end; position++)
        keys.add(keyFor(position));
      const groups = new Map(
        await Promise.all(
          [...keys].map(async (key) => [key, await chunk(key)]),
        ),
      );
      return Array.from({ length: end - start }, (_, offset) => {
        const position = start + offset,
          key = keyFor(position),
          group = groups.get(key),
          row = group?.[position % chunkSize];
        if (
          !Array.isArray(group) ||
          group.length !== Math.min(chunkSize, ids.length - Math.floor(position / chunkSize) * chunkSize) ||
          !row ||
          row.id !== ids[position] ||
          typeof row.label !== "string" ||
          !row.label.trim()
        )
          invalid(key, "Invalid localized record.");
        return row;
      });
    }

    /** Assemble category previews from one bounded category slice and skill labels. */
    async function categoryPage(locale, query) {
      const resource = "portfolio:skill-categories",
        limit = limitFor(query, 12),
        cursor = parseCursor(resource, locale, query.cursor),
        ids = categories.map((row) => row.id);
      if (cursor && ids[cursor.position] !== cursor.id)
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      const start = cursor ? cursor.position + 1 : 0,
        end = Math.min(categories.length, start + limit),
        raw = await rowsFor("skill-categories", locale, start, end, 12, ids),
        results = await Promise.all(raw.map(async (row, offset) => {
          const owner = categories[start + offset],
            previewIds = owner.skillIds.slice(0, 6),
            key = `skill-categories/${locale}/${Math.floor((start + offset) / 12)}`;
          if (
            !Array.isArray(row.skillIds) ||
            row.skillIds.length !== owner.skillIds.length ||
            row.skillIds.some((id, index) => id !== owner.skillIds[index])
          )
            invalid(key, "Category skill membership differs from manifest.");
          const labels = previewIds.length
            ? await rowsFor(
              `skills/${owner.id}`, locale, 0, previewIds.length, 6, owner.skillIds,
            ) : [];
          return {
            labels,
            item: {
              id: owner.id,
              label: row.label,
              skillIds: previewIds,
              skillsPage: pageFor(
                owner.skillIds,
                `portfolio:skills:category:${owner.id}`,
                locale,
                0,
                6,
              ),
            },
          };
        })),
        included = new Map();
      for (const result of results)
        for (const skill of result.labels) included.set(skill.id, skill);
      return {
        items: results.map((result) => result.item),
        page: pageFor(ids, resource, locale, start, limit),
        included: { skills: [...included.values()] },
      };
    }

    /** Assemble one category's requested skill slice. */
    async function skillsPage(locale, query) {
      const ownerType = query.ownerType ?? "category";
      if (ownerType !== "category")
        fail(400, "INVALID_OWNER", "Unsupported skill owner type.");
      if (query.ownerId === undefined || query.ownerId === null)
        fail(422, "MISSING_OWNER_ID", "ownerId is required.");
      const ownerId = String(query.ownerId).trim();
      if (!ownerId) fail(400, "INVALID_OWNER_ID", "ownerId is required.");
      const owner = owners.get(ownerId);
      if (!owner) fail(404, "NOT_FOUND", "The skill owner does not exist.");
      const resource = `portfolio:skills:category:${ownerId}`,
        limit = limitFor(query, 12),
        cursor = parseCursor(resource, locale, query.cursor),
        ids = owner.skillIds;
      if (cursor && ids[cursor.position] !== cursor.id)
        fail(400, "INVALID_CURSOR", "The cursor is invalid.");
      const start = cursor ? cursor.position + 1 : 0,
        end = Math.min(ids.length, start + limit);
      return {
        items: await rowsFor(`skills/${ownerId}`, locale, start, end, 6, ids),
        page: pageFor(ids, resource, locale, start, limit),
      };
    }

    /** Mirror the six public GET routes without touching an unrequested chunk. */
    /** Dispatch one lazy GET request to the matching local chunks. */
    async function request({ method = "GET", path, query = {} }) {
      requests.push({ method, path, query: clone(query) });
      if (method !== "GET")
        fail(405, "METHOD_NOT_ALLOWED", "Only GET is supported.");
      const locale = query.locale ?? "en";
      if (!["en", "zh-Hans", "zh-Hant"].includes(locale))
        fail(400, "INVALID_LOCALE", "Unsupported locale.");
      if (path === "/portfolio/site") {
        const key = `site/${locale}`, payload = await chunk(key);
        if (!payload || Array.isArray(payload) || typeof payload !== "object")
          invalid(key, "Invalid site record.");
        return payload;
      }
      if (path === "/portfolio/journey") {
        const key = `journey/${locale}`, payload = await chunk(key);
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
      /** Clone every response before exposing it to the caller. */
      request: async (input) => clone(await request(input)),
      /** Return a detached request history for diagnostics and tests. */
      get requests() { return clone(requests); },
    });
  }
  return Object.freeze({ create, createLazy });
})();
