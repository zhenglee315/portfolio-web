/** Journey playback and SVG rendering. Selection is a career ID, never an array index. */
Portfolio.register("journey", ["data", "carousel"], ({ data, carousel }) => {
  const svg = document.querySelector("#journey-map"),
    t = Portfolio.t,
    element = Portfolio.svg;
  const timing = PORTFOLIO_RUNTIME.journey;
  let items = [],
    paths = new Map(),
    plane,
    activeRoute,
    selectedId = null,
    elapsed = 0,
    last = 0,
    highlightedId = null;
  let playing = !Portfolio.reducedMotion();
  /** Translate the selected ID into the current display order only when needed. */
  const index = () => items.findIndex((row) => row.id === selectedId);
  /** Synchronize the city marker with selection or an arriving plane. */
  function highlight(id) {
    if (highlightedId === id) return;
    highlightedId = id;
    svg.querySelectorAll(".city-node").forEach((node) => {
      const active = Number(node.dataset.stop) === id;
      node.classList.toggle("selected", active);
      node.setAttribute("aria-pressed", String(active));
    });
    MapGeometry.layoutLabels(svg, id);
  }
  /** Update action labels without changing playback state. */
  function controls() {
    document.querySelector("#play-icon").innerHTML = Icons.svg(
      playing ? "pause-fill" : "play-fill",
    );
    document.querySelector("#play-text").textContent = t(
      playing ? "pause" : "play",
    );
    document
      .querySelector("#play")
      .setAttribute("aria-label", t(playing ? "pauseJourney" : "playJourney"));
    document.querySelector("#loop-label").textContent = t(
      playing ? "looping" : "paused",
    );
    for (const selector of ["#play", "#restart"])
      document.querySelector(selector).disabled = !items.length;
  }
  /** Render progress along the current SVG route; the last stop has no invented return flight. */
  function paint() {
    if (!plane) return;
    const i = index(),
      path = paths.get(selectedId);
    highlight(
      items[
        i < items.length - 1 && elapsed >= timing.holdMs + timing.flightMs
          ? i + 1
          : i
      ]?.id,
    );
    if (!path) {
      plane.setAttribute("visibility", "hidden");
      activeRoute.setAttribute("d", "");
      return;
    }
    plane.setAttribute("visibility", "visible");
    const length = path.getTotalLength(),
      progress = Math.max(
        0,
        Math.min(1, (elapsed - timing.holdMs) / timing.flightMs),
      ),
      distance = length * progress;
    const point = path.getPointAtLength(distance),
      next = path.getPointAtLength(Math.min(length, distance + 1)),
      previous = path.getPointAtLength(Math.max(0, distance - 1));
    const angle =
      (Math.atan2(next.y - previous.y, next.x - previous.x) * 180) / Math.PI;
    plane.setAttribute(
      "transform",
      `translate(${point.x} ${point.y}) rotate(${angle})`,
    );
    activeRoute.setAttribute("d", path.getAttribute("d"));
    activeRoute.style.strokeDasharray = length;
    activeRoute.style.strokeDashoffset = length - distance;
  }
  /** Display the same selected record in the status panel and destination strip. */
  function status() {
    const i = index(),
      entry = items[i];
    document.querySelector("#step-index").textContent =
      `${String(entry ? i + 1 : 0).padStart(2, "0")} / ${String(items.length).padStart(2, "0")}`;
    document.querySelector("#stop-date").textContent = entry?.date || "";
    document.querySelector("#stop-organization-name").textContent =
      entry?.organizationName || t("emptyJourney");
    document.querySelector("#stop-summary").textContent = entry
      ? `${entry.organizationTitle} · ${entry.city}, ${entry.countryName}`
      : "";
    document.querySelector("#route-label").textContent = !entry
      ? ""
      : i < items.length - 1
        ? `${entry.city.toUpperCase()} → ${items[i + 1].city.toUpperCase()}`
        : t("routeNext", { city: entry.city.toUpperCase() });
    document.querySelectorAll("#stops [data-stop]").forEach((node) => {
      const active = Number(node.dataset.stop) === selectedId;
      node.classList.toggle("active", active);
      node.setAttribute("aria-pressed", String(active));
    });
    paint();
    carousel.revealSelected();
  }
  /** Select a known ID; pointer and keyboard choices explicitly pause automatic playback. */
  function select(id, manual = true) {
    if (!items.some((row) => row.id === id)) return;
    selectedId = id;
    elapsed = 0;
    if (manual) playing = false;
    status();
    controls();
  }
  /** Build projected geometry from direct API fields without changing the supplied array order. */
  function build() {
    paths = new Map();
    highlightedId = null;
    svg.innerHTML = MAP_DATA.svg;
    // Rebuild the destination highlight from backend array order, independently of playback.
    const finalCountry = items.at(-1)?.countryCode;
    svg
      .querySelectorAll(".country")
      .forEach((country) =>
        country.classList.toggle(
          "final-country",
          country.dataset.country === finalCountry,
        ),
      );
    items.slice(0, -1).forEach((entry, i) => {
      const a = entry.point,
        b = items[i + 1].point;
      const path = element("path", {
        d: MapGeometry.route(a, b),
        class: "route",
      });
      svg.append(path);
      paths.set(entry.id, path);
    });
    activeRoute = element("path", { class: "active-route" });
    svg.append(activeRoute);
    items.forEach((entry) => {
      const node = element("g", {
        class: "city-node",
        "data-stop": entry.id,
        "data-x": entry.point[0],
        "data-y": entry.point[1],
        tabindex: 0,
        role: "button",
        "aria-label": t("exploreCity", entry),
        transform: `translate(${entry.point})`,
      });
      node.append(
        element("circle", { r: 15, class: "halo" }),
        element("path", {
          d: "",
          class: "city-leader",
        }),
        element("circle", { r: 4.5, class: "city-core" }),
      );
      const label = element("text", {
        x: 0,
        y: 0,
        class: "city-label",
        "text-anchor": "start",
      });
      label.textContent = entry.city.split(" · ")[0].toUpperCase();
      node.append(label);
      svg.append(node);
    });
    plane = element("g", { class: "plane" });
    const artwork = element("g", {
      transform: "rotate(90) scale(1.6) translate(-8 -8)",
    });
    artwork.innerHTML = Icons.svg("airplane-fill");
    artwork.firstElementChild.setAttribute("width", "16");
    artwork.firstElementChild.setAttribute("height", "16");
    artwork.firstElementChild.setAttribute("fill", "inherit");
    plane.append(artwork);
    svg.append(plane);
  }
  /** Keep the world view fluid on ultrawide displays without moving geographic points. */
  function resize() {
    const size = svg.getBoundingClientRect(),
      [, , baseWidth, height] = timing.viewBox;
    const width =
      innerWidth >= 1700 && size.height > 0
        ? Math.max(baseWidth, (height * size.width) / size.height)
        : baseWidth;
    // Extend the atlas viewport for future stops outside the original Eurasian crop.
    const left = Math.min(
      (baseWidth - width) / 2,
      ...items.map((row) => row.point[0] - 60),
    );
    const right = Math.max(
      (baseWidth + width) / 2,
      ...items.map((row) => row.point[0] + 60),
    );
    const top = Math.min(0, ...items.map((row) => row.point[1] - 50));
    const bottom = Math.max(height, ...items.map((row) => row.point[1] + 50));
    svg.setAttribute(
      "viewBox",
      `${left} ${top} ${right - left} ${bottom - top}`,
    );
    MapGeometry.layoutLabels(svg, highlightedId ?? selectedId);
    document.dispatchEvent(new CustomEvent("portfolio:maplayout"));
  }
  /** Refresh localized records while retaining valid selected IDs and elapsed playback time. */
  function refresh() {
    items = data.journey.map((row) => ({
      ...row,
      ...CareerDates.labels(row),
      point: MapGeometry.project(row),
    }));
    if (!items.some((row) => row.id === selectedId)) {
      selectedId = items[0]?.id ?? null;
      elapsed = 0;
    }
    if (!items.length) playing = false;
    build();
    status();
    controls();
    resize();
    svg.setAttribute(
      "aria-label",
      t("mapLabel", { cities: items.map((row) => row.city).join(" → ") }),
    );
    document.dispatchEvent(new CustomEvent("portfolio:maprender"));
  }
  /** Advance only while visible; clamp resumed frames to avoid large playback jumps. */
  function frame(now) {
    const delta = Math.min(now - last, 80);
    last = now;
    if (playing && items.length && !document.hidden) {
      elapsed += delta;
      const i = index(),
        limit =
          i === items.length - 1
            ? timing.finalHoldMs
            : timing.flightMs + timing.holdMs + timing.arrivalMs;
      if (elapsed > limit) select(items[(i + 1) % items.length].id, false);
      paint();
    }
    requestAnimationFrame(frame);
  }
  Portfolio.delegate(svg, "click", ".city-node", (_, node) =>
    select(Number(node.dataset.stop)),
  );
  Portfolio.delegate(svg, "keydown", ".city-node", (event, node) => {
    if (["Enter", " "].includes(event.key)) {
      event.preventDefault();
      node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    }
  });
  Portfolio.delegate(
    document.querySelector("#stops"),
    "click",
    ".stop",
    (_, node) => select(Number(node.dataset.stop)),
  );
  document.querySelector("#play").addEventListener("click", () => {
    if (items.length) playing = !playing;
    controls();
  });
  document.querySelector("#restart").addEventListener("click", () => {
    if (!items.length) return;
    playing = true;
    select(items[0].id, false);
  });
  new ResizeObserver(Portfolio.frameTask(resize)).observe(svg);
  document.fonts?.ready.then(resize);
  requestAnimationFrame(frame);
  return {
    refresh,
    select,
    get state() {
      return { selectedId, elapsed, playing };
    },
  };
});
