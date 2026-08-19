export const titleCase = (value = "") =>
  String(value).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export const normalizeAcademicYear = (value = "2025-2026") => {
  const match = String(value).match(/(\d{4})\D+(\d{2,4})/);
  if (!match) return "2025-2026";

  const startYear = Number(match[1]);
  const endYear = match[2].length === 2
    ? Number(`${String(startYear).slice(0, 2)}${match[2]}`)
    : Number(match[2]);

  return `${startYear}-${endYear}`;
};

export const nextAcademicYearFor = (value) => {
  const [startYear, endYear] = normalizeAcademicYear(value).split("-").map(Number);
  return `${startYear + 1}-${endYear + 1}`;
};

export const compactAcademicYear = (value) => {
  const [startYear, endYear] = normalizeAcademicYear(value).split("-");
  return `${startYear}-${endYear.slice(-2)}`;
};

export const academicYearPeriod = (value) => {
  const [startYear, endYear] = normalizeAcademicYear(value).split("-");
  return `July, ${startYear} - June, ${endYear}`;
};

export const academicYearOptionLabel = (year, activeYear) =>
  compactAcademicYear(year) === compactAcademicYear(activeYear) ? `${year} (active)` : year;

export const buildMetrics = (submissions) =>
  submissions.reduce(
    (metrics, submission) => {
      metrics.total += 1;
      if (metrics[submission.status] != null) metrics[submission.status] += 1;
      if (metrics[submission.auditType] != null) metrics[submission.auditType] += 1;
      return metrics;
    },
    { total: 0, submitted: 0, "under-review": 0, "auditor-completed": 0, approved: 0, academic: 0, administrative: 0 },
  );
