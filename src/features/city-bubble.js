/** A delegated tooltip feature bound to stable career IDs, independent of SVG recreation. */
Portfolio.register("cityBubble", ["data", "journey"], ({ data }) => {
  const panel = document.querySelector(".map-panel"),
    bubble = document.createElement("div"),
    e = Portfolio.escape;
  bubble.id = "city-bubble";
  bubble.className = "pixel-bubble";
  bubble.hidden = true;
  bubble.innerHTML = `<div class="pixel-shell"><div class="pixel-content" id="city-bubble-description" role="tooltip"></div><button class="pixel-close" aria-label="${e(Portfolio.t("closeCity"))}" data-i18n-aria-label="ui.closeCity">${Icons.svg("x-lg")}</button></div><span class="pixel-tail" aria-hidden="true"></span>`;
  panel.append(bubble);
  let selectedId = null;
  /** Constrain the tooltip and its tail to the map panel, leaving destination controls accessible. */
  function position() {
    if (!selectedId || bubble.hidden) return;
    const node = document.querySelector(
      `.city-node[data-stop="${selectedId}"] .city-core`,
    );
    if (!node) return;
    const bounds = panel.getBoundingClientRect(),
      point = node.getBoundingClientRect(),
      x = point.left + point.width / 2 - bounds.left,
      y = point.top + point.height / 2 - bounds.top;
    const width = bubble.offsetWidth,
      height = bubble.offsetHeight,
      left = Math.max(
        12,
        Math.min(bounds.width - width - 12, x - width * 0.65),
      );
    let top = y - height - 24;
    if (top < 12) top = y + 24;
    const stopsTop =
      document.querySelector(".stops").getBoundingClientRect().top - bounds.top;
    top = Math.max(12, Math.min(stopsTop - height - 24, top));
    bubble.classList.toggle("below", top > y);
    bubble.classList.toggle("over-point", y >= top && y <= top + height);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
    bubble.style.setProperty(
      "--tail-x",
      `${Math.max(26, Math.min(width - 42, x - left))}px`,
    );
  }
  /** Render direct Journey fields; category icons share the Experience presentation helper. */
  function show(id) {
    const entry = data.journey.find((row) => row.id === id);
    if (!entry) {
      hide();
      return;
    }
    selectedId = id;
    const dates = CareerDates.labels(entry);
    bubble.querySelector("#city-bubble-description").innerHTML =
      `<div class="pixel-city">${e(entry.city)} <span>/ ${e(entry.countryName)}</span></div><div class="pixel-date">${e(dates.date)}</div><div class="journey-organization-name">${CategoryIcon(entry.type)}<span>${e(entry.organizationName)}</span></div><div class="journey-organization-title">${e(entry.organizationTitle)}</div>${entry.detail ? `<div class="journey-detail"><strong>${e(entry.detail.content)}</strong><span>${e(CareerDates.labels(entry.detail).date)}</span></div>` : ""}`;
    document.querySelectorAll(".city-node").forEach((node) => {
      const active = Number(node.dataset.stop) === id;
      node.classList.toggle("bubble-active", active);
      if (active)
        node.setAttribute("aria-describedby", "city-bubble-description");
      else node.removeAttribute("aria-describedby");
    });
    bubble.hidden = false;
    position();
  }
  /** Remove visual and accessibility state together when a tooltip closes. */
  function hide() {
    bubble.hidden = true;
    selectedId = null;
    document.querySelectorAll(".city-node").forEach((node) => {
      node.classList.remove("bubble-active");
      node.removeAttribute("aria-describedby");
    });
  }
  const svg = document.querySelector("#journey-map");
  Portfolio.delegate(svg, "pointerover", ".city-node", (event, node) => {
    // Hovering either the marker or its visible label opens the same numeric-ID record.
    if (
      event.pointerType !== "touch" &&
      !node.contains(event.relatedTarget) &&
      !node.matches(":focus-visible")
    )
      show(Number(node.dataset.stop));
  });
  Portfolio.delegate(svg, "pointerout", ".city-node", (event, node) => {
    if (event.pointerType !== "touch" && !node.contains(event.relatedTarget))
      hide();
  });
  Portfolio.delegate(svg, "focusin", ".city-node", (_, node) =>
    show(Number(node.dataset.stop)),
  );
  Portfolio.delegate(svg, "focusout", ".city-node", (_, node) => {
    if (Number(node.dataset.stop) === selectedId) hide();
  });
  Portfolio.delegate(svg, "click", ".city-node", (_, node) =>
    show(Number(node.dataset.stop)),
  );
  Portfolio.delegate(
    document.querySelector("#stops"),
    "click",
    ".stop",
    (event, node) => {
      if (
        event.pointerType === "touch" ||
        event.detail === 0 ||
        matchMedia("(hover: none)").matches
      )
        show(Number(node.dataset.stop));
      else hide();
    },
  );
  document.querySelector("#stops").addEventListener("focusout", hide);
  bubble.querySelector(".pixel-close").addEventListener("click", hide);
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".city-node,.pixel-bubble,.stop")) hide();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hide();
  });
  document.addEventListener("portfolio:maplayout", position);
  new ResizeObserver(Portfolio.frameTask(position)).observe(panel);
  /** Refresh an open tooltip after data or language updates without opening a closed tooltip. */
  function refresh(id = selectedId) {
    if (id) show(id);
    else hide();
  }
  return { refresh, hide, capture: () => selectedId };
});
