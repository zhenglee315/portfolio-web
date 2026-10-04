/** Own direct portfolio responses and loaded pages without exposing mock fixtures. */
Portfolio.register("data", ["dataContracts"], ({ dataContracts }) => {
  const {
    validateJourney,
    validateExperiences,
    validateProjects,
    validateSite,
    validate,
    validateCategoriesPage,
    validateSkillsPage,
  } = dataContracts;
  const paths = {
    site: "/portfolio/site",
    journey: "/portfolio/journey",
    experiences: "/portfolio/experiences",
    projects: "/portfolio/projects",
    categories: "/portfolio/skill-categories",
    skills: "/portfolio/skills",
  };
  /** Freeze records at the store boundary so views cannot change canonical content. */
  function freeze(value) {
    if (value && typeof value === "object") {
      Object.values(value).forEach(freeze);
      Object.freeze(value);
    }
    return value;
  }
  /** Detach incoming records before keeping them in the immutable store. */
  const copy = (value) => structuredClone(value);
  /** Notify features about one completed store lifecycle change. */
  const emit = (name, detail) =>
    document.dispatchEvent(new CustomEvent(name, { detail }));
  const emptySnapshot = freeze({ schemaVersion: 1, skills: [], skillCategories: [] });
  const siteByLocale = new Map();
  const journeyByLocale = new Map();
  const experiencesByLocale = new Map();
  const projectsByLocale = new Map();
  const categoriesByLocale = new Map();
  const numbered = {
    experiences: { cache: experiencesByLocale, validate: validateExperiences },
    projects: { cache: projectsByLocale, validate: validateProjects },
  };
  const numberedPages = Object.fromEntries(
    Object.keys(numbered).map((name) => [
      name,
      {
        ids: [],
        page: 0,
        pages: 0,
        size: PORTFOLIO_RUNTIME.pagination[name],
        total: 0,
        hasMore: true,
        loaded: false,
        loading: false,
        error: null,
      },
    ]),
  );
  const pending = new Map();
  let changeVersion = 0;

  /** Create an empty locale-owned category snapshot and cursor state. */
  function emptyCategoryState() {
    return {
      snapshot: emptySnapshot,
      page: {
        ids: [],
        limit: PORTFOLIO_RUNTIME.pagination.categories,
        total: 0,
        nextCursor: null,
        hasMore: true,
        loaded: false,
        loading: false,
        error: null,
      },
      continuations: new Map(),
    };
  }
  /** Read one locale's category state without publishing a missing state. */
  const categoryState = (locale = I18n.locale) =>
    categoriesByLocale.get(locale) || emptyCategoryState();
  /** Select category and skill labels for the visible locale. */
  const activeSnapshot = () => categoryState().snapshot;
  /** Resolve a loaded skill or category by stable ID. */
  const find = (table, id) =>
    activeSnapshot()[table].find((row) => row.id === id);
  /** Resolve a directly localized skill label for rendering. */
  const skillLabel = (id) => find("skills", id)?.label ?? id;
  /** Resolve a directly localized category label for rendering. */
  const categoryLabel = (id) => find("skillCategories", id)?.label ?? id;

  /** Import a complete skill snapshot for the active locale after reference validation. */
  function replace(value, notify = true) {
    const next = freeze(validate(copy(value)));
    const state = emptyCategoryState();
    state.snapshot = next;
    Object.assign(state.page, {
      ids: next.skillCategories.map((row) => row.id),
      total: next.skillCategories.length,
      nextCursor: null,
      hasMore: false,
      loaded: true,
    });
    categoriesByLocale.clear();
    categoriesByLocale.set(I18n.locale, state);
    changeVersion++;
    if (notify) emit("portfolio:datachange");
  }
  /** Import a complete numbered collection with its direct API record keys. */
  function replaceNumbered(name, rows, notify = true) {
    const resource = numbered[name];
    const next = freeze(copy(resource.validate(rows)));
    resource.cache.set(I18n.locale, next);
    const size = PORTFOLIO_RUNTIME.pagination[name];
    Object.assign(numberedPages[name], {
      ids: next.map((row) => row.id),
      page: Math.max(1, Math.ceil(next.length / size)),
      pages: Math.ceil(next.length / size),
      size,
      total: next.length,
      hasMore: false,
      loaded: true,
      loading: false,
      error: null,
    });
    changeVersion++;
    if (notify) emit("portfolio:datachange");
  }
  /** Replace only the active language's ordered journey records. */
  function replaceJourney(rows, notify = true) {
    journeyByLocale.set(I18n.locale, freeze(copy(validateJourney(rows))));
    if (notify) emit("portfolio:datachange");
  }
  /** A failed domain validation must not leave a successful client response cached. */
  async function read(path, query, check) {
    const response = await PortfolioApi.request(path, query);
    try {
      return check(response);
    } catch (error) {
      PortfolioApi.invalidate(path, query);
      throw error;
    }
  }
  /** Merge repeated skill references while requiring one label per locale. */
  function mergeSkills(existing, incoming) {
    const rows = new Map(existing.map((row) => [row.id, row]));
    for (const row of incoming) {
      if (rows.has(row.id) && rows.get(row.id).label !== row.label)
        throw new Error("Skill label changed within one locale: " + row.id);
      rows.set(row.id, row);
    }
    return [...rows.values()];
  }
  /** Append a category page into a private or active locale state. */
  function acceptCategoryPage(state, response, query) {
    validateCategoriesPage(response);
    if (
      response.page.limit !== query.limit ||
      (state.page.loaded && response.page.total !== state.page.total) ||
      (response.page.hasMore &&
        response.page.nextCursor === state.page.nextCursor)
    )
      throw new Error("Category pagination changed");
    const oldIds = new Set(state.page.ids);
    if (response.items.some((row) => oldIds.has(row.id)))
      throw new Error("Duplicate category across pages");
    const next = {
      schemaVersion: 1,
      skills: mergeSkills(state.snapshot.skills, response.included.skills),
      skillCategories: [...state.snapshot.skillCategories, ...response.items],
    };
    validate(next);
    if (next.skillCategories.length > response.page.total)
      throw new Error("Category count exceeds total");
    state.snapshot = freeze(copy(next));
    Object.assign(state.page, response.page, {
      ids: next.skillCategories.map((row) => row.id),
      loaded: true,
      error: null,
    });
  }
  /** Append a category's next skill page with the cursor from that same locale. */
  function acceptSkillPage(state, id, response, query) {
    validateSkillsPage(response);
    const old = state.snapshot.skillCategories.find((row) => row.id === id);
    if (!old) throw new Error("Unknown skill category: " + id);
    if (
      response.page.limit !== query.limit ||
      response.page.total !== old.skillsPage?.total ||
      (response.page.hasMore &&
        response.page.nextCursor === old.skillsPage?.nextCursor)
    )
      throw new Error("Skill pagination changed");
    const known = new Set(old.skillIds);
    if (response.items.some((row) => known.has(row.id)))
      throw new Error("Duplicate skill across pages");
    const updated = {
      ...old,
      skillIds: [...old.skillIds, ...response.items.map((row) => row.id)],
      skillsPage: response.page,
    };
    const next = {
      schemaVersion: 1,
      skills: mergeSkills(state.snapshot.skills, response.items),
      skillCategories: state.snapshot.skillCategories.map((row) =>
        row.id === id ? updated : row,
      ),
    };
    state.snapshot = freeze(copy(validate(next)));
    state.continuations.set(id, (state.continuations.get(id) || 0) + 1);
  }
  /** Load one numbered or category page without advancing state on failure. */
  function loadPage(name, notify = true) {
    const resource = paths[name];
    if (!resource || (name !== "categories" && !numbered[name]))
      return Promise.reject(new Error("Unknown page resource: " + name));
    const locale = I18n.locale;
    const key = `${name}:${locale}`;
    if (pending.has(key)) return pending.get(key);
    const state = name === "categories"
      ? categoriesByLocale.get(locale) || emptyCategoryState()
      : numberedPages[name];
    if (name === "categories" && !categoriesByLocale.has(locale))
      categoriesByLocale.set(locale, state);
    const page = name === "categories" ? state.page : state;
    if (page.loaded && !page.hasMore) return Promise.resolve();
    page.loading = true;
    page.error = null;
    emit("portfolio:pagechange", name);
    const query = name === "categories"
      ? {
          locale,
          limit: PORTFOLIO_RUNTIME.pagination.categories,
          cursor: page.nextCursor || undefined,
        }
      : {
          locale,
          page: page.page + 1,
          size: PORTFOLIO_RUNTIME.pagination[name],
        };
    const promise = read(resource, query, (response) => {
      if (name === "categories") {
        acceptCategoryPage(state, response, query);
      } else {
        const collection = numbered[name];
        const old = collection.cache.get(locale) || [];
        const next = [...old, ...response.items];
        collection.validate(next);
        if (
          (page.loaded && response.total !== page.total) ||
          response.page !== page.page + 1 ||
          response.size !== query.size ||
          next.length > response.total
        )
          throw new Error("Numbered pagination changed: " + name);
        collection.cache.set(locale, freeze(copy(next)));
        Object.assign(page, {
          ids: next.map((row) => row.id),
          page: response.page,
          pages: response.pages,
          size: response.size,
          total: response.total,
          hasMore: response.page < response.pages,
          loaded: true,
        });
      }
      changeVersion++;
    })
      .catch((error) => {
        page.error = error.message;
        throw error;
      })
      .finally(() => {
        page.loading = false;
        pending.delete(key);
        emit("portfolio:pagechange", name);
        if (notify) emit("portfolio:datachange");
      });
    pending.set(key, promise);
    return promise;
  }
  /** Load only the first visible page of each collection on startup. */
  async function initialize() {
    const locale = I18n.locale;
    const site = await read(paths.site, { locale }, validateSite);
    const journey = await read(paths.journey, { locale }, validateJourney);
    siteByLocale.set(locale, freeze(copy(site)));
    journeyByLocale.set(locale, freeze(copy(journey)));
    await Promise.all(
      ["experiences", "projects", "categories"].map((name) =>
        loadPage(name, false),
      ),
    );
  }
  /** Rebuild category pages with the target locale's own opaque cursors. */
  async function stageCategories(locale, source) {
    const staged = emptyCategoryState();
    if (!source.page.loaded) return staged;
    const queried = [];
    try {
      const wanted = source.page.ids.length;
      do {
        if (staged.page.loaded && !staged.page.hasMore)
          throw new Error("Localized category page ended early");
        const query = {
          locale,
          limit: PORTFOLIO_RUNTIME.pagination.categories,
          cursor: staged.page.nextCursor || undefined,
        };
        queried.push([paths.categories, query]);
        await read(paths.categories, query, (response) =>
          acceptCategoryPage(staged, response, query),
        );
      } while (staged.page.ids.length < wanted);
      if (
        staged.page.total !== source.page.total ||
        staged.page.hasMore !== source.page.hasMore ||
        staged.page.ids.length !== wanted ||
        staged.page.ids.some((id, index) => id !== source.page.ids[index])
      )
        throw new Error("Localized category identity, order or total changed");
      for (const sourceCategory of source.snapshot.skillCategories) {
        const id = sourceCategory.id;
        const count = source.continuations.get(id) || 0;
        let loaded = 0;
        while (
          loaded < count ||
          staged.snapshot.skillCategories.find((row) => row.id === id).skillIds
            .length < sourceCategory.skillIds.length
        ) {
          const record = staged.snapshot.skillCategories.find((row) => row.id === id);
          if (!record.skillsPage?.hasMore)
            throw new Error("Localized skill page ended early: " + id);
          const query = {
            locale,
            ownerType: "category",
            ownerId: id,
            cursor: record.skillsPage.nextCursor,
            limit: PORTFOLIO_RUNTIME.pagination.skills,
          };
          queried.push([paths.skills, query]);
          await read(paths.skills, query, (response) =>
            acceptSkillPage(staged, id, response, query),
          );
          loaded++;
        }
        const target = staged.snapshot.skillCategories.find((row) => row.id === id);
        if (
          target.skillIds.length !== sourceCategory.skillIds.length ||
          target.skillIds.some((skillId, index) =>
            skillId !== sourceCategory.skillIds[index]) ||
          (sourceCategory.skillsPage &&
            (target.skillsPage.total !== sourceCategory.skillsPage.total ||
              target.skillsPage.hasMore !== sourceCategory.skillsPage.hasMore))
        )
          throw new Error("Localized skill identity, order or total changed: " + id);
      }
      return staged;
    } catch (error) {
      queried.forEach(([path, query]) => PortfolioApi.invalidate(path, query));
      throw error;
    }
  }
  /** Stage every loaded resource before I18n commits the new visible locale. */
  async function prepareLocale(locale) {
    for (;;) {
      await Promise.allSettled([...pending.values()]);
      await PortfolioApi.translate(locale);
      await Promise.allSettled([...pending.values()]);
      const source = categoryState();
      const sourcePages = Object.fromEntries(
        Object.entries(numberedPages).map(([name, page]) => [
          name,
          { ...page, ids: [...page.ids] },
        ]),
      );
      const version = changeVersion;
      const site = await read(paths.site, { locale }, validateSite);
      const journey = await read(paths.journey, { locale }, validateJourney);
      const stagedNumbered = [];
      for (const [name, descriptor] of Object.entries(numbered)) {
        const sourcePage = sourcePages[name];
        if (!sourcePage.loaded) continue;
        const rows = [];
        const queries = [];
        try {
          for (let page = 1; page <= sourcePage.page; page++) {
            const query = {
              locale,
              page,
              size: PORTFOLIO_RUNTIME.pagination[name],
            };
            queries.push(query);
            const response = await read(paths[name], query, (result) => {
              if (
                result.page !== page ||
                result.size !== query.size ||
                result.total !== sourcePage.total ||
                result.pages !== sourcePage.pages ||
                !Array.isArray(result.items)
              )
                throw new Error("Localized numbered page changed: " + name);
              return result;
            });
            rows.push(...response.items);
          }
          descriptor.validate(rows);
          if (
            rows.length !== sourcePage.ids.length ||
            rows.some((row, index) => row.id !== sourcePage.ids[index])
          )
            throw new Error("Localized collection identity or order changed: " + name);
          stagedNumbered.push([descriptor.cache, freeze(copy(rows))]);
        } catch (error) {
          queries.forEach((query) => PortfolioApi.invalidate(paths[name], query));
          throw error;
        }
      }
      const stagedCategories = await stageCategories(locale, source);
      if (pending.size) {
        await Promise.allSettled([...pending.values()]);
        continue;
      }
      if (changeVersion !== version) continue;
      siteByLocale.set(locale, freeze(copy(site)));
      journeyByLocale.set(locale, freeze(copy(journey)));
      stagedNumbered.forEach(([cache, rows]) => cache.set(locale, rows));
      categoriesByLocale.set(locale, stagedCategories);
      return;
    }
  }
  /** Report the visible locale's skill labels, IDs, and continuation metadata. */
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
    const id = owner.slice("category-".length);
    const record = find("skillCategories", id);
    const ids = record?.skillIds || [];
    return {
      ids: [...ids],
      total: record?.skillsPage?.total ?? ids.length,
      nextCursor: record?.skillsPage?.nextCursor || null,
      hasMore: record?.skillsPage?.hasMore || false,
    };
  }
  /** Load one category skill continuation using the visible locale's cursor. */
  function loadSkills(owner) {
    if (!owner.startsWith("category-")) return Promise.resolve();
    const id = owner.slice("category-".length);
    const locale = I18n.locale;
    const state = categoriesByLocale.get(locale);
    const record = state?.snapshot.skillCategories.find((row) => row.id === id);
    if (!record) return Promise.reject(new Error("Unknown skill owner: " + owner));
    const key = `skills:${locale}:${id}`;
    if (pending.has(key)) return pending.get(key);
    if (!record.skillsPage?.hasMore) return Promise.resolve();
    const query = {
      locale,
      ownerType: "category",
      ownerId: id,
      cursor: record.skillsPage.nextCursor,
      limit: PORTFOLIO_RUNTIME.pagination.skills,
    };
    const promise = read(paths.skills, query, (response) =>
      acceptSkillPage(state, id, response, query),
    )
      .then(() => {
        changeVersion++;
        if (I18n.locale === locale) emit("portfolio:skillschange", owner);
      })
      .finally(() => pending.delete(key));
    pending.set(key, promise);
    return promise;
  }
  return Object.freeze({
    /** Read immutable categories and skills for the visible locale. */
    get snapshot() {
      return activeSnapshot();
    },
    replace,
    validate,
    find,
    skillLabel,
    categoryLabel,
    initialize,
    loadPage,
    loadSkills,
    skillsState,
    prepareLocale,
    validateJourney,
    replaceJourney,
    /** Import complete Experience records with their direct API fields. */
    replaceExperiences: (rows, notify) =>
      replaceNumbered("experiences", rows, notify),
    /** Import complete Project records with their direct API fields. */
    replaceProjects: (rows, notify) =>
      replaceNumbered("projects", rows, notify),
    validateProjects,
    /** Read loaded Project records for the visible locale. */
    get projects() {
      return projectsByLocale.get(I18n.locale) || Object.freeze([]);
    },
    validateExperiences,
    /** Read loaded Experience records for the visible locale. */
    get experiences() {
      return experiencesByLocale.get(I18n.locale) || Object.freeze([]);
    },
    /** Read the visible locale's full ordered journey. */
    get journey() {
      return journeyByLocale.get(I18n.locale) || Object.freeze([]);
    },
    /** Read the visible locale's site content groups. */
    get site() {
      return siteByLocale.get(I18n.locale);
    },
    page(name) {
      const state = name === "categories"
        ? categoryState().page
        : numberedPages[name];
      if (!state) throw new Error("Unknown page resource: " + name);
      return { ...state, ids: [...state.ids] };
    },
  });
});
