/** Add a local, decorative pointer glow without intercepting page interactions. */
Portfolio.register("pointerGlow", [], () => {
  const surface = document.createElement("div");
  surface.className = "pointer-glow";
  surface.setAttribute("aria-hidden", "true");
  document.body.append(surface);
  const preference = matchMedia(
    "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
  );
  let enabled = false,
    visible = false,
    x = 0,
    y = 0;

  // Coalesce pointer events into one paint per frame; no idle animation loop is needed.
  const paint = Portfolio.frameTask(() => {
    if (!enabled || !visible) return;
    surface.style.setProperty("--pointer-glow-x", `${x}px`);
    surface.style.setProperty("--pointer-glow-y", `${y}px`);
    surface.classList.add("is-visible");
  });
  /** Fade out on viewport exit, lost focus or a touch interaction. */
  function hide() {
    visible = false;
    surface.classList.remove("is-visible");
  }
  /** Record only mouse coordinates; touch input hides the decorative layer. */
  function move(event) {
    if (event.pointerType !== "mouse") return hide();
    x = event.clientX;
    y = event.clientY;
    visible = true;
    paint();
  }
  /** Ignore movement between page elements and hide only when leaving the viewport. */
  function leave(event) {
    if (!event.relatedTarget) hide();
  }
  /** Attach tracking only while the device and motion preferences permit it. */
  function syncPreference() {
    enabled = preference.matches;
    hide();
    window.removeEventListener("pointermove", move);
    if (enabled)
      window.addEventListener("pointermove", move, { passive: true });
  }
  window.addEventListener("pointerout", leave);
  window.addEventListener("blur", hide);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hide();
  });
  preference.addEventListener("change", syncPreference);
  syncPreference();
});
