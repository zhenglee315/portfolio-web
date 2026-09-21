/** Application composition root. Features own their state; this file only dispatches lifecycle updates. */
(async () => {
  // Restore the locally owned theme before awaiting any content transport.
  Portfolio.get("appearanceSettings");
  const startup = document.querySelector("#startup-status");
  // Fixed UI strings are available before any API data, including offline failures.
  I18n.applyStatic(startup);
  startup.hidden = false;
  try {
    await Portfolio.get("data").initialize();
  } catch {
    startup.innerHTML = `<span>${Portfolio.escape(Portfolio.t("startupError"))}</span> <button type="button">${Portfolio.escape(Portfolio.t("retry"))}</button>`;
    // Only frontend UI translations are required; the site response can be unavailable.
    startup
      .querySelector("button")
      .addEventListener("click", () => location.reload());
    startup.setAttribute("role", "alert");
    return;
  }
  startup.hidden = true;
  I18n.setLoader(Portfolio.get("data").prepareLocale);
  Portfolio.start();
  const skills = Portfolio.get("skills");
  const refreshOrder = [
    "content",
    "siteContent",
    "chatme",
    "mobileMenu",
    "journey",
    "projects",
    "cityBubble",
  ];
  /** Apply a single coordinated refresh for either a language change or a validated data replacement. */
  function refresh() {
    const expanded = skills.capture();
    const tooltip = Portfolio.get("cityBubble").capture();
    I18n.applyStatic();
    refreshOrder.forEach((name) =>
      Portfolio.get(name).refresh(name === "cityBubble" ? tooltip : undefined),
    );
    skills.restore(expanded);
  }
  document.addEventListener("languagechange", refresh);
  document.addEventListener("portfolio:datachange", refresh);
  refresh();
  document.documentElement.dataset.ready = "true";
})();
