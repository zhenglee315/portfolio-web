/** Project dialog interactions, keyed by project ID; collection expansion is shared. */
Portfolio.register(
  "projects",
  ["data", "content", "skills"],
  ({ data, content, skills }) => {
    const dialog = document.querySelector("#project-dialog");
    let selectedId = null;
    /** Re-render the open project after language or data changes; removed records close cleanly. */
    function refresh() {
      if (!dialog.open) return;
      const project = data.projects.find((row) => row.id === selectedId);
      if (!project || !content.hasProjectDetail(project)) {
        dialog.close();
        return;
      }
      document.querySelector("#dialog-content").innerHTML =
        content.projectDetail(project);
      skills.refresh(dialog);
    }
    Portfolio.delegate(
      document.querySelector("#project-grid"),
      "click",
      "[data-project]",
      (event, button) => {
        selectedId = Number(button.dataset.project);
        dialog.showModal();
        refresh();
      },
    );
    document
      .querySelector(".dialog-close")
      .addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", () => {
      // Refresh may replace the originating button, so restore focus by stable identity.
      document
        .querySelector(`[data-project="${selectedId}"]`)
        ?.focus({ preventScroll: true });
      selectedId = null;
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    });
    return { refresh };
  },
);
