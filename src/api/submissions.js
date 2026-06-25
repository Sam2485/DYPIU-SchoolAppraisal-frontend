import apiClient from "./client";

const safeJsonParse = (value, fallback) => {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const normalizeRole = (role = "") => String(role).trim().toLowerCase().replaceAll("_", "-");

export const SIGN_OFF_FIELD = "__auditSignOff";

export const signOffProfileFromSession = (fallbackRole = "") => ({
  name: sessionStorage.getItem("name") || "",
  designation: sessionStorage.getItem("designation") || "",
  role: normalizeRole(sessionStorage.getItem("role") || fallbackRole),
});

export const withSubmitterSignOff = (values = {}, profile = signOffProfileFromSession(), submittedAt = new Date().toISOString()) => ({
  ...values,
  [SIGN_OFF_FIELD]: {
    ...(values[SIGN_OFF_FIELD] || {}),
    submittedBy: {
      ...(values[SIGN_OFF_FIELD]?.submittedBy || {}),
      name: profile.name,
      designation: profile.designation,
      role: profile.role,
      date: submittedAt,
    },
  },
});

export const withApproverSignOff = (values = {}, profile = signOffProfileFromSession(), approvedAt = new Date().toISOString()) => ({
  ...values,
  [SIGN_OFF_FIELD]: {
    ...(values[SIGN_OFF_FIELD] || {}),
    approvedBy: {
      name: profile.name,
      designation: profile.designation,
      role: profile.role,
      date: approvedAt,
    },
  },
});

export const getSubmissionSignOff = (submission = {}, values = {}) => {
  const stored = values[SIGN_OFF_FIELD] || {};
  const approvedRole = normalizeRole(
    stored.approvedBy?.role ||
    submission.reviewedByRole ||
    submission.reviewerRole ||
    submission.approvedByRole ||
    "",
  );

  return {
    submittedBy: {
      name: stored.submittedBy?.name || submission.submittedByName || submission.submittedBy || submission.createdBy || submission.user?.name || "",
      designation: stored.submittedBy?.designation || submission.submittedByDesignation || submission.submitterDesignation || submission.user?.designation || "",
      role: normalizeRole(stored.submittedBy?.role || submission.submittedByRole || submission.user?.role || ""),
      date: stored.submittedBy?.date || submission.submittedOn || submission.submittedAt || submission.createdAt || "",
    },
    approvedBy: {
      name: stored.approvedBy?.name || submission.reviewedByName || submission.reviewedBy || submission.approvedBy || "",
      designation: stored.approvedBy?.designation || submission.reviewedByDesignation || submission.reviewerDesignation || submission.approvedByDesignation || "",
      role: approvedRole,
      date: stored.approvedBy?.date || submission.reviewedOn || submission.reviewedAt || submission.approvedOn || submission.approvedAt || "",
    },
  };
};

export const dashboardForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  const dashboards = {
    director: "/director/dashboard",
    administrative: "/administrative/dashboard",
    "vice-chancellor": "/vice-chancellor/dashboard",
    iqac: "/iqac/dashboard",
  };

  return dashboards[normalizedRole] || "/login";
};

export const normalizeUserProfile = (payload = {}) => {
  const user = payload.user || payload.profile || payload.data?.user || payload.data || payload;
  const token = payload.token || payload.jwt || payload.accessToken || payload.data?.token || payload.data?.jwt || "";

  return {
    token,
    email: user.email || user.username || payload.email || payload.username || "",
    name: user.name || user.fullName || payload.name || "",
    designation: user.designation || payload.designation || "",
    school: user.school || user.schoolName || payload.school || "",
    role: normalizeRole(user.role || payload.role || ""),
  };
};

export const normalizeDraft = (payload = {}, fallbackValues = {}, fallbackTables = {}) => {
  const draft = payload.data || payload.submission || payload;
  const valuesData = draft.valuesData ?? draft.values ?? draft.fieldsData ?? draft.fields;
  const tablesData = draft.tablesData ?? draft.tables;
  const values = {
    ...fallbackValues,
    ...safeJsonParse(valuesData, {}),
  };
  const status = String(draft.status || "").trim().toLowerCase().replaceAll("_", "-");

  return {
    id: draft.id || draft.submissionId || null,
    exists: Boolean(
      draft.id ||
      draft.submissionId ||
      valuesData ||
      tablesData ||
      draft.attachments ||
      draft.status,
    ),
    status,
    isSubmitted: Boolean(values[SIGN_OFF_FIELD]?.submittedBy?.date) || Boolean(status && status !== "draft"),
    values,
    tables: {
      ...fallbackTables,
      ...safeJsonParse(tablesData, {}),
    },
    attachments: safeJsonParse(draft.attachments, []),
  };
};

export const extractAttachments = (tables) => {
  const attachments = [];

  Object.entries(tables || {}).forEach(([tableId, rows]) => {
    (rows || []).forEach((row, rowIndex) => {
      Object.entries(row || {}).forEach(([column, value]) => {
        if (value && typeof value === "object" && (value.url || value.publicUrl || value.fileName || value.name)) {
          attachments.push({
            tableId,
            rowIndex,
            column,
            fileName: value.fileName || value.filename || value.name || "",
            name: value.name || value.fileName || value.filename || "",
            url: value.url || value.publicUrl || value.downloadUrl || "",
          });
        }
      });
    });
  });

  return attachments;
};

export const buildSubmissionPayload = ({ auditType, values, tables, attachments }) => ({
  auditType,
  valuesData: JSON.stringify(values || {}),
  tablesData: JSON.stringify(tables || {}),
  attachments: JSON.stringify(attachments || extractAttachments(tables)),
});

export const fetchMyDraft = (auditType) =>
  apiClient.get("/api/submissions/my-draft", { params: { auditType } });

export const saveDraft = (payload, { isUpdate = false } = {}) =>
  apiClient.request({
    method: isUpdate ? "put" : "post",
    url: "/api/submissions/save-draft",
    data: payload,
  });

export const submitDraft = (payload, { isUpdate = false } = {}) =>
  apiClient.request({
    method: isUpdate ? "put" : "post",
    url: "/api/submissions/submit",
    data: payload,
  });

export const updateSubmissionById = (id, payload) =>
  apiClient.put(`/api/submissions/${id}`, payload);

export const updateTableData = (tableName, submissionId, rows) =>
  apiClient.put(
    `/api/tables/${encodeURIComponent(tableName)}/submission/${encodeURIComponent(submissionId)}`,
    rows,
  );

export const uploadAttachment = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post("/api/attachments/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const uploaded = data.data || data;
  return {
    name: uploaded.name || uploaded.fileName || uploaded.filename || file.name,
    fileName: uploaded.fileName || uploaded.filename || uploaded.name || file.name,
    url: uploaded.url || uploaded.publicUrl || uploaded.downloadUrl || "",
  };
};

export const fetchAllSubmissions = () => apiClient.get("/api/submissions/all");
export const fetchSubmissionById = (id) => apiClient.get(`/api/submissions/${id}`);
export const fetchSubmissionSnapshots = (id) => apiClient.get(`/api/submissions/${id}/snapshots`);
export const reviewSubmission = (id, payload) => apiClient.post(`/api/submissions/${id}/review`, payload);

export const parseSubmissionFormData = (submission = {}) => ({
  values: safeJsonParse(submission.valuesData ?? submission.values ?? submission.fieldsData ?? submission.fields, {}),
  tables: safeJsonParse(submission.tablesData ?? submission.tables, {}),
  attachments: safeJsonParse(submission.attachments, []),
  hasSavedData: Boolean(submission.valuesData || submission.values || submission.fieldsData || submission.fields || submission.tablesData || submission.tables),
});
