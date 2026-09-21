/** Normalize API responses and own loaded-page state; features never access the mock database. */
/**
 * SiteData retains the API's brand, profile, social and chatme groups without aliases.
 * Each locale supplies a complete object; field documentation lives in mock/site/README.md.
 * Collection snapshots and their schemaVersion exclude localized site, journey, experiences and projects content.
 */
Portfolio.register("data", ["dataContracts"], ({ dataContracts }) => {
  const {
    validateJourney,
    validateExperiences,
    validateProjects,
    validateSite,
    validate,
  } = dataContracts;
  const initial = {
    schemaVersion: 1,
    skills: [],
    skillCategories: [],
  };
  let snapshot;
  // Localized site fields are cached separately so late language responses cannot change active content.
  const siteByLocale = new Map();
  const journeyByLocale = new Map();
  const experiencesByLocale = new Map();
  const projectsByLocale = new Map();
  // Resource descriptors dispatch shared paging behavior without changing any record keys.
  const numbered = {
    experiences: { cache: experiencesByLocale, validate: validateExperiences },
    projects: { cache: projectsByLocale, validate: validateProjects },
  };
  /** Replace only the active language journey; array order is authoritative and IDs stay numeric. */
  function replaceJourney(rows, notify = true) {
    journeyByLocale.set(
      I18n.locale,
      freeze(structuredClone(validateJourney(rows))),
    );
    if (notify) emit("portfolio:datachange");
  }
  const pages = Object.fromEntries(
    ["experiences", "projects", "categories"].map((name) => [
      name,
      {
        ids: [],
        ...(Object.hasOwn(numbered, name)
          ? {
              page: 0,
              pages: 0,
              size: PORTFOLIO_RUNTIME.pagination[name],
            }
          : {}),
        total: 0,
        nextCursor: null,
        hasMore: true,
        loaded: false,
        loading: false,
        error: null,
      },
    ]),
  );
  const pending = new Map();
  /** Emit a narrow lifecycle event instead of forcing unrelated features to reinitialize. */
  const emit = (name, detail) =>
    document.dispatchEvent(new CustomEvent(name, { detail }));
  /** Freeze nested records so views cannot accidentally mutate canonical data. */
  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  /** Commit collection data only; validation failure preserves the snapshot and site cache. */
  function replace(value, notify = true) {
    const next = validate(JSON.parse(JSON.stringify(value)));
    snapshot = freeze(next);
    // Complete snapshot imports explicitly reset pagination; API merges use a separate path.
    for (const [name, records] of Object.entries({
      categories: next.skillCategories,
    }))
      Object.assign(pages[name], {
        ids: records.map((row) => row.id),
        total: records.length,
        hasMore: false,
        nextCursor: null,
        loaded: true,
        loading: false,
        error: null,
      });
    if (notify) document.dispatchEvent(new CustomEvent("portfolio:datachange"));
  }
  /** Import a complete localized collection while retaining its API keys and array order. */
  function replaceNumbered(name, rows, notify = true) {
    const resource = numbered[name];
    const next = freeze(structuredClone(resource.validate(rows)));
    resource.cache.set(I18n.locale, next);
    const size = PORTFOLIO_RUNTIME.pagination[name];
    Object.assign(pages[name], {
      ids: next.map((row) => row.id),
      total: next.length,
      page: Math.max(1, Math.ceil(next.length / size)),
      pages: Math.ceil(next.length / size),
      size,
      hasMore: false,
      loaded: true,
      loading: false,
      error: null,
    });
    if (notify) emit("portfolio:datachange");
  }
  /** Resolve category skill identities without exposing mutable records. */
  const find = (table, id) => snapshot[table].find((row) => row.id === id);
  /** Look up a unique skill label; all components share this dictionary. */
  const skillLabel = (id) => I18n.t(find("skills", id).labelKey);
  /** Merge category identities and skill prefixes without discarding already loaded labels. */
  function mergeRows(next, table, rows) {
    const entries = new Map(next[table].map((row) => [row.id, row]));
    for (const row of rows) {
      const old = entries.get(row.id) || {},
        merged = { ...old, ...row };
      if (old.skillIds && row.skillIds) {
        merged.skillIds = [...new Set([...old.skillIds, ...row.skillIds])];
        if (old.skillIds.length > row.skillIds.length)
          merged.skillsPage = old.skillsPage;
      }
      entries.set(row.id, merged);
    }
    next[table] = [...entries.values()];
  }
  /** Validate a detached merge and its translation references before publishing it to consumers. */
  function accept(response, table, rows = response.data) {
    const next = JSON.parse(JSON.stringify(snapshot)),
      oldCatalogs = PORTFOLIO_LOCALES;
    const catalogs = JSON.parse(JSON.stringify(oldCatalogs));
    for (const [locale, values] of Object.entries(
      response.included.translations,
    ))
      Object.assign(catalogs[locale], values);
    for (const name of ["skills"])
      mergeRows(next, name, response.included[name] || []);
    if (table) mergeRows(next, table, Array.isArray(rows) ? rows : [rows]);
    window.PORTFOLIO_LOCALES = catalogs;
    try {
      snapshot = freeze(validate(next));
    } catch (error) {
      window.PORTFOLIO_LOCALES = oldCatalogs;
      throw error;
    }
  }
  /** Resolve resource routing centrally rather than teaching each component HTTP query formats. */
  function definition(name) {
    const p = PORTFOLIO_RUNTIME.pagination;
    return {
      experiences: {
        path: "/experiences",
        size: p.experiences,
      },
      projects: { path: "/projects", size: p.projects },
      categories: {
        path: "/skill-categories",
        table: "skillCategories",
        limit: p.categories,
      },
    }[name];
  }
  /** Append one page once; failures preserve the page number or cursor and loaded rows. */
  function loadPage(name, notify = true) {
    if (pending.has(name)) return pending.get(name);
    const state = pages[name],
      resource = definition(name);
    if (!state || !resource)
      return Promise.reject(new Error("Unknown page resource: " + name));
    if (state.loaded && !state.hasMore) return Promise.resolve();
    state.loading = true;
    state.error = null;
    emit("portfolio:pagechange", name);
    const locale = I18n.locale;
    const query = Object.hasOwn(numbered, name)
      ? { locale, page: state.page + 1, size: resource.size }
      : {
          locale,
          cursor: state.nextCursor || undefined,
          limit: resource.limit,
        };
    const promise = PortfolioApi.request(resource.path, query)
      .then((response) => {
        if (Object.hasOwn(numbered, name)) {
          if (state.loaded && response.total !== state.total)
            throw new Error("Collection total changed; reload the page.");
          const resource = numbered[name];
          const old = resource.cache.get(locale) || [];
          const next = [...old, ...response.items];
          resource.validate(next);
          resource.cache.set(locale, freeze(structuredClone(next)));
          Object.assign(state, {
            total: response.total,
            pages: response.pages,
            page: response.page,
            size: response.size,
            ids: next.map((row) => row.id),
            hasMore: response.page < response.pages,
            loaded: true,
          });
          return;
        }
        if (!Array.isArray(response.data) || !response.page)
          throw new Error("Expected a paginated collection.");
        if (
          response.page.hasMore &&
          response.page.nextCursor === state.nextCursor
        )
          throw new Error("Pagination cursor did not advance.");
        const rows = response.data;
        accept(response, resource.table, rows);
        state.ids = [...new Set([...state.ids, ...rows.map((row) => row.id)])];
        Object.assign(state, response.page, { loaded: true });
      })
      .catch((error) => {
        PortfolioApi.invalidate(resource.path, query);
        state.error = error.message;
        throw error;
      })
      .finally(() => {
        state.loading = false;
        pending.delete(name);
        emit("portfolio:pagechange", name);
        if (notify) emit("portfolio:datachange");
      });
    pending.set(name, promise);
    return promise;
  }
  /** Bootstrap only the resources needed by the visible page; subsequent collection pages remain unloaded. */
  async function initialize() {
    const site = await PortfolioApi.request("/site");
    const content = validateSite(site.data);
    accept(site);
    siteByLocale.set(site.meta.locale, freeze(structuredClone(content)));
    const journey = await PortfolioApi.request("/journey");
    validateJourney(journey.data);
    accept(journey);
    journeyByLocale.set(
      journey.meta.locale,
      freeze(structuredClone(journey.data)),
    );
    await Promise.all(
      ["experiences", "projects", "categories"].map((name) =>
        loadPage(name, false),
      ),
    );
  }
  /** Stage all requested-locale content before the language service commits the new UI locale. */
  async function prepareLocale(locale) {
    const responses = await PortfolioApi.translate(locale);
    // Read the known resource from the locale cache so missing groups cannot evade validation.
    const site = await PortfolioApi.request("/site", { locale });
    const journey = await PortfolioApi.request("/journey", { locale });
    try {
      validateSite(site.data);
      validateJourney(journey.data);
    } catch (error) {
      PortfolioApi.invalidate("/site", { locale });
      PortfolioApi.invalidate("/journey", { locale });
      throw error;
    }
    const catalogs = structuredClone(PORTFOLIO_LOCALES);
    // Validate every localized collection before committing any visible-language content.
    const staged = [];
    for (const [name, resource] of Object.entries(numbered)) {
      const parts = responses
        .filter((item) => item.path === "/" + name)
        .sort((a, b) => a.response.page - b.response.page);
      const rows = parts.flatMap((item) => item.response.items);
      try {
        resource.validate(rows);
        if (
          parts.some((item) => item.response.total !== pages[name].total) ||
          rows.length !== pages[name].ids.length ||
          rows.some((row, index) => row.id !== pages[name].ids[index])
        )
          throw new Error(
            "Localized collection identity, order or total changed: " + name,
          );
      } catch (error) {
        parts.forEach(({ path, query }) =>
          PortfolioApi.invalidate(path, query),
        );
        throw error;
      }
      staged.push([resource.cache, freeze(structuredClone(rows))]);
    }
    for (const { path, response } of responses) {
      if (Object.hasOwn(numbered, path.slice(1))) continue;
      if (response.meta.locale !== locale)
        throw new Error("Unexpected translation locale");
      Object.assign(catalogs[locale], response.included.translations[locale]);
    }
    staged.forEach(([cache, rows]) => cache.set(locale, rows));
    // Other concurrent locale loads may have completed while this request was in flight.
    PORTFOLIO_LOCALES[locale] = catalogs[locale];
    siteByLocale.set(locale, freeze(structuredClone(site.data)));
    journeyByLocale.set(locale, freeze(structuredClone(journey.data)));
  }
  /** Resolve a category skill owner; card and dialog skills already arrive complete. */
  function ownerRecord(owner) {
    const canonical = owner,
      split = canonical.indexOf("-"),
      type = canonical.slice(0, split),
      id = canonical.slice(split + 1);
    const table = {
      category: "skillCategories",
    }[type];
    if (!table) throw new Error("Unknown skill owner: " + owner);
    return { type, id, table, record: find(table, id), key: canonical };
  }
  /** Report complete card skills or a category relationship preview for the shared UI. */
  function skillsState(owner) {
    if (!owner.startsWith("category-")) {
      const collection = owner.startsWith("experience-")
        ? experiencesByLocale
        : projectsByLocale;
      const id = Number(owner.slice(owner.indexOf("-") + 1));
      const record = (collection.get(I18n.locale) || []).find(
        (row) => row.id === id,
      );
      return {
        skills: record?.skills || [],
        total: record?.skills?.length || 0,
        hasMore: false,
      };
    }
    const { record } = ownerRecord(owner),
      ids = record?.skillIds || [];
    return {
      ids,
      total: record?.skillsPage?.total ?? ids.length,
      nextCursor: record?.skillsPage?.nextCursor || null,
      hasMore: record?.skillsPage?.hasMore || false,
    };
  }
  /** Fetch one additional relationship page and notify only skill presentations. */
  function loadSkills(owner) {
    if (!owner.startsWith("category-")) return Promise.resolve();
    const descriptor = ownerRecord(owner),
      key = "skills:" + descriptor.key,
      state = skillsState(owner);
    if (pending.has(key)) return pending.get(key);
    if (!state.hasMore) return Promise.resolve();
    const query = {
      ownerType: descriptor.type,
      ownerId: descriptor.id,
      cursor: state.nextCursor,
      limit: PORTFOLIO_RUNTIME.pagination.skills,
    };
    const promise = PortfolioApi.request("/skills", query)
      .then((response) => {
        if (
          response.page.hasMore &&
          response.page.nextCursor === state.nextCursor
        )
          throw new Error("Skill cursor did not advance.");
        const old = find(descriptor.table, descriptor.id),
          next = {
            ...old,
            skillIds: [
              ...new Set([
                ...old.skillIds,
                ...response.data.map((row) => row.id),
              ]),
            ],
            skillsPage: response.page,
          };
        accept(response, descriptor.table, next);
        emit("portfolio:skillschange", descriptor.key);
      })
      .catch((error) => {
        PortfolioApi.invalidate("/skills", query);
        throw error;
      })
      .finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  }
  snapshot = freeze(initial);
  return Object.freeze({
    get snapshot() {
      return snapshot;
    },
    replace,
    validate,
    find,
    skillLabel,
    initialize,
    loadPage,
    loadSkills,
    skillsState,
    prepareLocale,
    validateJourney,
    replaceJourney,
    replaceExperiences: (rows, notify) =>
      replaceNumbered("experiences", rows, notify),
    replaceProjects: (rows, notify) =>
      replaceNumbered("projects", rows, notify),
    validateProjects,
    get projects() {
      return projectsByLocale.get(I18n.locale) || Object.freeze([]);
    },
    validateExperiences,
    /** Return loaded cards for the active locale with exactly the API field names. */
    get experiences() {
      return experiencesByLocale.get(I18n.locale) || Object.freeze([]);
    },
    /** Return complete localized records in server array order, with no presentation aliases. */
    get journey() {
      return journeyByLocale.get(I18n.locale) || Object.freeze([]);
    },
    /** Read immutable content for the active locale, never the latest completed request. */
    get site() {
      return siteByLocale.get(I18n.locale);
    },
    page: (name) => ({ ...pages[name], ids: [...pages[name].ids] }),
  });
});
