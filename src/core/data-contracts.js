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
      if (row.expected !== undefined && typeof row.expected !== "boolean")
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
      if (row.detail === null || row.detail === "") continue;
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
  /** Validate identifiers, references and dates before replacing any visible content. */
  function validate(value) {
    if (value.schemaVersion !== 1)
      throw new Error("Unsupported portfolio schema version");
    const tables = {};
    for (const table of ["skills", "skillCategories"]) {
      if (!Array.isArray(value[table]))
        throw new Error(`Missing collection: ${table}`);
      tables[table] = new Map();
      for (const row of value[table]) {
        if (
          typeof row.id !== "string" ||
          !/^[a-zA-Z0-9-]+$/.test(row.id) ||
          tables[table].has(row.id)
        )
          throw new Error(`Invalid or duplicate ${table} ID: ${row.id}`);
        tables[table].set(row.id, row);
      }
    }
    /** Reject missing relations rather than silently rendering mismatched cards or markers. */
    const reference = (table, id) => {
      if (!tables[table].has(id))
        throw new Error(`Unknown ${table} reference: ${id}`);
    };
    /** Require every content reference to resolve in at least one loaded locale. */
    const textKey = (key) => {
      if (
        !Object.values(PORTFOLIO_LOCALES).some(
          (catalog) => typeof catalog[key] === "string",
        )
      )
        throw new Error(`Unknown text key: ${key}`);
    };
    value.skills.forEach((row) => textKey(row.labelKey));
    value.skillCategories.forEach((row) => {
      textKey(row.labelKey);
      if (!Array.isArray(row.skillIds))
        throw new Error(`Invalid category: ${row.id}`);
      row.skillIds.forEach((id) => reference("skills", id));
    });
    return value;
  }
  return Object.freeze({
    validateJourney,
    validateExperiences,
    validateProjects,
    validateSite,
    validate,
  });
});
