export const SCHOOL_OPTIONS = [
  { name: "School of Computer Science & Applications", code: "SoCSEA" },
  { name: "School of Bio-Engineering & Bio Science", code: "SoBB" },
  { name: "School of Continual Education", code: "SoCE" },
  { name: "School of Engineering, Management & Research", code: "SoEMR" },
  { name: "School of Commerce & Management", code: "SoCM" },
  { name: "School of Media & Communication Studies", code: "SoMCS" },
  { name: "School of Design", code: "SoD" },
  { name: "School of Applied Arts", code: "SoAA" },
];

const normalizeSchoolValue = (value = "") =>
  String(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export const canonicalSchoolCode = (value = "") => {
  const normalized = normalizeSchoolValue(value);
  const school = SCHOOL_OPTIONS.find((option) =>
    normalizeSchoolValue(option.code) === normalized ||
    normalizeSchoolValue(option.name) === normalized
  );

  return school?.code.toUpperCase() || "";
};

export const ADMINISTRATIVE_POSTS = [
  { value: "registrar", label: "Registrar" },
  { value: "hr", label: "HR" },
  { value: "dean-student-welfare", label: "Dean Student Welfare" },
  { value: "dean-placement", label: "Dean Placement" },
];
