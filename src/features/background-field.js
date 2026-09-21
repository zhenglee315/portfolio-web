/** Offline SVG signal field adapted from temp_web; no demo text or external dependencies. */
Portfolio.register(
  "backgroundField",
  ["appearanceSettings"],
  ({ appearanceSettings: settings }) => {
    const layer = document.createElement("div");
    layer.className = "background-field";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML =
      '<div class="field-ambient"></div><div class="field-ruler field-left"></div><div class="field-ruler field-right"></div><div class="field-frame field-top"></div><div class="field-frame field-bottom"></div>';
    const field = Portfolio.svg("svg", {
      class: "field-signals",
      focusable: "false",
    });
    layer.prepend(field);
    document.body.prepend(layer);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const active = new Map();
    // Consumers await one entrance boundary instead of copying animation delays.
    let resolveEntrance;
    const whenReady = new Promise((resolve) => {
      resolveEntrance = resolve;
    });
    let crosses = [],
      timer,
      entranceTimer;
    let state = settings.get();
    /** Suspend pulses for user pause, reduced motion or a hidden document. */
    const stopped = () => state.paused || motion.matches || document.hidden;
    /** Use viewport-sized geometry so long documents never allocate an unbounded signal grid. */
    function draw() {
      clearTimeout(timer);
      for (const animation of active.values()) animation.cancel();
      active.clear();
      crosses = [];
      const { width, height } = layer.getBoundingClientRect();
      field.setAttribute("viewBox", `0 0 ${width} ${height}`);
      const spacing = width < 600 ? 80 : 120;
      const columns = Math.ceil(width / spacing),
        rows = Math.ceil(height / spacing);
      const x0 = (width - (columns - 1) * spacing) / 2,
        y0 = (height - (rows - 1) * spacing) / 2;
      const lines = [],
        fragment = document.createDocumentFragment();
      for (let x = x0 % (spacing / 2); x < width; x += spacing / 2)
        lines.push(`M${x},0V${height}`);
      for (let y = y0 % (spacing / 2); y < height; y += spacing / 2)
        lines.push(`M0,${y}H${width}`);
      fragment.append(
        Portfolio.svg("path", { class: "field-grid", d: lines.join(" ") }),
      );
      for (let row = 0; row < rows; row++)
        for (let column = 0; column < columns; column++) {
          const x = x0 + column * spacing,
            y = y0 + row * spacing;
          const cross = Portfolio.svg("path", {
            class: "field-cross",
            d: `M${x - 7},${y}h14 M${x},${y - 7}v14`,
          });
          fragment.append(cross);
          crosses.push(cross);
        }
      field.replaceChildren(fragment);
      schedule();
    }
    /** Two soft peaks preserve the reference heartbeat without flashing page content. */
    function pulse(cross) {
      const glow = "drop-shadow(0 0 6px var(--accent))";
      const animation = cross.animate(
        [
          { offset: 0, opacity: 0.15, transform: "scale(1)", filter: "none" },
          { offset: 0.1, opacity: 0.7, transform: "scale(1.08)", filter: glow },
          {
            offset: 0.23,
            opacity: 0.23,
            transform: "scale(1)",
            filter: "none",
          },
          { offset: 0.36, opacity: 1, transform: "scale(1.16)", filter: glow },
          {
            offset: 0.55,
            opacity: 0.36,
            transform: "scale(1.02)",
            filter: "none",
          },
          { offset: 1, opacity: 0.15, transform: "scale(1)", filter: "none" },
        ],
        { duration: 1700, easing: "ease-in-out" },
      );
      animation.playbackRate = state.speed;
      active.set(cross, animation);
      animation.onfinish = () => active.delete(cross);
    }
    /** A small randomized batch runs only while visible, enabled and motion-safe. */
    function schedule() {
      clearTimeout(timer);
      if (stopped()) return;
      const available = crosses.filter((cross) => !active.has(cross));
      const count = Math.min(
        available.length,
        Math.max(1, Math.round(crosses.length / 42)),
      );
      for (let i = 0; i < count; i++)
        pulse(
          available.splice(Math.floor(Math.random() * available.length), 1)[0],
        );
      timer = setTimeout(schedule, (220 + Math.random() * 350) / state.speed);
    }
    /** Motion preference wins over stored playback, without overwriting that preference. */
    function sync() {
      state = settings.get();
      clearTimeout(timer);
      if (state.paused || motion.matches) finishEntrance();
      for (const animation of active.values()) {
        animation.updatePlaybackRate(state.speed);
        if (motion.matches) animation.cancel();
        else if (stopped()) animation.pause();
        else animation.play();
      }
      if (motion.matches) active.clear();
      schedule();
    }
    /** Never leave content hidden: entrance effects are finite and removed independently. */
    function finishEntrance() {
      clearTimeout(entranceTimer);
      document.body.classList.remove("field-entering");
      resolveEntrance();
    }
    if (!stopped()) {
      document.body.classList.add("field-entering");
      entranceTimer = setTimeout(finishEntrance, 1400);
    } else finishEntrance();
    // CSS owns the rail and mobile offsets; geometry observes its actual rendered box.
    new ResizeObserver(Portfolio.frameTask(draw)).observe(layer);
    document.addEventListener("portfolio:appearancechange", sync);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    draw();
    return { whenReady };
  },
);
