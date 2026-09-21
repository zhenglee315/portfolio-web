// Fit the ordered skill preview to three quarters of its available width, including +N.
Portfolio.register("skills", ["data"], ({ data }) => {
  const t = Portfolio.t,
    escapeText = Portfolio.escape;
  const skillLabel = data.skillLabel;
  const previewFraction = PORTFOLIO_RUNTIME.skills.previewFraction;
  const requests = new Map();
  /** Share the Bootstrap plus-lg icon and localized count across every skill disclosure. */
  function skillsButtonText(count) {
    return (
      Icons.svg("plus-lg") +
      escapeText(t(count === 1 ? "moreSkill" : "moreSkills", { count }))
    );
  }
  /** Provide a full screen-reader description for the compact expand control. */
  function skillsButtonLabel(count) {
    return t(count === 1 ? "showSkill" : "showSkills", { count });
  }
  /** Render skill chips for Experience, Projects, project dialogs and Skills categories. */
  function tags(items, owner) {
    // Experience and Project labels are complete; only categories use skill IDs.
    const label = !owner.startsWith("category-")
      ? (value) => value
      : skillLabel;
    if (!items?.length && !data.skillsState(owner).total) return "";
    const skills = [...(items || [])],
      id = `extra-skills-${owner}`;
    const total = data.skillsState(owner).total;
    return `<div class="tags" data-skill-preview data-skill-owner="${escapeText(owner)}"><span class="skill-preview"></span><span class="extra-skills" id="${id}" hidden>${skills.map((skill) => `<span class="tag">${escapeText(label(skill))}</span>`).join("")}</span><button type="button" class="tag skills-toggle" aria-expanded="false" aria-controls="${id}" aria-label="${escapeText(skillsButtonLabel(total))}" data-count="${total}">${skillsButtonText(total)}</button><button type="button" class="skills-load-more" hidden>${escapeText(t("moreSkillPage"))}</button><span class="skills-error" role="status" hidden></span></div>`;
  }
  /** Apply disclosure state and recompute the width-dependent layout. */
  function setSkillsExpanded(button, expanded) {
    button.setAttribute("aria-expanded", String(expanded));
    document.getElementById(button.getAttribute("aria-controls")).hidden =
      !expanded;
    layout(button.closest(".tags"));
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest(".skills-toggle");
    if (button) {
      setSkillsExpanded(
        button,
        button.getAttribute("aria-expanded") !== "true",
      );
      if (button.getAttribute("aria-expanded") === "true")
        loadMore(button.closest(".tags"));
    }
    const more = event.target.closest(".skills-load-more");
    if (more) loadMore(more.closest(".tags"));
  });
  /** Request one bounded page; all views of this relationship share the data cache. */
  async function loadMore(group) {
    const owner = group.dataset.skillOwner,
      state = requests.get(owner) || {};
    if (state.loading || !data.skillsState(owner).hasMore) return;
    state.loading = true;
    state.error = false;
    requests.set(owner, state);
    layout(group);
    try {
      await data.loadSkills(owner);
    } catch {
      state.error = true;
    } finally {
      state.loading = false;
      document
        .querySelectorAll(`[data-skill-owner="${owner}"]`)
        .forEach(layout);
    }
  }
  /** Refresh relationship markup without rebuilding the map, timeline or an open dialog. */
  document.addEventListener("portfolio:skillschange", (event) => {
    for (const group of document.querySelectorAll("[data-skill-owner]")) {
      const owner = group.dataset.skillOwner;
      if (owner !== event.detail) continue;
      const expanded =
        group.querySelector(".skills-toggle").getAttribute("aria-expanded") ===
        "true";
      const focused = group.contains(document.activeElement);
      const holder = document.createElement("div");
      holder.innerHTML = tags(data.skillsState(owner).ids, owner);
      const next = holder.firstElementChild;
      group.replaceWith(next);
      setSkillsExpanded(next.querySelector(".skills-toggle"), expanded);
      if (focused)
        next.querySelector(".skills-toggle").focus({ preventScroll: true });
    }
    refresh();
  });

  const observed = new Set(),
    widths = new WeakMap();

  /** Measure chip and toggle widths in the same CSS context before choosing a visible prefix. */

  function layout(group) {
    const width = group.getBoundingClientRect().width;
    if (!width) return; // Hidden history/dialogs are measured when opened.
    const preview = group.querySelector(".skill-preview");
    const extra = group.querySelector(".extra-skills");
    const button = group.querySelector("button.skills-toggle");
    const chips = [...preview.children, ...extra.children];
    const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
    const budget = width * previewFraction;
    group.style.setProperty(
      "--skill-preview-width",
      `${previewFraction * 100}%`,
    );
    const expanded = button.getAttribute("aria-expanded") === "true";
    const state = data.skillsState(group.dataset.skillOwner),
      totalCount = state.total;
    // Measure in the same CSS context without exposing overflow or duplicate IDs.
    const measure = document.createElement("span");
    measure.className = "skills-measure";
    measure.setAttribute("aria-hidden", "true");
    measure.inert = true;
    const row = document.createElement("span");
    row.className = "skills-measure-row";
    const copies = chips.map((chip) => chip.cloneNode(true));
    const probes = Array.from({ length: chips.length + 1 }, (_, count) => {
      const probe = document.createElement("button");
      probe.className = button.className;
      probe.type = "button";
      probe.tabIndex = -1;
      probe.innerHTML = skillsButtonText(totalCount - count);
      return probe;
    });
    row.append(...copies, ...probes);
    measure.append(row);
    group.append(measure);
    let keep = chips.length;
    try {
      const sizes = copies.map((chip) => chip.getBoundingClientRect().width);
      const buttonSizes = probes.map(
        (probe) => probe.getBoundingClientRect().width,
      );
      const total =
        sizes.reduce((sum, size) => sum + size, 0) +
        Math.max(0, sizes.length - 1) * gap;
      if (total > budget || state.hasMore) {
        keep = 0;
        let used = 0;
        for (let count = 0; count <= chips.length; count++) {
          if (count) used += sizes[count - 1] + (count > 1 ? gap : 0);
          const needed = used + (count ? gap : 0) + buttonSizes[count];
          if (needed <= budget) keep = count;
        }
      }
    } finally {
      measure.remove();
    }
    chips.forEach((chip, i) => (i < keep ? preview : extra).append(chip));
    const hidden = totalCount - keep;
    extra.hidden = !expanded;
    button.hidden = hidden === 0;
    button.dataset.count = hidden;
    group.dataset.previewCount = keep;
    button.setAttribute(
      "aria-label",
      expanded ? t("lessSkillsLabel") : skillsButtonLabel(hidden),
    );
    button.innerHTML = expanded
      ? Icons.svg("dash-lg") + escapeText(t("lessSkills"))
      : skillsButtonText(hidden);
    const request = requests.get(group.dataset.skillOwner) || {},
      more = group.querySelector(".skills-load-more"),
      error = group.querySelector(".skills-error");
    more.hidden = !expanded || !state.hasMore;
    more.disabled = !!request.loading;
    more.textContent = t(
      request.loading ? "loading" : request.error ? "retry" : "moreSkillPage",
    );
    error.hidden = !request.error;
    error.textContent = request.error ? t("loadError") : "";
    // Fill a wide preview incrementally, but never fetch the entire expanded collection in a loop.
    if (
      !expanded &&
      state.hasMore &&
      keep === chips.length &&
      !request.loading &&
      !request.error
    )
      queueMicrotask(() => {
        if (group.isConnected) loadMore(group);
      });
  }
  const schedule = Portfolio.frameTask(() => {
    observed.forEach((group) => {
      if (group.isConnected) layout(group);
    });
  });
  const observer = new ResizeObserver((entries) => {
    for (const { target, contentRect } of entries) {
      if (widths.get(target) !== contentRect.width) {
        widths.set(target, contentRect.width);
        schedule();
      }
    }
  });
  /** Observe new groups and release detached groups before scheduling a shared layout pass. */
  function refresh(root = document) {
    observed.forEach((group) => {
      if (!group.isConnected) {
        observer.unobserve(group);
        observed.delete(group);
      }
    });
    root.querySelectorAll(".tags[data-skill-preview]").forEach((group) => {
      if (!observed.has(group)) {
        observed.add(group);
        observer.observe(group);
      }
    });
    schedule();
  }
  document.fonts.ready.then(schedule);
  document.fonts.addEventListener("loadingdone", schedule);
  window.addEventListener("resize", schedule);
  /** Capture stable owner IDs so reordering data does not lose expanded groups. */
  function capture() {
    return [
      ...document.querySelectorAll('.skills-toggle[aria-expanded="true"]'),
    ].map((button) => button.getAttribute("aria-controls"));
  }
  /** Restore only groups that still exist after a content refresh. */
  function restore(ids) {
    for (const id of ids) {
      const button = document.querySelector('[aria-controls="' + id + '"]');
      if (button) setSkillsExpanded(button, true);
    }
  }
  return { refresh, layout, tags, capture, restore };
});
