// Local dictionaries + a small browser adapter. No fetch, backend or CDN required.
window.I18n = (() => {
  const settings = PORTFOLIO_FRONTEND.localization;
  const supported = settings.supported.map((option) => option.code);
  let locale = settings.defaultLocale,
    loader = async () => {},
    sequence = 0;
  let saved = null;
  try {
    saved = localStorage.getItem("portfolio.language");
  } catch (_) {}
  if (supported.includes(saved)) locale = saved;
  /** Resolve a localized template with English fallback and named parameter interpolation. */
  const t = (key, params = {}) => {
    const value =
      window.PORTFOLIO_LOCALES[locale]?.[key] ??
      window.PORTFOLIO_LOCALES.en[key] ??
      key;
    return value.replace(/\{(\w+)\}/g, (_, name) =>
      String(params[name] ?? `{${name}}`),
    );
  };
  /** Apply text and accessible attributes from the active catalog to static markup. */
  function applyStatic(root = document) {
    root
      .querySelectorAll("[data-i18n]")
      .forEach((el) => (el.textContent = t(el.dataset.i18n)));
    for (const attribute of ["aria-label", "title", "alt", "content"])
      root
        .querySelectorAll(`[data-i18n-${attribute}]`)
        .forEach((el) =>
          el.setAttribute(
            attribute,
            t(el.getAttribute(`data-i18n-${attribute}`)),
          ),
        );
    document.documentElement.lang = locale;
  }
  /** Persist a supported locale and notify the composition root exactly once. */
  async function setLanguage(next) {
    if (!supported.includes(next)) return;
    const current = ++sequence;
    if (next === locale) return;
    // Keep the current UI intact until all loaded content has the requested translation.
    await loader(next);
    if (current !== sequence) return;
    locale = next;
    try {
      localStorage.setItem("portfolio.language", locale);
    } catch (_) {}
    applyStatic();
    document.dispatchEvent(
      new CustomEvent("languagechange", { detail: { locale } }),
    );
  }
  return {
    get locale() {
      return locale;
    },
    get supported() {
      return [...supported];
    },
    options: settings.supported,
    setLoader: (callback) => {
      loader = callback;
    },
    t,
    applyStatic,
    setLanguage,
  };
})();
