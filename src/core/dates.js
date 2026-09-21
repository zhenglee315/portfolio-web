/** Pure date policies shared by every feature and data validation. */
window.CareerDates = (() => {
  // Month-level dates use inclusive endpoints; overlapping work months count once.
  /** Validate a YYYY-MM value and convert it to a comparable month index. */
  function careerMonthIndex(value) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
    if (!match) throw new Error(`Invalid career month: ${value}`);
    return Number(match[1]) * 12 + Number(match[2]) - 1;
  }

  /** Format a month with the active display locale in UTC. */
  function careerMonthLabel(value) {
    const index = careerMonthIndex(value);
    return new Intl.DateTimeFormat(
      window.I18n?.locale === "en" || !window.I18n
        ? "en-US"
        : window.I18n.locale,
      { month: "short", year: "numeric", timeZone: "UTC" },
    ).format(new Date(Date.UTC(Math.floor(index / 12), index % 12, 1)));
  }

  // Shared month arithmetic, independent of display language and day lengths.
  /** Count inclusive calendar months; reject reversed ranges. */
  function monthDuration(startMonth, endMonth) {
    const count = careerMonthIndex(endMonth) - careerMonthIndex(startMonth) + 1;
    if (count < 1) throw new Error("End month precedes start month");
    return count;
  }

  /** Validate nullable end months and optional real calendar days before rendering dates. */
  function validatePeriod(entry) {
    careerMonthIndex(entry.startMonth);
    if (entry.endMonth !== null)
      monthDuration(entry.startMonth, entry.endMonth);
    if (entry.endDay !== undefined) {
      if (!entry.endMonth || !Number.isInteger(entry.endDay))
        throw new Error("endDay requires an endMonth and an integer day");
      const [year, month] = entry.endMonth.split("-").map(Number);
      if (
        entry.endDay < 1 ||
        entry.endDay > new Date(Date.UTC(year, month, 0)).getUTCDate()
      )
        throw new Error("Invalid calendar endDay");
    }
  }

  /** Use one localized period format in cards and detail dialogs. */
  function projectPeriodLabel(entry) {
    const period = careerDateLabels(entry).date;
    if (entry.endMonth === null) return period;
    const count = monthDuration(entry.startMonth, entry.endMonth);
    return (
      period +
      " " +
      I18n.t("ui.projectDuration", {
        count,
        unit: I18n.t(count === 1 ? "ui.month" : "ui.months"),
      })
    );
  }

  /** Format career dates, including expected completion and exact end days. */
  function careerDateLabels(entry) {
    const start = careerMonthLabel(entry.startMonth);
    const chinese = window.I18n && I18n.locale !== "en";
    const end = entry.endMonth
      ? careerMonthLabel(entry.endMonth)
      : window.I18n?.t("ui.present") || "Present";
    const suffix = entry.expected
      ? window.I18n?.t("ui.expected") || " (expected)"
      : "";
    const datedEnd = entry.endDay
      ? chinese
        ? `${end}${entry.endDay}日`
        : `${entry.endDay} ${end}`
      : end;
    const date = `${start} — ${datedEnd}${suffix}`;
    const startYear = entry.startMonth.slice(0, 4),
      endYear = entry.endMonth?.slice(0, 4);
    const year =
      endYear === startYear
        ? `${chinese ? start : start.split(" ")[0]}–${end}`
        : `${startYear}–${endYear || window.I18n?.t("ui.present") || "Present"}`;
    return { date, year };
  }

  /** Count the union of work months, excluding education and employment gaps. */
  function workExperienceDuration(entries, now = new Date()) {
    const workedMonths = new Set();
    for (const entry of entries) {
      if (entry.type !== "work") continue;
      const start = careerMonthIndex(entry.startMonth);
      const end = entry.endMonth
        ? careerMonthIndex(entry.endMonth)
        : now.getFullYear() * 12 + now.getMonth();
      if (end < start) throw new Error("Career end month precedes start month");
      for (let month = start; month <= end; month++) workedMonths.add(month);
    }
    const totalMonths = workedMonths.size;
    return {
      totalMonths,
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  }

  return Object.freeze({
    monthIndex: careerMonthIndex,
    monthLabel: careerMonthLabel,
    monthDuration,
    validatePeriod,
    projectPeriod: projectPeriodLabel,
    labels: careerDateLabels,
    workDuration: workExperienceDuration,
  });
})();
