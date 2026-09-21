/** Pure card templates plus a page renderer; all content strings are escaped at the HTML boundary. */
Portfolio.register(
  "content",
  ["data", "skills", "carousel", "paging", "collectionDisclosure"],
  ({ data, skills, carousel, paging, collectionDisclosure }) => {
    const t = Portfolio.t,
      e = Portfolio.escape;
    /** Render a career card with a stable identity shared by Journey and Experience. */
    function experience(entry) {
      return `<article class="experience-row" data-experience-id="${e(entry.id)}" data-category="${e(entry.type)}"><div class="experience-date">${e(CareerDates.labels(entry).date)}<span>${e(entry.countryName)}</span></div><div class="experience-card"><div class="experience-title"><div><h3>${CategoryIcon(entry.type)}<span>${e(entry.organizationName)}</span></h3><div class="company">${e(entry.organizationTitle)}</div></div><span class="location">${e(entry.city)}</span></div><p>${e(entry.content)}</p>${entry.detail ? `<p class="experience-ta">${e(entry.detail.content)} · ${e(CareerDates.labels(entry.detail).date)}</p>` : ""}${skills.tags(entry.skills, "experience-" + entry.id)}</div></article>`;
    }
    /** Empty detail objects do not create blank dialogs; strings remain plain text. */
    function hasProjectDetail(project) {
      const detail = project.detail;
      return (
        !!detail &&
        typeof detail === "object" &&
        ([
          "workflowDescription",
          "technicalDescription",
          "contribution",
          "outcome",
        ].some((key) => detail[key]?.trim()) ||
          detail.flow?.length > 0)
      );
    }
    /** Render a full project record without aliases for approved API fields. */
    function projectCard(project) {
      return `<article class="project-card" data-project-id="${e(project.id)}"><div class="project-top"><div class="project-heading"><div class="project-organization-name">${e(project.organizationName)}</div><div class="project-period">${e(CareerDates.projectPeriod(project))}</div></div>${hasProjectDetail(project) ? `<button class="project-open" data-project="${e(project.id)}" aria-label="${e(t("readProject", project))}">${Icons.svg("arrow-up-right")}</button>` : ""}</div><div class="project-title">${e(project.projectTitle)}</div><h3>${e(project.projectName)}</h3><p class="plain-text">${e(project.intro)}</p>${skills.tags(project.skills, "project-" + project.id)}</article>`;
    }
    /** Group consecutive equal months only, preserving authoritative server array order. */
    function projectGroups(records) {
      const groups = [];
      for (const record of records) {
        if (groups.at(-1)?.start !== record.startMonth)
          groups.push({ start: record.startMonth, members: [] });
        groups.at(-1).members.push(record);
      }
      return groups
        .map(
          ({ start, members }) =>
            `<div class="project-time-row"><div class="project-start"><time datetime="${e(start)}">${e(CareerDates.monthLabel(start))}</time><span>${e(t("projectStart"))}</span></div><div class="project-group-cards">${members.map(projectCard).join("")}</div></div>`,
        )
        .join("");
    }
    /** Hide absent detail sections and retain ordinary user-entered line breaks safely. */
    function projectDetail(project) {
      const detail = project.detail;
      /** Render one nonempty detail field using its matching localized UI heading. */
      const section = (key) =>
        detail[key]?.trim()
          ? `<section class="project-detail-section" data-detail-field="${key}"><h3>${e(t(key))}</h3><p class="plain-text">${e(detail[key])}</p></section>`
          : "";
      const flow = detail.flow?.length
        ? `<div class="architecture">${detail.flow.map((label) => `<span>${e(label)}</span>`).join('<i aria-hidden="true">' + Icons.svg("arrow-right") + "</i>")}</div>`
        : "";
      return `<span class="eyebrow">${e(project.projectTitle)}</span><h2 id="dialog-title">${e(project.projectName)}</h2><div class="project-organization-name">${e(project.organizationName)}</div><div class="project-organization-title">${e(project.organizationTitle)}</div><div class="project-period">${e(CareerDates.projectPeriod(project))}</div>${section("workflowDescription")}${flow}${section("technicalDescription")}${section("contribution")}${section("outcome")}${skills.tags(project.skills, "dialog-" + project.id)}`;
    }
    /** Render destination choices and derived labels from exactly the same ordered records. */
    function journeyStops(items) {
      const endpoints = document.querySelector("#journey-endpoints");
      endpoints.textContent = (
        items.length > 1 ? [items[0], items.at(-1)] : items
      )
        .map((stop) => stop.city)
        .join(" → ");
      endpoints.hidden = !items.length;
      document.querySelector("#journey-summary").textContent = t(
        items.length === 1 ? "journeySummaryOne" : "journeySummary",
        { count: items.length },
      );
      document.querySelector("#stops").innerHTML = items
        .map(
          (stop, i) =>
            `<button class="stop ${i === 0 ? "active" : ""}" data-stop="${e(stop.id)}" aria-label="${e(t("exploreCity", stop))}" aria-pressed="${i === 0}"><span class="stop-year">${e(CareerDates.labels(stop).year)}</span><strong>${e(stop.city)}</strong><span class="stop-organization-code">${e(stop.organizationCode)}</span></button>`,
        )
        .join("");
      carousel.refresh();
    }
    /** Refresh the data-driven page while preserving collection disclosure state. */
    function refresh() {
      const projects = data.projects,
        categories = data.snapshot.skillCategories;
      const work = CareerDates.workDuration(data.journey);
      document.querySelector("#work-tenure").textContent = t("tenure", {
        ...work,
        yearUnit: t(work.years === 1 ? "year" : "years"),
        monthUnit: t(work.months === 1 ? "month" : "months"),
      });
      document.querySelector("#work-tenure").title = t("tenureHint");
      journeyStops(data.journey);
      const experiencePage = data.page("experiences");
      const experiencePreview = PORTFOLIO_RUNTIME.pagination.experiences;
      const loadedExperiences = data.experiences;
      document.querySelector("#timeline").innerHTML =
        loadedExperiences.slice(0, experiencePreview).map(experience).join("") +
        collectionDisclosure.render({
          id: "more-experiences",
          collection: "experiences",
          previewCount: experiencePreview,
          total: experiencePage.total,
          title: t("moreExperiences"),
          collapseTitle: t("lessExperiences"),
          contentId: "extra-experiences",
          content: loadedExperiences
            .slice(experiencePreview)
            .map(experience)
            .join(""),
        });
      // The complete Journey dates keep this range independent of Experience pagination.
      const years = data.journey
        .flatMap((row) => [
          row.startMonth.slice(0, 4),
          row.endMonth?.slice(0, 4) || String(new Date().getFullYear()),
        ])
        .sort();
      document.querySelector("#experience-range").textContent = years.length
        ? `${years[0]} — ${years.at(-1)}`
        : "";
      const projectPage = data.page("projects"),
        projectPreview = PORTFOLIO_RUNTIME.pagination.projects;
      document.querySelector("#project-grid").innerHTML =
        projectGroups(projects.slice(0, projectPreview)) +
        collectionDisclosure.render({
          id: "more-projects",
          collection: "projects",
          previewCount: projectPreview,
          total: projectPage.total,
          title: t("moreProjects"),
          collapseTitle: t("lessProjects"),
          contentId: "extra-projects",
          content: projectGroups(projects.slice(projectPreview)),
        });
      document.querySelector("#toolkit").innerHTML =
        categories
          .map(
            (category) =>
              `<div class="toolkit-row"><h3>${e(I18n.t(category.labelKey))}</h3>${skills.tags(category.skillIds, "category-" + category.id)}</div>`,
          )
          .join("") + paging.control("categories");
      skills.refresh();
    }
    return { refresh, projectDetail, hasProjectDetail, journeyStops };
  },
);
