/** Accessible appearance disclosure; controls use the same keys as persisted preferences. */
Portfolio.register(
  "appearance",
  ["appearanceSettings"],
  ({ appearanceSettings: settings }) => {
    const button = document.querySelector("#appearance-toggle");
    const panel = document.querySelector("#appearance-panel");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const { t, escape, disclosure } = Portfolio;
    panel.innerHTML = `<div class="appearance-heading"><strong data-i18n="ui.appearance">Background</strong></div>
    ${Object.entries(settings.ranges)
      .map(
        ([name, range]) =>
          `<label class="appearance-label" for="appearance-${name}"><span data-i18n="ui.${name}"></span><output for="appearance-${name}"></output></label><input id="appearance-${name}" data-setting="${name}" type="range" min="${range.min}" max="${range.max}" step="${range.step}">`,
      )
      .join("")}
    <div class="appearance-palette" role="group" data-i18n-aria-label="ui.palette">${settings.themes.map((theme) => `<button type="button" data-theme-option="${theme}" aria-pressed="false"><i aria-hidden="true"></i><span data-i18n="ui.theme${theme}">${escape(theme)}</span></button>`).join("")}</div>
    <p class="appearance-motion-note" data-i18n="ui.reducedMotionNote" hidden></p>
    <div class="appearance-actions"><button type="button" data-setting="paused"></button><button type="button" data-appearance-reset>${Icons.svg("arrow-counterclockwise")}<span data-i18n="ui.resetAppearance"></span></button></div>`;
    /** Refresh values without replacing focused controls during language or slider changes. */
    function refresh() {
      const state = settings.get();
      button.title = t("appearance");
      for (const name of Object.keys(settings.ranges)) {
        panel.querySelector(`[data-setting="${name}"]`).value = state[name];
        panel.querySelector(`output[for="appearance-${name}"]`).value =
          name === "speed" ? `${state[name].toFixed(1)}×` : `${state[name]}%`;
      }
      panel
        .querySelectorAll("[data-theme-option]")
        .forEach((option) =>
          option.setAttribute(
            "aria-pressed",
            String(option.dataset.themeOption === state.theme),
          ),
        );
      const pause = panel.querySelector('[data-setting="paused"]');
      const stopped = state.paused || motion.matches;
      pause.innerHTML = `${Icons.svg(stopped ? "play-fill" : "pause-fill")}<span>${escape(t(stopped ? "playBackground" : "pauseBackground"))}</span>`;
      pause.setAttribute("aria-pressed", String(stopped));
      pause.disabled = motion.matches;
      panel.querySelector(".appearance-motion-note").hidden = !motion.matches;
    }
    /** Close the settings panel and restore its trigger when dismissed by keyboard. */
    function close(focus = false) {
      disclosure(button, panel, false);
      if (focus) button.focus();
    }
    button.addEventListener("click", () => {
      const open = panel.hidden;
      disclosure(button, panel, open);
      if (open) panel.querySelector("input").focus();
    });
    panel.addEventListener("input", (event) => {
      const name = event.target.dataset.setting;
      if (Object.hasOwn(settings.ranges, name))
        settings.update({ [name]: Number(event.target.value) });
    });
    panel.addEventListener("click", (event) => {
      const option = event.target.closest("[data-theme-option]");
      if (option) settings.update({ theme: option.dataset.themeOption });
      if (event.target.closest('[data-setting="paused"]'))
        settings.update({ paused: !settings.get().paused });
      if (event.target.closest("[data-appearance-reset]")) settings.reset();
    });
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    });
    for (const event of ["pointerdown", "focusin"])
      document.addEventListener(event, (action) => {
        if (!action.target.closest(".appearance-switch")) close();
      });
    document.addEventListener("portfolio:appearancechange", refresh);
    document.addEventListener("languagechange", refresh);
    motion.addEventListener("change", refresh);
    I18n.applyStatic();
    refresh();
  },
);
