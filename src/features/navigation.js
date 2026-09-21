// One configuration supplies menu labels, icons, section IDs and URL fragments.
Portfolio.register("navigation", [], () => {
  const entries = window.PORTFOLIO_NAVIGATION;
  const routes = new Map();
  const nav = document.querySelector("[data-section-menu]");
  const sections = entries.map((entry) => {
    const section = document.querySelector(`[data-section="${entry.key}"]`);
    if (!section) throw new Error(`Missing section: ${entry.key}`);
    section.id = entry.slug;
    for (const slug of [entry.slug, ...(entry.aliases || [])]) {
      if (routes.has(slug)) throw new Error(`Duplicate section URL: ${slug}`);
      routes.set(slug, section);
    }
    const link = document.createElement("a");
    link.href = `#${entry.slug}`;
    // Preserve a localized accessible name when the visual label is collapsed.
    link.dataset.i18nAriaLabel = entry.labelKey;
    link.setAttribute("aria-label", I18n.t(entry.labelKey));
    const icon = document.createElement("span");
    icon.className = "nav-icon";
    icon.innerHTML = Icons.svg(entry.icon);
    const label = document.createElement("span");
    label.className = "nav-label";
    label.dataset.i18n = entry.labelKey;
    label.textContent = I18n.t(entry.labelKey);
    const number = document.createElement("small");
    number.textContent = String(nav.children.length + 1).padStart(2, "0");
    link.append(icon, label, number);
    nav.append(link);
    return section;
  });
  // Logos and calls to action refer to stable section keys, never duplicate URLs.
  document.querySelectorAll("[data-section-link]").forEach((link) => {
    const entry = entries.find(
      (entry) => entry.key === link.dataset.sectionLink,
    );
    if (!entry)
      throw new Error(`Unknown section link: ${link.dataset.sectionLink}`);
    link.href = `#${entry.slug}`;
  });
  const links = [...nav.querySelectorAll("a")];
  let ready = false,
    pending = null,
    timeout = null;

  /** Keep the active menu class and aria-current consistent. */

  function setActive(section) {
    links.forEach((link) => {
      const active = link.hash === `#${section.id}`;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  /** Resolve decoded canonical and legacy URL fragments safely. */
  function readHash() {
    try {
      return routes.get(decodeURIComponent(location.hash.slice(1)));
    } catch (_) {
      return undefined;
    }
  }
  /** Write explicit navigation to history; replace entries for passive scrolling. */
  function writeHash(section, push = false) {
    if (location.hash === `#${section.id}`) return;
    const url = new URL(location.href);
    url.hash = section.id;
    // Works on file:// as well as hosted URLs, preserving the query string.
    history[push ? "pushState" : "replaceState"](history.state, "", url);
  }
  /** Choose the reading position, including the last section at document end. */
  function readingSection() {
    const root = document.scrollingElement;
    if (
      root.scrollTop > 0 &&
      root.scrollHeight - root.clientHeight - root.scrollTop <= 3
    )
      return sections.at(-1);
    const line = Math.max(
      Portfolio.isMobile() ? 96 : 40,
      Math.min(220, innerHeight * 0.25),
    );
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= line) current = section;
      else break;
    }
    return current;
  }
  /** Reconcile the active section with an ongoing explicit navigation. */
  function update() {
    if (!ready) return;
    const section = pending || readingSection();
    setActive(section);
    // Do not add a history entry for every section passed during manual scrolling.
    if (!pending && (!location.hash || readHash())) writeHash(section);
  }
  const schedule = Portfolio.frameTask(update);
  /** Release the temporary destination lock when navigation finishes or is interrupted. */
  function finishNavigation() {
    pending = null;
    clearTimeout(timeout);
    schedule();
  }
  /** Scroll to a section while protecting its active state from intermediate sections. */
  function moveTo(section, behavior = "instant") {
    pending = section;
    clearTimeout(timeout);
    setActive(section);
    section.scrollIntoView({ block: "start", behavior });
    timeout = setTimeout(finishNavigation, behavior === "smooth" ? 1400 : 80);
  }
  /** Restore a valid deep link after load or browser history navigation. */
  function restoreHash() {
    if (!ready) return;
    const section = readHash();
    if (section) {
      writeHash(section);
      moveTo(section);
    } else if (!location.hash) moveTo(sections[0]);
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest(
      "[data-section-menu] a,[data-section-link]",
    );
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const section = routes.get(link.hash.slice(1));
    if (!section) return;
    event.preventDefault();
    writeHash(section, true);
    moveTo(section, Portfolio.reducedMotion() ? "instant" : "smooth");
  });
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  window.addEventListener("scrollend", finishNavigation);
  window.addEventListener("wheel", finishNavigation, { passive: true });
  window.addEventListener("touchstart", finishNavigation, { passive: true });
  window.addEventListener("keydown", (event) => {
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ].includes(event.key)
    )
      finishNavigation();
  });
  window.addEventListener("hashchange", restoreHash);
  window.addEventListener("popstate", restoreHash);
  document.addEventListener("languagechange", schedule);
  new ResizeObserver(schedule).observe(document.querySelector("main"));
  setActive(readHash() || sections[0]);
  /** Async content may finish after window.load; initialize deep links in either order. */
  function initializeNavigation() {
    ready = true;
    restoreHash();
    schedule();
  }
  // Let app.refresh mount the first cards before measuring section positions.
  if (document.readyState === "complete") queueMicrotask(initializeNavigation);
  else window.addEventListener("load", initializeNavigation, { once: true });
  return {};
});
