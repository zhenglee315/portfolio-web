/** Responsive navigation disclosure; URL navigation remains in the navigation module. */
Portfolio.register("mobileMenu", [], () => {
  const button = document.querySelector("#menu-toggle"),
    sidebar = document.querySelector("#sidebar"),
    backdrop = document.querySelector("#menu-backdrop");
  /** Apply visual and accessible state together. */
  function setOpen(open) {
    const mobile = Portfolio.isMobile();
    open = mobile && open;
    // Closed off-canvas links must not remain keyboard targets during or after sliding out.
    if (!open && mobile && sidebar.contains(document.activeElement))
      button.focus({ preventScroll: true });
    sidebar.inert = mobile && !open;
    sidebar.classList.toggle("open", open);
    Portfolio.disclosure(button, backdrop, open);
    button.setAttribute(
      "aria-label",
      Portfolio.t(open ? "closeNav" : "openNav"),
    );
    button.innerHTML = Icons.svg(open ? "x-lg" : "list");
  }
  button.addEventListener("click", () =>
    setOpen(!sidebar.classList.contains("open")),
  );
  backdrop.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  Portfolio.delegate(sidebar, "click", "a", () => setOpen(false));
  let mobileLayout = Portfolio.isMobile();
  window.addEventListener("resize", () => {
    const next = Portfolio.isMobile();
    if (next === mobileLayout) return;
    mobileLayout = next;
    // Clear drawer state when crossing the breakpoint; desktop navigation stays interactive.
    setOpen(false);
  });
  return { refresh: () => setOpen(sidebar.classList.contains("open")) };
});
