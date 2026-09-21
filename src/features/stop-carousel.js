// Destination browsing depends on content width, never a fixed stop count.
Portfolio.register("carousel", [], () => {
  const root = document.querySelector(".stops-carousel");
  const list = root.querySelector(".stops");
  const previous = root.querySelector('[data-slide="previous"]');
  const next = root.querySelector('[data-slide="next"]');
  let frame = null,
    followSelection = false;
  /** Choose scroll behavior from the current reduced-motion preference. */
  const motion = () => (Portfolio.reducedMotion() ? "instant" : "smooth");
  /** Disable only the arrow whose boundary has been reached. */
  function updateArrows() {
    const max = Math.max(0, list.scrollWidth - list.clientWidth);
    previous.disabled = list.scrollLeft <= 1;
    next.disabled = list.scrollLeft >= max - 1;
  }
  /** Scroll the selected item into this strip without moving the outer page. */
  function revealSelected(behavior = "instant") {
    const selected = list.querySelector(".stop.active");
    if (!selected) return;
    const box = list.getBoundingClientRect(),
      item = selected.getBoundingClientRect();
    const delta =
      item.left < box.left
        ? item.left - box.left
        : item.right > box.right
          ? item.right - box.right
          : 0;
    if (Math.abs(delta) > 1) list.scrollBy({ left: delta, behavior });
    updateArrows();
  }
  /** Measure overflow after layout and preserve pending selection-follow requests. */
  function refresh(keepSelected = true) {
    followSelection ||= keepSelected;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!root.clientWidth) return;
      const contentWidth = [...list.children].reduce(
        (total, item) => total + item.getBoundingClientRect().width,
        0,
      );
      const overflow = contentWidth > root.clientWidth + 1;
      root.classList.toggle("has-overflow", overflow);
      previous.hidden = next.hidden = !overflow;
      if (followSelection) revealSelected();
      followSelection = false;
      updateArrows();
    });
  }
  /** Advance by a useful portion of the viewport with the current motion preference. */
  function slide(direction) {
    const amount = Math.max(
      list.clientWidth * 0.8,
      list.firstElementChild?.getBoundingClientRect().width || 0,
    );
    list.scrollBy({ left: direction * amount, behavior: motion() });
  }
  previous.addEventListener("click", () => slide(-1));
  next.addEventListener("click", () => slide(1));
  list.addEventListener("scroll", updateArrows, { passive: true });
  list.addEventListener("keydown", (event) => {
    const items = [...list.querySelectorAll(".stop")],
      current = items.indexOf(event.target);
    if (
      current < 0 ||
      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
    )
      return;
    event.preventDefault();
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : Math.max(
              0,
              Math.min(
                items.length - 1,
                current + (event.key === "ArrowRight" ? 1 : -1),
              ),
            );
    items[target].focus({ preventScroll: true });
    const box = list.getBoundingClientRect(),
      item = items[target].getBoundingClientRect();
    list.scrollBy({
      left:
        item.left < box.left
          ? item.left - box.left
          : item.right > box.right
            ? item.right - box.right
            : 0,
      behavior: motion(),
    });
  });
  Portfolio.observeLayout(root, () => refresh());
  return { refresh, revealSelected };
});
