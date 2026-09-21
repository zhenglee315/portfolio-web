/** Shared browser primitives and dependency-ordered module lifecycle. No network access. */
window.Portfolio = (() => {
  const definitions = new Map(),
    instances = new Map(),
    starting = new Set();
  let started = false;
  /** Register a feature factory; factories execute once after all scripts are loaded. */
  function register(name, dependencies, factory) {
    if (definitions.has(name)) throw new Error(`Duplicate module: ${name}`);
    definitions.set(name, { dependencies, factory });
  }
  /** Resolve declared dependencies and reject circular module graphs. */
  function get(name) {
    if (instances.has(name)) return instances.get(name);
    const definition = definitions.get(name);
    if (!definition) throw new Error(`Unknown module: ${name}`);
    if (starting.has(name))
      throw new Error(`Circular module dependency: ${name}`);
    starting.add(name);
    try {
      const dependencies = Object.fromEntries(
        definition.dependencies.map((key) => [key, get(key)]),
      );
      const api = definition.factory(dependencies) || {};
      instances.set(name, api);
      return api;
    } finally {
      starting.delete(name);
    }
  }
  /** Initialize once; subsequent calls return the same module instances. */
  function start() {
    if (started) return;
    definitions.forEach((_, name) => get(name));
    started = true;
  }
  /** Escape all content inserted into HTML; SVG markup must come from the icon renderer. */
  function escape(value = "") {
    return String(value ?? "").replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  }
  /** Coalesce repeated layout requests without losing the latest arguments. */
  function frameTask(callback) {
    let frame = null,
      args;
    return (...next) => {
      args = next;
      if (frame !== null) return;
      frame = requestAnimationFrame(() => {
        frame = null;
        callback(...args);
      });
    };
  }
  /** Share resize and font invalidation between width-dependent components. */
  function observeLayout(element, callback) {
    const schedule = frameTask(callback);
    let width;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0].contentRect.width;
      if (next !== width) {
        width = next;
        schedule();
      }
    });
    observer.observe(element);
    window.addEventListener("resize", schedule);
    document.fonts.ready.then(schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", schedule);
      document.fonts.removeEventListener("loadingdone", schedule);
    };
  }
  /** Keep hidden state and the associated disclosure button synchronized. */
  function disclosure(button, panel, open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }
  /** Listen on a stable ancestor so re-rendering does not duplicate event handlers. */
  function delegate(root, event, selector, handler) {
    root.addEventListener(event, (action) => {
      const target = action.target.closest?.(selector);
      if (target && root.contains(target)) handler(action, target);
    });
  }
  /** Create an SVG node with explicit attributes in the correct namespace. */
  function svg(tag, attributes) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([key, value]) =>
      element.setAttribute(key, value),
    );
    return element;
  }
  /** Translation shorthand used by feature modules. */
  const t = (key, parameters) => I18n.t(`ui.${key}`, parameters);
  /** Read motion preferences at the time of interaction. */
  const reducedMotion = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Read the responsive mode from CSS so behavior and layout share one breakpoint. */
  const isMobile = () =>
    getComputedStyle(document.documentElement)
      .getPropertyValue("--mobile-layout")
      .trim() === "1";
  return Object.freeze({
    register,
    get,
    start,
    escape,
    frameTask,
    observeLayout,
    disclosure,
    delegate,
    svg,
    t,
    reducedMotion,
    isMobile,
  });
})();
