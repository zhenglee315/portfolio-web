/** Project geographic data onto the existing Mercator atlas; no per-city lookup tables. */
window.MapGeometry = (() => {
  const radians = Math.PI / 180;
  /** Clamp only the projection near the poles; API validation retains the original coordinates. */
  const mercatorY = (latitude) =>
    Math.log(
      Math.tan(
        Math.PI / 4 +
          (Math.max(-85.051129, Math.min(85.051129, latitude)) * radians) / 2,
      ),
    );
  /** Use the exact projection metadata of world.svg, independent of viewport scaling. */
  function project({ latitude, longitude }) {
    const { scale, center, translate } = PORTFOLIO_RUNTIME.journey.projection;
    return [
      translate[0] + scale * (longitude - center[0]) * radians,
      translate[1] + scale * (mercatorY(center[1]) - mercatorY(latitude)),
    ];
  }
  /** Derive a bounded flight arc from the endpoints, including coincident stops. */
  function route(a, b) {
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (distance < 1)
      return `M ${a} C ${a[0] + 20} ${a[1] - 30} ${b[0] - 20} ${b[1] - 30} ${b}`;
    const bend = Math.min(85, Math.max(18, distance * 0.18));
    return `M ${a} Q ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2 - bend} ${b}`;
  }
  /** Place measured labels in free space, prioritizing selection and hiding crowded labels. */
  function layoutLabels(svg, selectedId) {
    const box = svg.viewBox.baseVal,
      scale = svg.getScreenCTM()?.a || 1;
    const gap = 12 / scale,
      padding = 4 / scale;
    const nodes = [...svg.querySelectorAll(".city-node")];
    const markers = nodes.map((node) => ({
      x: Number(node.dataset.x),
      y: Number(node.dataset.y),
    }));
    const occupied = [];
    /** Detect overlap between measured label rectangles during collision placement. */
    const intersects = (a, b) =>
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y;
    nodes.sort(
      (a, b) =>
        Number(b.dataset.stop === String(selectedId)) -
        Number(a.dataset.stop === String(selectedId)),
    );
    for (const node of nodes) {
      const label = node.querySelector(".city-label"),
        leader = node.querySelector(".city-leader");
      const x = Number(node.dataset.x),
        y = Number(node.dataset.y);
      label.style.fontSize = `${Math.max(12, 10 / scale)}px`;
      label.setAttribute("visibility", "visible");
      label.setAttribute("text-anchor", "start");
      label.setAttribute("x", "0");
      label.setAttribute("y", "0");
      const measured = label.getBBox();
      let chosen;
      // Shared candidate directions and distances replace per-location offsets.
      for (const radius of [gap, gap * 2.5, gap * 4]) {
        for (const [dx, dy] of [
          [1, -1],
          [1, 1],
          [-1, -1],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [-1, 0],
        ]) {
          const left =
            dx < 0
              ? x - radius - measured.width
              : dx > 0
                ? x + radius
                : x - measured.width / 2;
          const top =
            dy < 0
              ? y - radius - measured.height
              : dy > 0
                ? y + radius
                : y - measured.height / 2;
          const candidate = {
            x: left - padding,
            y: top - padding,
            width: measured.width + 2 * padding,
            height: measured.height + 2 * padding,
          };
          if (
            candidate.x < box.x + padding ||
            candidate.y < box.y + padding ||
            candidate.x + candidate.width > box.x + box.width - padding ||
            candidate.y + candidate.height > box.y + box.height - padding
          )
            continue;
          if (
            occupied.some((other) => intersects(candidate, other)) ||
            markers.some((p) =>
              intersects(candidate, {
                x: p.x - padding,
                y: p.y - padding,
                width: 2 * padding,
                height: 2 * padding,
              }),
            )
          )
            continue;
          chosen = { ...candidate, left, top };
          break;
        }
        if (chosen) break;
      }
      label.setAttribute("visibility", chosen ? "visible" : "hidden");
      leader.setAttribute("visibility", chosen ? "visible" : "hidden");
      if (!chosen) continue;
      occupied.push(chosen);
      label.setAttribute("x", String(chosen.left - x));
      label.setAttribute("y", String(chosen.top - y - measured.y));
      const endX = Math.max(
        chosen.left,
        Math.min(chosen.left + measured.width, x),
      );
      const endY = Math.max(
        chosen.top,
        Math.min(chosen.top + measured.height, y),
      );
      leader.setAttribute("d", `M 0 0 L ${endX - x} ${endY - y}`);
    }
  }
  return Object.freeze({ project, route, layoutLabels });
})();
