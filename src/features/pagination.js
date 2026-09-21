/** Shared load-more controls for bounded collections; pagination ownership stays in the data layer. */
Portfolio.register("paging", ["data"], ({ data }) => {
  const t = Portfolio.t,
    e = Portfolio.escape;
  const labels = {
    experiences: "moreExperiences",
    projects: "moreProjects",
    categories: "moreCategories",
  };
  /** Render the same loading, retry and terminal states for every paginated section. */
  function control(name) {
    const state = data.page(name);
    if (state.loaded && !state.hasMore && !state.error) return "";
    const remaining =
      name === "projects"
        ? ` (${Math.max(0, state.total - state.ids.length)})`
        : "";
    return `<div class="pagination-control" data-page-control="${name}" aria-live="polite">${state.error ? `<span class="load-error">${e(t("loadError"))}</span>` : ""}<button type="button" class="load-page" data-page="${name}" ${state.loading ? "disabled" : ""} aria-busy="${state.loading}">${e(t(state.loading ? "loading" : state.error ? "retry" : labels[name]))}${state.loading || state.error ? "" : remaining}</button></div>`;
  }
  /** Refresh status text without rebuilding cards while a request is in flight. */
  function update(name) {
    document
      .querySelectorAll(`[data-page-control="${name}"]`)
      .forEach((node) => {
        node.outerHTML = control(name);
      });
  }
  Portfolio.delegate(document, "click", ".load-page", async (event, button) => {
    const name = button.dataset.page;
    try {
      await data.loadPage(name);
    } catch {
      /* The shared control presents a retry without discarding existing rows. */
    }
    document
      .querySelector(`[data-page="${name}"]`)
      ?.focus({ preventScroll: true });
  });
  document.addEventListener("portfolio:pagechange", (event) =>
    update(event.detail),
  );
  return { control };
});
