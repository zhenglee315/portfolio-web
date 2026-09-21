/** Accessible language disclosure; translation lookup and persistence remain in i18n.js. */
Portfolio.register("languageMenu", [], () => {
  const button = document.querySelector("#language-toggle"),
    menu = document.querySelector("#language-menu");
  menu.innerHTML = I18n.options
    .map(
      (option) =>
        `<button type="button" role="menuitemradio" lang="${Portfolio.escape(option.code)}" data-locale="${Portfolio.escape(option.code)}" aria-checked="false">${Portfolio.escape(option.label)}<span data-icon="check-lg" aria-hidden="true"></span></button>`,
    )
    .join("");
  Icons.mount(menu);
  const options = [...menu.querySelectorAll("[data-locale]")];
  /** Synchronize radio state and the compact language badge. */
  function refresh() {
    button.title = I18n.t("ui.language");
    options.forEach((option) =>
      option.setAttribute(
        "aria-checked",
        String(option.dataset.locale === I18n.locale),
      ),
    );
    document.querySelector("#language-code").textContent = I18n.options.find(
      (option) => option.code === I18n.locale,
    ).short;
  }
  /** Close the menu and optionally restore focus to its trigger. */
  function close(focus = false) {
    Portfolio.disclosure(button, menu, false);
    if (focus) button.focus();
  }
  /** Open the menu and focus the active language option. */
  function open() {
    Portfolio.disclosure(button, menu, true);
    options.find((o) => o.dataset.locale === I18n.locale).focus();
  }
  button.addEventListener("click", () => (menu.hidden ? open() : close()));
  button.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      open();
    }
  });
  options.forEach((option) =>
    option.addEventListener("click", async () => {
      menu.setAttribute("aria-busy", "true");
      try {
        await I18n.setLanguage(option.dataset.locale);
        menu.querySelector(".language-error")?.remove();
        refresh();
        close(true);
      } catch {
        // Keep the menu usable so selecting the language again retries the failed request.
        let status = menu.querySelector(".language-error");
        if (!status) {
          status = document.createElement("p");
          status.className = "language-error";
          status.setAttribute("role", "alert");
          menu.append(status);
        }
        status.textContent = I18n.t("ui.loadError");
      } finally {
        menu.setAttribute("aria-busy", "false");
      }
    }),
  );
  menu.addEventListener("keydown", (e) => {
    const index = options.indexOf(document.activeElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? options.length - 1
            : (index + (e.key === "ArrowDown" ? 1 : -1) + options.length) %
              options.length;
      options[next].focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (!e.target.closest(".language-switch")) close();
  });
  document.addEventListener("focusin", (e) => {
    if (!e.target.closest(".language-switch")) close();
  });
  document.addEventListener("languagechange", refresh);
  I18n.applyStatic();
  refresh();
});
