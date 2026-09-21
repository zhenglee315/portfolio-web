/** Bind approved site fields by their API paths and derive only presentation labels. */
Portfolio.register("siteContent", ["data"], ({ data }) => {
  const t = Portfolio.t;
  /** Keep Latin names in given-family order; localized Han names use family-given order. */
  function fullName(profile) {
    const parts = [profile.firstName, profile.familyName].filter(Boolean);
    return parts.every((part) => /^[\p{Script=Han}]+$/u.test(part)) &&
      parts.length
      ? [profile.familyName, profile.firstName].join("")
      : parts.join(" ");
  }
  /** Fill direct SiteData bindings and derived labels after static UI catalog bindings. */
  function refresh() {
    const { brand, profile, social } = data.site;
    const name = fullName(profile);
    // Attribute paths match the API keys exactly; text is never interpreted as HTML.
    const valueAt = (path) =>
      path.split(".").reduce((value, key) => value?.[key], data.site) ?? "";
    document
      .querySelectorAll("[data-site]")
      .forEach((node) => (node.textContent = valueAt(node.dataset.site)));
    document
      .querySelectorAll("[data-site-src]")
      .forEach((node) =>
        node.setAttribute("src", valueAt(node.dataset.siteSrc)),
      );
    // Keep API copy as plain text while preserving chatme.content paragraph boundaries.
    document.querySelectorAll("[data-site-paragraphs]").forEach((node) => {
      node.innerHTML = valueAt(node.dataset.siteParagraphs)
        .split(/\r?\n/)
        .map((line) => `<p>${Portfolio.escape(line)}</p>`)
        .join("");
    });
    document
      .querySelectorAll("[data-profile-name]")
      .forEach((node) => (node.textContent = name + t("namePunctuation")));
    document
      .querySelectorAll("[data-profile-home]")
      .forEach((node) =>
        node.setAttribute(
          "aria-label",
          t("home", { name, nickName: profile.nickName }),
        ),
      );
    document.title = [name, brand.titleSub].filter(Boolean).join(" — ");
    document.querySelector('meta[name="description"]').content =
      profile.content;
    document.querySelectorAll(".wordmark").forEach((mark) => {
      mark.innerHTML = `${Portfolio.escape(brand.title)}<span>.</span><span class="wordmark-alias">${Portfolio.escape(brand.titleSub)}</span>`;
    });
    const journey = data.journey,
      first = journey[0],
      last = journey.at(-1);
    // Existing UI slots use social keys verbatim; empty values remove stale destinations.
    document.querySelectorAll("[data-social]").forEach((link) => {
      const kind = link.dataset.social,
        value = social[kind];
      if (value) link.href = kind === "email" ? "mailto:" + value : value;
      else link.removeAttribute("href");
      link.hidden = !value;
      if (kind === "email") {
        link.title = t("email", { email: value });
        if (link.classList.contains("social-link"))
          link.setAttribute("aria-label", link.title);
      }
    });
    document.querySelector("#sidebar-copyright").textContent =
      `© ${brand.copyrightYear} ${name}`;
    document.querySelector("#footer-copyright").textContent = t(
      "footerCopyright",
      {
        year: brand.copyrightYear,
        name,
        city: last?.city || "",
        country: last?.countryName || "",
      },
    );
    // Profile education is display copy and must not depend on Journey records or IDs.
    document.querySelector("#education-summary").textContent = [
      profile.eduCode,
      profile.program,
    ]
      .filter(Boolean)
      .join(" · ");
    document.querySelector("#map-next-chapter").textContent = last
      ? t("nextChapter", { city: last.city.toUpperCase() })
      : "";
    document.querySelector("#map-hint").textContent =
      first && last
        ? t("mapHint", { first: first.city, last: last.city })
        : t("emptyJourney");
    const coordinate = document.querySelector("#map-coordinate-value"),
      location = last;
    coordinate.textContent = location
      ? [location.latitude, location.longitude]
          .map(
            (value, i) =>
              `${Math.abs(value).toFixed(4)}° ${i === 0 ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W"}`,
          )
          .join("   ")
      : "";
  }
  return { refresh, fullName };
});
