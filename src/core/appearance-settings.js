/** Frontend-owned appearance preferences. Cookie storage has an offline-safe fallback. */
Portfolio.register("appearanceSettings", [], () => {
  const key = "portfolio-appearance";
  const themes = Object.freeze(["mint", "blue", "amber", "mist"]);
  const defaults = Object.freeze({
    theme: "mint",
    speed: 1,
    brightness: 80,
    paused: false,
  });
  const ranges = Object.freeze({
    speed: Object.freeze({ min: 0.4, max: 2, step: 0.1 }),
    brightness: Object.freeze({ min: 20, max: 100, step: 5 }),
  });
  /** Accept only supported values; corrupted or older preferences cannot break startup. */
  function normalize(value) {
    const input = value && typeof value === "object" ? value : {};
    const result = {
      ...defaults,
      theme: themes.includes(input.theme) ? input.theme : defaults.theme,
      paused:
        typeof input.paused === "boolean" ? input.paused : defaults.paused,
    };
    for (const [name, range] of Object.entries(ranges)) {
      const number =
        typeof input[name] === "number" && Number.isFinite(input[name])
          ? input[name]
          : defaults[name];
      result[name] = Number(
        (
          Math.round(
            Math.min(range.max, Math.max(range.min, number)) / range.step,
          ) * range.step
        ).toFixed(1),
      );
    }
    return result;
  }
  /** Cookies are primary on HTTP(S); file:// and blocked storage degrade without errors. */
  function read() {
    try {
      const cookie = document.cookie
        .split("; ")
        .find((entry) => entry.startsWith(`${key}=`));
      if (cookie)
        return normalize(
          JSON.parse(decodeURIComponent(cookie.slice(key.length + 1))),
        );
    } catch {
      /* Try local storage when the cookie is malformed or inaccessible. */
    }
    try {
      return normalize(JSON.parse(localStorage.getItem(key)));
    } catch {
      return { ...defaults };
    }
  }
  let state = read();
  /** Apply before data initialization to avoid an unnecessary default-theme repaint. */
  function apply() {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.setProperty(
      "--field-brightness",
      state.brightness / 100,
    );
  }
  /** Save the same validated preferences to cookies and the offline fallback. */
  function persist() {
    const serialized = JSON.stringify(state);
    try {
      document.cookie = `${key}=${encodeURIComponent(serialized)}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    } catch {
      /* Some privacy modes reject cookie access. */
    }
    try {
      localStorage.setItem(key, serialized);
    } catch {
      /* Keep in-memory settings usable when persistent storage is disabled. */
    }
  }
  /** Notify independent UI and animation consumers through one validated state boundary. */
  function update(patch) {
    state = normalize({ ...state, ...patch });
    apply();
    persist();
    document.dispatchEvent(
      new CustomEvent("portfolio:appearancechange", { detail: { ...state } }),
    );
  }
  apply();
  return Object.freeze({
    themes,
    defaults,
    ranges,
    get: () => ({ ...state }),
    update,
    reset: () => update(defaults),
  });
});
