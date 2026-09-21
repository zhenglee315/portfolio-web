/** Share paginated expansion, collapse and focus behavior across record collections. */
Portfolio.register(
  "collectionDisclosure",
  ["data", "paging", "skills"],
  ({ data, paging, skills }) => {
    const e = Portfolio.escape;
    /** Render trusted card markup while escaping all labels, identifiers and metadata. */
    function render({
      id,
      collection,
      previewCount = 0,
      total,
      title,
      collapseTitle,
      contentId,
      content,
    }) {
      if (total <= previewCount) return "";
      const open = document.getElementById(id)?.open || false;
      return `<details class="collection-disclosure" id="${e(id)}" data-collection="${e(collection)}" data-preview-count="${previewCount}" ${open ? "open" : ""}><summary aria-controls="${e(contentId)}"><span><strong>${e(title)} <span class="collection-count">${total - previewCount}</span></strong></span><span class="expand-icon" aria-hidden="true">${Icons.svg("plus-circle-dotted")}</span></summary><div class="collection-items" id="${e(contentId)}" tabindex="-1">${open ? content + paging.control(collection) : ""}</div><button class="collapse-collection" type="button">${e(collapseTitle)} <span aria-hidden="true">${Icons.svg("arrow-up")}</span></button></details>`;
    }
    /** Prefer a useful control, falling back to the newly exposed content container. */
    function focusContent(details) {
      (
        details.querySelector(
          ".project-open, .skills-toggle:not([hidden]), .load-page:not([disabled])",
        ) || details.querySelector(".collection-items")
      ).focus({ preventScroll: true });
    }
    // Native details events do not bubble. Capture once for every collection and render refresh.
    document.addEventListener(
      "toggle",
      async (event) => {
        const details = event.target;
        if (
          !details.matches?.(".collection-disclosure") ||
          !details.isConnected
        )
          return;
        const panel = details.querySelector(".collection-items");
        if (!details.open) {
          panel.replaceChildren();
          skills.refresh();
          return;
        }
        const keyboard =
          document.activeElement === details.querySelector("summary");
        if (!panel.children.length)
          document.dispatchEvent(new CustomEvent("portfolio:datachange"));
        const collection = details.dataset.collection;
        const state = data.page(collection);
        // Rendering an open details element emits toggle again: never auto-retry errors
        // or load a second page when records beyond the preview are already cached.
        if (
          state.ids.length <= Number(details.dataset.previewCount) &&
          (!state.loaded || state.hasMore) &&
          !state.loading &&
          !state.error
        ) {
          try {
            await data.loadPage(collection);
          } catch {
            /* The shared pagination control presents the error and explicit retry. */
          }
        }
        skills.refresh();
        const current = document.getElementById(details.id);
        if (keyboard && current?.open) focusContent(current);
      },
      true,
    );
    Portfolio.delegate(
      document,
      "click",
      ".collapse-collection",
      (event, button) => {
        const details = button.closest(".collection-disclosure");
        details.open = false;
        details.querySelector(".collection-items").replaceChildren();
        details.querySelector("summary").focus({ preventScroll: true });
        details.scrollIntoView({ block: "center", behavior: "instant" });
        skills.refresh();
      },
    );
    return { render };
  },
);
