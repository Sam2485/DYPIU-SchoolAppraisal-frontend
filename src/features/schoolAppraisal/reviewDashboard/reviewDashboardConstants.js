export const REVIEW_NAV_ITEMS = [
  { id: "overview", title: "Overview" },
  { id: "advanced-overview", title: "Advanced Overview" },
  { id: "academic", title: "Academic Audit" },
  { id: "administrative", title: "Administrative Audit" },
];

export const AUDITOR_FINAL_REVIEW_NAV_ITEM = {
  id: "auditor-final-review",
  title: "Auditor Final Review",
  caption: "Completed auditor forms",
  group: "final-verification",
  groupLabel: "Final Verification",
};

export const PREVIOUS_REPORTS_NAV_ITEM = {
  id: "previous-reports",
  title: "Reports",
  group: "final-verification",
  groupLabel: "Final Verification",
};

export const USER_MANAGEMENT_NAV_ITEM = { id: "user-management", title: "User Management" };

export const REPORT_ARCHIVE_FIELD = "__reportArchive";
export const ADMIN_SUBMISSION_STATUS_FIELD = "__administrativeSubmissionStatus";
export const AUDITOR_ASSIGNMENT_STATUS_FIELD = "__auditorAssignmentStatus";

export const START_NEXT_YEAR_NAV_ITEM = {
  id: "start-next-academic-year",
  title: "Start Next Academic Year",
  caption: "Create blank yearly forms",
  group: "audit-cycle",
  groupLabel: "Audit Cycle",
};

export const BACKUP_RESTORE_NAV_ITEM = {
  id: "backup-restore",
  title: "Backup & Restore",
  caption: "Database & Uploads backup",
  group: "system-admin",
  groupLabel: "System Administration",
};

export const REVIEW_ROUTE_VIEW_IDS = new Set([
  ...REVIEW_NAV_ITEMS.map((item) => item.id),
  AUDITOR_FINAL_REVIEW_NAV_ITEM.id,
  PREVIOUS_REPORTS_NAV_ITEM.id,
  USER_MANAGEMENT_NAV_ITEM.id,
  BACKUP_RESTORE_NAV_ITEM.id,
]);

export const REVIEW_ROLE_CONFIG = {
  "vice-chancellor": {
    badge: "VC",
    title: "Vice Chancellor Dashboard",
    roleTitle: "Vice Chancellor",
    roleText: "School Appraisal Review",
  },
  iqac: {
    badge: "IQ",
    title: "IQAC Dashboard",
    roleTitle: "IQAC",
    roleText: "School Appraisal Review",
  },
  auditor: {
    badge: "AU",
    title: "Auditor Dashboard",
    roleTitle: "Auditor",
    roleText: "Assigned Audit Remarks",
  },
};

export const SCHOOL_GROUPS = {
  engineering: "Engineering",
  nonEngineering: "Non-Engineering",
  all: "All Schools",
};

export const statusLabels = {
  submitted: "Submitted",
  "under-review": "Under Review",
  "auditor-completed": "Auditor Completed",
  "external_auditor_completed": "Auditor Completed",
  "external-auditor-completed": "Auditor Completed",
  approved: "Approved",
};

export const statusStyles = {
  submitted: { color: "#1d4ed8", background: "#dbeafe", border: "#bfdbfe" },
  "under-review": { color: "#92400e", background: "#fef3c7", border: "#fde68a" },
  "auditor-completed": { color: "#0f766e", background: "#ccfbf1", border: "#99f6e4" },
  "external_auditor_completed": { color: "#0f766e", background: "#ccfbf1", border: "#99f6e4" },
  "external-auditor-completed": { color: "#0f766e", background: "#ccfbf1", border: "#99f6e4" },
  approved: { color: "#166534", background: "#dcfce7", border: "#bbf7d0" },
};

export const auditLabels = {
  academic: "Academic Audit",
  administrative: "Administrative Audit",
};

export const groupTabs = [
  { id: "all", label: "All Schools" },
  { id: "engineering", label: "Engineering" },
  { id: "nonEngineering", label: "Non-Engineering" },
];

export const routeViewFor = (value, fallback) => {
  const normalized = String(value || "").trim();
  return REVIEW_ROUTE_VIEW_IDS.has(normalized) ? normalized : fallback;
};
