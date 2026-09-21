/** Desktop icon rail; responsive drawer behavior remains owned by mobileMenu. */
Portfolio.register("sidebarRail", ["navigation"], () => {
  const root = document.documentElement;
  const sidebar = document.querySelector("#sidebar");
  const button = document.querySelector("#sidebar-toggle");
  const tooltip = document.createElement("div");
  tooltip.id = "sidebar-tooltip";
  tooltip.className = "sidebar-tooltip";
  tooltip.setAttribute("role", "tooltip");
  tooltip.hidden = true;
  document.body.append(tooltip);
  let collapsed = false,
    anchor = null;
  /** Apply icon-only mode on desktop while leaving the mobile drawer independent. */
  const compact = () => collapsed && !Portfolio.isMobile();
  /** Remove only this component's description; links retain their localized accessible names. */
  function hideTooltip() {
    anchor?.removeAttribute("aria-describedby");
    anchor = null;
    tooltip.hidden = true;
  }
  /** Place one shared tooltip outside the scrollable rail so labels cannot be clipped. */
  function showTooltip(link) {
    if (!compact() || !link || !sidebar.contains(link)) return hideTooltip();
    if (anchor !== link) hideTooltip();
    anchor = link;
    const key = link.querySelector(".nav-label").dataset.i18n;
    tooltip.textContent = I18n.t(key);
    tooltip.hidden = false;
    link.setAttribute("aria-describedby", tooltip.id);
    const box = link.getBoundingClientRect(),
      rail = sidebar.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(rail.right + 10, innerWidth - tooltip.offsetWidth - 8))}px`;
    tooltip.style.top = `${Math.max(8, Math.min(box.top + (box.height - tooltip.offsetHeight) / 2, innerHeight - tooltip.offsetHeight - 8))}px`;
  }
  /** Toggle one CSS-owned width token; page, background and chat observe the resulting layout. */
  function refresh() {
    root.dataset.sidebarCollapsed = String(collapsed);
    button.setAttribute("aria-expanded", String(!collapsed));
    const label = Portfolio.t(collapsed ? "expandSidebar" : "collapseSidebar");
    button.setAttribute("aria-label", label);
    button.title = label;
    if (anchor) showTooltip(anchor);
  }
  button.addEventListener("click", () => {
    if (Portfolio.isMobile()) return;
    collapsed = !collapsed;
    hideTooltip();
    refresh();
  });
  sidebar.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "touch")
      showTooltip(event.target.closest("[data-section-menu] a"));
  });
  sidebar.addEventListener("pointerout", (event) => {
    if (
      anchor &&
      !anchor.contains(event.relatedTarget) &&
      !anchor.matches(":focus-visible")
    )
      hideTooltip();
  });
  document.addEventListener("focusin", (event) =>
    showTooltip(event.target.closest("[data-section-menu] a")),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideTooltip();
  });
  sidebar.addEventListener("click", (event) => {
    if (event.target.closest("[data-section-menu] a")) hideTooltip();
  });
  window.addEventListener("blur", hideTooltip);
  window.addEventListener("resize", hideTooltip);
  sidebar.addEventListener("scroll", hideTooltip, { passive: true });
  Portfolio.observeLayout(sidebar, () => {
    if (anchor) showTooltip(anchor);
  });
  document.addEventListener("languagechange", refresh);
  refresh();
});
