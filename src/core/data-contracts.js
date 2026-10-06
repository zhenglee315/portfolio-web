/** Validate API fields and collection relationships without mutating data or rendering UI. */
Portfolio.register("dataContracts", [], () => {
  /** Validate direct Journey fields without resolving organization, place or translation tables. */
  function validateJourney(rows) {
    if (!Array.isArray(rows)) throw new Error("Journey must be an array");
    const ids = new Set();
    for (const row of rows) {
      if (
        !row ||
        !Number.isSafeInteger(row.id) ||
        row.id < 1 ||
        ids.has(row.id)
      )
        throw new Error("Invalid or duplicate Journey ID");
      ids.add(row.id);
      for (const key of [
        "countryCode",
        "countryName",
        "city",
        "organizationName",
        "organizationCode",
        "organizationTitle",
      ])
        if (typeof row[key] !== "string")
          throw new Error("Invalid Journey field: " + key);
      if (!/^[A-Z]{3}$/.test(row.countryCode))
        throw new Error("Invalid countryCode");
      if (
        !["work", "education"].includes(row.type) ||
        typeof row.expected !== "boolean"
      )
        throw new Error("Invalid Journey classification");
      if (
        !Number.isFinite(row.latitude) ||
        Math.abs(row.latitude) > 90 ||
        !Number.isFinite(row.longitude) ||
        Math.abs(row.longitude) > 180
      )
        throw new Error("Invalid Journey coordinates");
      CareerDates.validatePeriod(row);
      if (row.detail != null) {
        if (typeof row.detail.content !== "string")
          throw new Error("Invalid Journey detail content");
        CareerDates.validatePeriod(row.detail);
      }
    }
    return rows;
  }
  /** Validate direct Experience cards without entity or translation-key lookup tables. */
  function validateExperiences(rows) {
    if (!Array.isArray(rows)) throw new Error("Experiences must be an array");
    const ids = new Set();
    for (const row of rows) {
      if (
        !row ||
        !Number.isSafeInteger(row.id) ||
        row.id < 1 ||
        ids.has(row.id)
      )
        throw new Error("Invalid or duplicate Experience ID");
      ids.add(row.id);
      for (const key of [
        "countryCode",
        "countryName",
        "city",
        "organizationCode",
        "organizationName",
        "organizationTitle",
        "content",
      ])
        if (typeof row[key] !== "string")
          throw new Error("Invalid Experience field: " + key);
      if (
        !/^[A-Z]{3}$/.test(row.countryCode) ||
        !Number.isFinite(row.order) ||
        !["work", "education"].includes(row.type) ||
        (row.expected !== undefined && typeof row.expected !== "boolean")
      )
        throw new Error("Invalid Experience classification/order");
      CareerDates.validatePeriod(row);
      if (
        !Array.isArray(row.skills) ||
        row.skills.some((skill) => typeof skill !== "string" || !skill.trim())
      )
        throw new Error("Invalid Experience skills");
      if (row.detail != null) {
        if (
          typeof row.detail !== "object" ||
          Array.isArray(row.detail) ||
          typeof row.detail.content !== "string"
        )
          throw new Error("Invalid Experience detail");
        CareerDates.validatePeriod(row.detail);
      }
    }
    return rows;
  }
  /** Validate Projects without renaming API fields or resolving legacy translation keys. */
  function validateProjects(rows) {
    if (!Array.isArray(rows)) throw new Error("Projects must be an array");
    const ids = new Set();
    for (const row of rows) {
      if (
        !row ||
        !Number.isSafeInteger(row.id) ||
        row.id < 1 ||
        ids.has(row.id)
      )
        throw new Error("Invalid or duplicate Project ID");
      ids.add(row.id);
      for (const key of [
        "organizationName",
        "organizationCode",
        "organizationTitle",
        "projectName",
        "projectTitle",
        "intro",
      ])
        if (typeof row[key] !== "string")
          throw new Error("Invalid Project field: " + key);
      CareerDates.validatePeriod(row);
      if (typeof row.expected !== "boolean")
        throw new Error("Invalid Project expected");
      if (row.expected && row.endMonth === null)
        throw new Error("Expected project requires endMonth");
      if (
        row.skills !== null &&
        (!Array.isArray(row.skills) ||
          row.skills.some(
            (value) => typeof value !== "string" || !value.trim(),
          ))
      )
        throw new Error("Invalid Project skills");
      if (row.detail === null) continue;
      if (
        !row.detail ||
        typeof row.detail !== "object" ||
        Array.isArray(row.detail)
      )
        throw new Error("Invalid Project detail");
      for (const field of [
        "workflowDescription",
        "technicalDescription",
        "contribution",
        "outcome",
      ])
        if (row.detail[field] !== null && typeof row.detail[field] !== "string")
          throw new Error("Invalid Project detail: " + field);
      if (
        row.detail.flow !== null &&
        (!Array.isArray(row.detail.flow) ||
          row.detail.flow.some(
            (value) => typeof value !== "string" || !value.trim(),
          ))
      )
        throw new Error("Invalid Project flow");
    }
    return rows;
  }
  /**
   * Validate required fields and safe link/asset formats before committing site content.
   * Empty social values are supported. Additional keys are not rejected or auto-rendered.
   * This check does not resolve assets on disk or define the backend database schema.
   */
  function validateSite(site) {
    const fields = {
      brand: ["title", "titleSub"],
      profile: [
        "firstName",
        "familyName",
        "nickName",
        "content",
        "eduCode",
        "program",
        "introContent",
        "footerContent",
      ],
      social: ["linkedin", "github", "medium", "email"],
      chatme: ["title", "titleSub", "content", "icon"],
    };
    for (const [group, keys] of Object.entries(fields))
      for (const key of keys)
        if (typeof site?.[group]?.[key] !== "string")
          throw new Error(`Invalid site field: ${group}.${key}`);
    if (!Number.isInteger(site.brand.copyrightYear))
      throw new Error("Invalid site field: brand.copyrightYear");
    for (const key of ["linkedin", "github", "medium"])
      if (site.social[key] && !/^https?:\/\/[^\s]+$/i.test(site.social[key]))
        throw new Error(`Invalid site URL: social.${key}`);
    if (site.social.email && !/^[^\s@<>:]+@[^\s@<>]+$/.test(site.social.email))
      throw new Error("Invalid site email");
    if (
      !/^assets\/[a-zA-Z0-9_./-]+$/.test(site.chatme.icon) ||
      site.chatme.icon.split("/").includes("..")
    )
      throw new Error("Invalid site asset: chatme.icon");
    return site;
  }
  /** Select numbered metadata without copying item arrays into normalized state. */
  function pageMetadata(response) {
    const { total, pages, page, size } = response;
    return { total, pages, page, size };
  }
  /** Validate numbered metadata shared by responses and normalized collection state. */
  function validatePageMetadata(value) {
    if (
      !value ||
      !Number.isSafeInteger(value.total) ||
      value.total < 0 ||
      !Number.isSafeInteger(value.page) ||
      value.page < 1 ||
      value.size !== 6 ||
      !Number.isSafeInteger(value.pages) ||
      value.pages !== Math.ceil(value.total / value.size)
    )
      throw new Error("Invalid numbered pagination metadata");
    return value;
  }
  /** Require exactly one complete numbered response, including empty and beyond-end pages. */
  function validatePage(response) {
    validatePageMetadata(response);
    if (
      Object.keys(response).sort().join(",") !==
        "items,page,pages,size,total" ||
      !Array.isArray(response.items) ||
      response.items.length !==
        Math.min(
          response.size,
          Math.max(0, response.total - (response.page - 1) * response.size),
        )
    )
      throw new Error("Invalid numbered pagination response");
    return response;
  }
  /** Validate identifiers and category-to-skill references before publishing content. */
  function validate(value) {
    if (!value || value.schemaVersion !== 1)
      throw new Error("Unsupported portfolio schema version");
    const tables = {};
    for (const table of ["skills", "skillCategories"]) {
      if (!Array.isArray(value[table]))
        throw new Error(`Missing collection: ${table}`);
      tables[table] = new Map();
      for (const row of value[table]) {
        if (
          !row ||
          typeof row.id !== "string" ||
          !/^[a-zA-Z0-9-]+$/.test(row.id) ||
          tables[table].has(row.id)
        )
          throw new Error(`Invalid or duplicate ${table} ID: ${row?.id}`);
        if (typeof row.label !== "string" || !row.label.trim())
          throw new Error(`Invalid ${table} label: ${row.id}`);
        tables[table].set(row.id, row);
      }
    }
    /** Reject missing relations rather than silently rendering mismatched cards or markers. */
    const reference = (table, id) => {
      if (!tables[table].has(id))
        throw new Error(`Unknown ${table} reference: ${id}`);
    };
    value.skillCategories.forEach((row) => {
      if (!Array.isArray(row.skillIds))
        throw new Error(`Invalid category: ${row.id}`);
      const seen = new Set();
      row.skillIds.forEach((id) => {
        if (seen.has(id)) throw new Error(`Duplicate category skill: ${id}`);
        seen.add(id);
        reference("skills", id);
      });
      if (row.skillsPage !== undefined) {
        validatePageMetadata(row.skillsPage);
        if (row.skillsPage.total < row.skillIds.length)
          throw new Error(`Invalid category skill total: ${row.id}`);
      }
    });
    return value;
  }
  /** Normalize nested category previews while storing each localized skill label once. */
  function categorySnapshot(response) {
    const skills = new Map();
    const skillCategories = response.items.map((row) => {
      for (const skill of row.skills.items) {
        if (skills.has(skill.id) && skills.get(skill.id).label !== skill.label)
          throw new Error("Conflicting category skill label: " + skill.id);
        skills.set(skill.id, skill);
      }
      return {
        id: row.id,
        label: row.label,
        skillIds: row.skills.items.map((skill) => skill.id),
        skillsPage: pageMetadata(row.skills),
      };
    });
    return { schemaVersion: 1, skills: [...skills.values()], skillCategories };
  }
  /** Validate a numbered category page and each directly embedded first skill page. */
  function validateCategoriesPage(response) {
    validatePage(response);
    for (const row of response.items) {
      if (
        !row ||
        typeof row.id !== "string" ||
        typeof row.label !== "string" ||
        !row.label.trim()
      )
        throw new Error("Invalid category item");
      validateSkillsPage(row.skills);
      if (row.skills.page !== 1)
        throw new Error("Invalid category preview page");
    }
    validate(categorySnapshot(response));
    return response;
  }
  /** Validate one category-owned numbered page of localized skills. */
  function validateSkillsPage(response) {
    validatePage(response);
    validate({ schemaVersion: 1, skills: response.items, skillCategories: [] });
    return response;
  }
  return Object.freeze({
    pageMetadata,
    validatePage,
    categorySnapshot,
    validateJourney,
    validateExperiences,
    validateProjects,
    validateSite,
    validate,
    validateCategoriesPage,
    validateSkillsPage,
  });
});
