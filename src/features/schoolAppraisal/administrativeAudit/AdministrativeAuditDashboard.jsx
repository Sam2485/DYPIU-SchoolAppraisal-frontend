import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../api/client";
import { SIGN_OFF_FIELD, buildSubmissionPayload, deleteAttachment, fetchMyDraft, normalizeDraft, saveDraft, signOffProfileFromSession, submitDraft, uploadAttachments, withSubmitterSignOff, fetchAdministrativeStatus, submitAdministrativePart } from "../../../api/submissions";
import universityLogo from "../../../assets/images/image.png";
import AuditTable from "../components/AuditTable";
import DateInput from "../components/DateInput";
import { InlineSpinner, LoadingState, SkeletonList } from "../components/LoadingState";
import { columnsWithSerial, serialColumnFor } from "../components/tableHelpers";
import AdministrativeReportPanel from "./AdministrativeReportPanel";
import AdministrativePartE from "./AdministrativePartE";
import AppSidebar from "../components/AppSidebar";
import { administrativeAuditMeta, administrativeAuditModules } from "./administrativeAuditConfig";

const administrativeUserModules = [
  ...administrativeAuditModules.filter((module) => module.id !== "section-f-observations-recommendations"),
  {
    id: "submission-status",
    number: "",
    title: "Submission Status",
    owner: "system",
  }
];

const normalizePost = (value = "") => {
  const normalized = String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (normalized === "hr" || normalized.includes("human resource")) return "hr";
  if (normalized === "dsw" || normalized.includes("student welfare")) return "dean-student-welfare";
  if (normalized.includes("dean placement") || normalized === "placement") return "dean-placement";
  if (normalized.includes("registrar")) return "registrar";
  return normalized.replaceAll(" ", "-");
};

const moduleOwnerPost = (module) => normalizePost(module.owner);

const emptyRowFor = (columns, index) => {
  const row = columnsWithSerial(columns).reduce((value, column) => {
    value[column] = "";
    return value;
  }, {});
  const serialColumn = serialColumnFor(Object.keys(row));
  if (serialColumn) row[serialColumn] = String(index + 1);
  return row;
};

const normalizeRows = (columns, rows) => {
  const serialColumn = serialColumnFor(columnsWithSerial(columns));
  return rows.map((row, index) => ({
    ...emptyRowFor(columns, index),
    ...row,
    ...(serialColumn ? { [serialColumn]: row[serialColumn] || String(index + 1) } : {}),
  }));
};

const collectAttachments = (value, attachments = []) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectAttachments(item, attachments));
    return attachments;
  }
  if (!value || typeof value !== "object") return attachments;
  if (value.url || value.publicUrl || value.downloadUrl) {
    attachments.push(value);
    return attachments;
  }
  Object.values(value).forEach((item) => collectAttachments(item, attachments));
  return attachments;
};

const uniqueAttachments = (values) => [...new Map(
  collectAttachments(values).map((attachment) => [
    attachment.url || attachment.publicUrl || attachment.downloadUrl,
    attachment,
  ])
).values()];

const moduleBlocksFor = (module) =>
  module.blocks || [
    ...(module.fields?.length ? [{ type: "fields", fields: module.fields }] : []),
    ...(module.tables?.length ? [{ type: "tables", tables: module.tables }] : []),
  ];

const moduleFieldsFor = (module) =>
  moduleBlocksFor(module)
    .flatMap((block) => {
      if (block.type === "fields") return block.fields;
      if (block.type === "part-e-schools") return [{ id: block.fieldId, initialValue: [] }];
      return [];
    })
    .filter((field) => field.kind !== "heading");

const moduleTablesFor = (module) =>
  moduleBlocksFor(module).flatMap((block) => (block.type === "tables" ? block.tables : []));

const ensureDefaultTableRows = (tables = {}) => {
  const nextTables = { ...tables };
  administrativeAuditModules.forEach((module) => {
    moduleTablesFor(module).forEach((table) => {
      if (!Array.isArray(nextTables[table.id]) || !nextTables[table.id].length) {
        nextTables[table.id] = [emptyRowFor(table.columns, 0)];
      }
    });
  });
  return nextTables;
};

const buildInitialData = () => {
  const fields = {};
  const tables = {};

  administrativeAuditModules.forEach((module) => {
    moduleFieldsFor(module).forEach((field) => {
      fields[field.id] = field.initialValue ?? "";
    });
    moduleTablesFor(module).forEach((table) => {
      tables[table.id] = [emptyRowFor(table.columns, 0)];
    });
  });

  return { fields, tables, attachments: [], lastSavedAt: "" };
};

const getUserProfile = () => ({
  name: sessionStorage.getItem("name") || "Administrative User",
  designation: sessionStorage.getItem("designation") || "Registrar",
  post: sessionStorage.getItem("post") || "",
  school: sessionStorage.getItem("school") || "Administrative Office",
  email: sessionStorage.getItem("email") || sessionStorage.getItem("username") || "",
});

export default function AdministrativeAuditDashboard() {
  const navigate = useNavigate();
  const academicYear = sessionStorage.getItem("academicYear") || administrativeAuditMeta.academicYear;
  const profile = getUserProfile();
  const userPost = normalizePost(profile.post || profile.designation);
  const firstOwnedModule = administrativeUserModules.find((module) => moduleOwnerPost(module) === userPost);
  const [activeModuleId, setActiveModuleId] = useState(firstOwnedModule?.id || administrativeUserModules[0].id);
  const [reportMode, setReportMode] = useState(false);
  const [printReportAfterRender, setPrintReportAfterRender] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [status, setStatus] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [contributionApproved, setContributionApproved] = useState(false);
  const [data, setData] = useState(buildInitialData);

  const activeModule = useMemo(
    () => administrativeUserModules.find((module) => module.id === activeModuleId) || administrativeUserModules[0],
    [activeModuleId],
  );
  const activeModuleIndex = administrativeUserModules.findIndex((module) => module.id === activeModuleId);
  const isLastModule = activeModuleIndex === administrativeUserModules.length - 1;
  const canEditActiveModule = moduleOwnerPost(activeModule) === userPost;
  const readOnly = isSubmitted || contributionApproved || !canEditActiveModule;

  const handleModuleChange = (moduleId) => {
    setReportMode(false);
    setActiveModuleId(moduleId);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  useEffect(() => {
    let isActive = true;

    const loadDraft = async () => {
      setLoadingDraft(true);
      setStatus("");

      try {
        const initial = buildInitialData();
        const { data: draftResponse } = await fetchMyDraft("administrative");
        const draft = normalizeDraft(draftResponse, initial.fields, initial.tables);

        if (!isActive) return;
        setData({
          fields: draft.values,
          tables: ensureDefaultTableRows(draft.tables),
          attachments: draft.attachments,
          lastSavedAt: new Date().toISOString(),
        });
        setHasExistingSubmission(draft.exists);
        setIsSubmitted(draft.isSubmitted);
        const contributionStatus = String(draft.administrativeProgress?.[userPost] || "").toLowerCase();
        setContributionApproved(["approved", "submitted"].includes(contributionStatus));
      } catch (error) {
        if (isActive) setStatus(getApiErrorMessage(error, "Could not load your draft from the server."));
      } finally {
        if (isActive) setLoadingDraft(false);
      }
    };

    loadDraft();

    return () => {
      isActive = false;
    };
  }, [userPost]);

  useEffect(() => {
    if (!reportMode || !printReportAfterRender) return undefined;

    const timer = window.setTimeout(() => {
      window.print();
      setPrintReportAfterRender(false);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [printReportAfterRender, reportMode]);

  const setFieldValue = (fieldId, value) => {
    setData((current) => ({
      ...current,
      fields: { ...current.fields, [fieldId]: value },
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const setCellValue = (tableId, rowIndex, column, value) => {
    setData((current) => ({
      ...current,
      tables: {
        ...current.tables,
        [tableId]: current.tables[tableId].map((row, index) => (index === rowIndex ? { ...row, [column]: value } : row)),
      },
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const addRow = (table) => {
    setData((current) => ({
      ...current,
      tables: {
        ...current.tables,
        [table.id]: [
          ...(current.tables[table.id] || []),
          emptyRowFor(table.columns, current.tables[table.id]?.length || 0),
        ],
      },
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const deleteLastRow = (table) => {
    setData((current) => {
      const nextRows = (current.tables[table.id] || []).slice(0, -1);
      return {
        ...current,
        tables: {
          ...current.tables,
          [table.id]: normalizeRows(table.columns, nextRows.length ? nextRows : [emptyRowFor(table.columns, 0)]),
        },
        lastSavedAt: new Date().toISOString(),
      };
    });
  };

  const uploadFormAttachments = async (files) => {
    const uploaded = await uploadAttachments(files);
    setData((current) => ({
      ...current,
      attachments: [...(current.attachments || []), ...uploaded],
      lastSavedAt: new Date().toISOString(),
    }));
    return uploaded;
  };

  const deleteFormAttachment = async (attachment) => {
    await deleteAttachment(attachment);
    setData((current) => ({
      ...current,
      attachments: (current.attachments || []).filter((file) => file.url !== attachment.url),
      lastSavedAt: new Date().toISOString(),
    }));
  };

  const resetActiveModule = () => {
    if (!canEditActiveModule) return;
    if (!window.confirm(`Reset Section ${activeModule.number}? Unsaved data in this section will be cleared.`)) return;

    setData((current) => {
      const initial = buildInitialData();
      const fields = { ...current.fields };
      const tables = { ...current.tables };
      moduleFieldsFor(activeModule).forEach((field) => {
        fields[field.id] = initial.fields[field.id];
      });
      moduleTablesFor(activeModule).forEach((table) => {
        tables[table.id] = initial.tables[table.id];
      });
      return {
        ...current,
        fields,
        tables,
        attachments: uniqueAttachments({ fields, tables }),
        lastSavedAt: new Date().toISOString(),
      };
    });
    setStatus(`Section ${activeModule.number} cleared.`);
  };

  const payloadForModules = (modules, values = data.fields) => {
    const fieldIds = modules.flatMap((module) => moduleFieldsFor(module).map((field) => field.id));
    const tableIds = modules.flatMap((module) => moduleTablesFor(module).map((table) => table.id));
    const scopedValues = Object.fromEntries(fieldIds.map((fieldId) => [fieldId, values[fieldId] ?? ""]));
    if (values[SIGN_OFF_FIELD]) scopedValues[SIGN_OFF_FIELD] = values[SIGN_OFF_FIELD];
    const scopedTables = Object.fromEntries(tableIds.map((tableId) => [tableId, data.tables[tableId] || []]));
    return {
      ...buildSubmissionPayload({
        auditType: "administrative",
        values: scopedValues,
        tables: scopedTables,
        attachments: uniqueAttachments({ fields: scopedValues, tables: scopedTables }),
      }),
      sharedAdministrativeForm: true,
      contributorPost: userPost,
      sections: modules.map((module) => module.number),
    };
  };

  const currentPayload = () => payloadForModules([activeModule]);

  const saveAndGoNext = async () => {
    if (readOnly) return;
    setSavingDraft(true);
    setStatus("");
    const nextData = { ...data, lastSavedAt: new Date().toISOString() };

    try {
      setData(nextData);
      await saveDraft(currentPayload(), { isUpdate: hasExistingSubmission });
      setHasExistingSubmission(true);
      setStatus("Draft saved successfully.");

      const moduleIds = administrativeUserModules.map((module) => module.id);
      const currentIndex = moduleIds.indexOf(activeModuleId);
      const nextModuleId = moduleIds[Math.min(currentIndex + 1, moduleIds.length - 1)];

      if (nextModuleId && nextModuleId !== activeModuleId) {
        setActiveModuleId(nextModuleId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not save draft."));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  const handleApprove = async () => {
    if (isSubmitted || contributionApproved) return;
    setSubmitting(true);
    setSubmitStatus("");

    try {
      const signedFields = withSubmitterSignOff(data.fields, signOffProfileFromSession("administrative"));
      const signedData = { ...data, fields: signedFields };
      const ownedModules = administrativeUserModules.filter((module) => moduleOwnerPost(module) === userPost);
      const { data: approvalResponse } = await submitDraft(
        {
          ...payloadForModules(ownedModules, signedFields),
          action: "APPROVE_CONTRIBUTION",
        },
        { isUpdate: hasExistingSubmission },
      );
      setHasExistingSubmission(true);
      setContributionApproved(true);
      const overallStatus = String(
        approvalResponse?.data?.overallStatus ||
        approvalResponse?.overallStatus ||
        approvalResponse?.data?.status ||
        approvalResponse?.status ||
        ""
      ).toLowerCase().replaceAll("_", "-");
      if (["submitted", "under-review", "auditor-completed", "approved"].includes(overallStatus)) {
        setIsSubmitted(true);
      }
      setData({ ...signedData, submittedAt: new Date().toISOString(), lastSavedAt: new Date().toISOString() });
      setSubmitStatus("Your Administrative Audit sections were approved. The shared form will move to IQAC after all four authorities approve.");
    } catch (error) {
      setSubmitStatus(getApiErrorMessage(error, "Could not approve your Administrative Audit sections."));
    } finally {
      setSubmitting(false);
    }
  };

  if (reportMode) {
    return (
      <>
        <PrintStyles />
        <div className="admin-audit-shell" style={styles.shell}>
          <Sidebar
            activeModuleId={activeModuleId}
            setActiveModuleId={handleModuleChange}
            profile={profile}
            academicYear={academicYear}
            onLogout={() => setShowLogoutModal(true)}
          />
          <main className="admin-audit-main" style={styles.main}>
            <AdministrativeReportPanel
              meta={{ ...administrativeAuditMeta, academicYear }}
              modules={administrativeUserModules}
              data={data}
              onClose={() => setReportMode(false)}
            />
          </main>
          {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogout} />}
        </div>
      </>
    );
  }

  return (
    <>
      <PrintStyles />
      <div className="admin-audit-shell" style={styles.shell}>
        <Sidebar
          activeModuleId={activeModuleId}
          setActiveModuleId={handleModuleChange}
          profile={profile}
          academicYear={academicYear}
          onLogout={() => setShowLogoutModal(true)}
        />

        <main className="admin-audit-main" style={styles.main}>
          <header className="admin-audit-header audit-form__header" style={styles.header}>
            <div style={styles.headerContent}>
              <img src={universityLogo} alt="DYPIU Logo" style={styles.logo} />
              <div>
                <p style={styles.kicker}>{administrativeAuditMeta.university}</p>
                <h1 style={styles.title}>{administrativeAuditMeta.title}</h1>
                <p style={styles.meta}>{administrativeAuditMeta.address}</p>
                <p style={styles.meta}>{administrativeAuditMeta.act}</p>
                <p style={styles.year}>Academic Year {academicYear}</p>
              </div>
            </div>
            <div className="admin-audit-actions" style={styles.headerActions}>
              <button type="button" className="btn btn-secondary" onClick={resetActiveModule} disabled={readOnly || loadingDraft || savingDraft}>
                Reset Section
              </button>
            </div>
          </header>

          {status && <div style={styles.submitStatus}>{status}</div>}
          {loadingDraft && <LoadingState label="Loading saved form..." compact />}

          {loadingDraft ? (
            <SkeletonList rows={3} />
          ) : <section className="admin-form-panel audit-section-card" style={styles.modulePanel}>
            <div style={styles.moduleHead}>
              <div>
                <h2 style={styles.moduleTitle}>
                  {activeModule.number ? `${activeModule.number}. ${activeModule.title}` : activeModule.title}
                </h2>
                {activeModule.note && <p style={styles.moduleNote}>{activeModule.note}</p>}
              </div>
              {activeModuleId !== "submission-status" && (
                <span style={canEditActiveModule ? styles.badge : styles.readOnlyBadge}>
                  {canEditActiveModule ? (contributionApproved ? "Approved" : "Editable") : "Read only"}
                </span>
              )}
            </div>

            {!canEditActiveModule && activeModuleId !== "submission-status" && (
              <div style={styles.ownershipNotice}>
                This section can only be edited by {activeModule.owner}.
              </div>
            )}

            {activeModuleId === "submission-status" ? (
              <SubmissionStatusPanel
                data={data}
                userPost={userPost}
                academicYear={academicYear}
                hasExistingSubmission={hasExistingSubmission}
                onSubmitted={(updatedDraft) => {
                  setData((current) => ({
                    ...current,
                    fields: updatedDraft.values,
                    tables: ensureDefaultTableRows(updatedDraft.tables),
                    attachments: updatedDraft.attachments,
                    lastSavedAt: new Date().toISOString(),
                  }));
                  setHasExistingSubmission(updatedDraft.exists);
                  setIsSubmitted(updatedDraft.isSubmitted);
                  const contributionStatus = String(updatedDraft.administrativeProgress?.[userPost] || "").toLowerCase();
                  setContributionApproved(["approved", "submitted"].includes(contributionStatus));
                }}
              />
            ) : (
              moduleBlocksFor(activeModule).map((block, index) => {
                if (block.type === "fields") {
                  return <FieldGrid key={`fields-${index}`} fields={block.fields} data={data} onChange={setFieldValue} readOnly={readOnly} />;
                }

                if (block.type === "text") {
                  return (
                    <p key={`text-${index}`} style={styles.sectionText}>
                      {block.text}
                    </p>
                  );
                }

                if (block.type === "part-e-schools") {
                  return (
                    <AdministrativePartE
                      key={`part-e-${index}`}
                      value={data.fields[block.fieldId]}
                      coursesOffered={data.tables.coursesOffered || []}
                      onChange={(value) => setFieldValue(block.fieldId, value)}
                      onUploadAttachment={uploadFormAttachments}
                      onDeleteAttachment={deleteFormAttachment}
                      readOnly={readOnly}
                    />
                  );
                }

                return (
                  <div key={`tables-${index}`} style={styles.tables}>
                    {block.tables.map((table) => (
                      <AuditTable
                        key={table.id}
                        table={table}
                        rows={data.tables[table.id] || []}
                        onCellChange={setCellValue}
                        onAddRow={addRow}
                        onDeleteLastRow={deleteLastRow}
                        onUploadAttachment={uploadFormAttachments}
                        onDeleteAttachment={deleteFormAttachment}
                        readOnly={readOnly}
                      />
                    ))}
                  </div>
                );
              })
            )}

            <div style={styles.sectionFooter}>
              {activeModuleId === "submission-status" ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setReportMode(true);
                    setPrintReportAfterRender(true);
                  }}
                >
                  Generate Report
                </button>
              ) : isLastModule ? (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setReportMode(true);
                      setPrintReportAfterRender(true);
                    }}
                  >
                    Generate Report
                  </button>
                  {!isSubmitted && !contributionApproved && (
                    <button type="button" className="btn btn-primary" onClick={handleApprove} disabled={submitting} aria-busy={submitting}>
                      {submitting && <InlineSpinner label="Approving sections" />}
                      {submitting ? "Approving..." : "Approve"}
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={saveAndGoNext} disabled={readOnly || savingDraft || loadingDraft} aria-busy={savingDraft}>
                  {savingDraft && <InlineSpinner label="Saving section" />}
                  {savingDraft ? "Saving..." : "Save & Next"}
                </button>
              )}
            </div>
            {isLastModule && submitStatus && <div style={styles.submitStatus}>{submitStatus}</div>}
          </section>}
        </main>

        {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogout} />}
      </div>
    </>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media (max-width: 900px) {
        .admin-audit-shell { flex-direction: column; }
        .admin-audit-main { padding: 18px !important; }
        .admin-audit-header { flex-direction: column; }
      }
      @media print {
        .app-sidebar,
        .admin-audit-actions,
        .admin-report-actions {
          display: none !important;
        }
        .admin-audit-shell {
          display: block !important;
          background: #fff !important;
        }
        .admin-audit-main {
          padding: 0 !important;
          overflow: visible !important;
        }
        body {
          background: #fff !important;
        }
      }
    `}</style>
  );
}

function Sidebar({ activeModuleId, setActiveModuleId, profile, academicYear, onLogout }) {
  return (
    <AppSidebar
      title="Administrative Audit"
      subtitle="School Appraisal"
      badge="AA"
      roleTitle="Administrative Module"
      academicYear={academicYear}
      roleText="Registrar · HR · DSW · Placement"
      items={administrativeUserModules}
      activeId={activeModuleId}
      onChange={setActiveModuleId}
      profile={profile}
      onLogout={onLogout}
    />
  );
}

function FieldGrid({ fields, data, onChange, readOnly = false }) {
  return (
    <div className="audit-field-grid" style={styles.fieldGrid}>
      {fields.map((field) => {
        const isWideField = field.type === "textarea" || [
          "universityName",
          "viceChancellor",
          "registrar",
          "placementActivitiesHeading",
          "internshipActivitiesHeading",
        ].includes(field.id);

        if (field.kind === "heading") {
          return (
            <h3 key={field.id} style={styles.subsectionHeading}>
              {field.label}
            </h3>
          );
        }

        return (
          <label className="audit-field" key={field.id} style={isWideField ? styles.wideField : styles.field}>
            <span style={styles.fieldLabel}>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                value={data.fields[field.id] ?? ""}
                onChange={(event) => onChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.textarea}
                rows={4}
                readOnly={readOnly}
              />
            ) : field.type === "date" ? (
              <DateInput
                value={data.fields[field.id] ?? ""}
                onChange={(value) => onChange(field.id, value)}
                className="audit-control"
                style={styles.input}
                readOnly={readOnly}
              />
            ) : (
              <input
                value={data.fields[field.id] ?? ""}
                onChange={(event) => onChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.input}
                type="text"
                readOnly={readOnly}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}


function LogoutModal({ onCancel, onConfirm }) {
  return (
    <div style={styles.modalBackdrop} onClick={onCancel}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalTitle}>Confirm Logout</div>
        <div style={styles.modalText}>You are about to leave Administrative Audit. Any unsaved edits should already be autosaved locally.</div>
        <div style={styles.modalActions}>
          <button type="button" onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm} style={styles.confirmButton}>
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    background: "#f5f7fb",
    color: "#0f172a",
    fontFamily: "Inter, 'Segoe UI', sans-serif",
  },
  sidebar: {
    width: 264,
    height: "100vh",
    position: "sticky",
    top: 0,
    flexShrink: 0,
    boxSizing: "border-box",
    overflow: "hidden",
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    padding: "22px 16px",
    gap: 12,
    color: "#e2e8f0",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    boxShadow: "2px 0 16px rgba(15,23,42,0.14)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: "linear-gradient(135deg,#0ea5e9,#2563eb)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 900,
    fontSize: 14,
  },
  brandTitle: {
    color: "#f8fafc",
    fontWeight: 900,
    fontSize: 14,
  },
  brandSub: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 2,
  },
  roleCard: {
    background: "#1d4ed8",
    borderRadius: 12,
    padding: "12px",
    color: "#bfdbfe",
  },
  roleTitle: {
    color: "#fff",
    fontWeight: 900,
    fontSize: 14,
  },
  roleText: {
    color: "#dbeafe",
    fontSize: 14,
    marginTop: 3,
  },
  roleYear: {
    color: "#bfdbfe",
    fontSize: 14,
    marginTop: 7,
    fontWeight: 900,
  },
  navCard: {
    background: "#1e293b",
    borderRadius: 10,
    padding: "12px",
  },
  navLabel: {
    display: "block",
    color: "#94a3b8",
    fontWeight: 900,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  navSelect: {
    width: "100%",
    border: "1px solid #334155",
    borderRadius: 8,
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "9px 10px",
    fontSize: 14,
    fontWeight: 800,
    outline: "none",
  },
  queryCard: {
    margin: "8px 0",
    padding: "10px 12px",
    background: "rgba(37,99,235,0.15)",
    border: "1px solid #2563eb",
    borderRadius: 8,
  },
  queryLabel: {
    color: "#94a3b8",
    fontWeight: 700,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  queryLink: {
    color: "#60a5fa",
    fontWeight: 600,
    fontSize: 14,
    wordBreak: "break-all",
    textDecoration: "none",
  },
  sidebarSpacer: {
    flex: 1,
  },
  profileBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    paddingTop: 12,
    borderTop: "1px solid #1e293b",
  },
  profileRow: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: 14,
    flexShrink: 0,
  },
  profileText: {
    minWidth: 0,
  },
  profileName: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: 900,
    overflowWrap: "anywhere",
  },
  profileMeta: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 2,
    overflowWrap: "anywhere",
  },
  logoutButton: {
    width: "100%",
    border: "1px solid #374151",
    borderRadius: 8,
    background: "transparent",
    color: "#f87171",
    padding: "9px 11px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 14,
    fontFamily: "inherit",
  },
  main: {
    flex: 1,
    padding: "28px 30px 40px",
    overflowX: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    padding: "24px 26px",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 10px 35px rgba(15,23,42,0.055)",
  },
  headerContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    minWidth: 0,
  },
  logo: {
    width: 72,
    height: 72,
    objectFit: "contain",
    flexShrink: 0,
  },
  kicker: {
    margin: "0 0 8px",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 750,
    textTransform: "uppercase",
    letterSpacing: ".08em",
  },
  title: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "-.025em",
    lineHeight: 1.2,
  },
  meta: {
    margin: "3px 0",
    color: "#64748b",
    fontSize: 12.5,
  },
  year: {
    margin: "10px 0 0",
    color: "#334155",
    fontSize: 11,
    fontWeight: 650,
  },
  headerActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: "none",
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
    color: "#334155",
    padding: "11px 14px",
    fontSize: 14,
    fontWeight: 900,
    cursor: "pointer",
  },
  modulePanel: {
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    padding: 24,
    marginTop: 16,
    boxShadow: "0 12px 35px rgba(15,23,42,0.045)",
  },
  moduleHead: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "0 0 16px",
    borderBottom: "1px solid #edf1f6",
    marginBottom: 16,
  },
  moduleTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-.015em",
  },
  moduleNote: {
    margin: "6px 0 0",
    color: "#475569",
    fontSize: 12,
    fontWeight: 600,
  },
  badge: {
    borderRadius: 999,
    background: "#dcfce7",
    color: "#166534",
    padding: "5px 9px",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  readOnlyBadge: {
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    padding: "5px 9px",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: ".04em",
    textTransform: "uppercase",
  },
  ownershipNotice: {
    marginBottom: 16,
    border: "1px solid #fde68a",
    borderRadius: 7,
    padding: "10px 12px",
    color: "#92400e",
    background: "#fffbeb",
    fontSize: 12,
    fontWeight: 650,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
    gap: "20px 18px",
    marginBottom: 16,
  },
  sectionText: {
    margin: "0 0 16px",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  subsectionHeading: {
    gridColumn: "1 / -1",
    margin: "4px 0 0",
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 700,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  wideField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    gridColumn: "1 / -1",
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  input: {
    width: "100%",
    minHeight: 42,
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#0f172a",
    background: "#fbfcfe",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 96,
    resize: "vertical",
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "10px 12px",
    color: "#0f172a",
    background: "#fbfcfe",
    outline: "none",
  },
  tables: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  sectionFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    padding: 0,
    border: 0,
    background: "transparent",
  },
  submitStatus: {
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    background: "#f0fdf4",
    color: "#166534",
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 800,
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.55)",
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
  },
  modal: {
    width: "min(380px, 92vw)",
    background: "#fff",
    borderRadius: 12,
    padding: "26px 28px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  modalTitle: {
    color: "#0f172a",
    fontWeight: 900,
    fontSize: 18,
    marginBottom: 8,
  },
  modalText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 18,
  },
  modalActions: {
    display: "flex",
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    border: "none",
    borderRadius: 8,
    background: "#f1f5f9",
    color: "#475569",
    padding: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
  confirmButton: {
    flex: 1,
    border: "none",
    borderRadius: 8,
    background: "#dc2626",
    color: "#fff",
    padding: 10,
    fontWeight: 900,
    cursor: "pointer",
  },
};

function SubmissionStatusPanel({ data, userPost, academicYear, hasExistingSubmission, onSubmitted }) {
  const [statusMap, setStatusMap] = useState({
    registrar: { submitted: false, submittedAt: null, name: null, email: null },
    hr: { submitted: false, submittedAt: null, name: null, email: null },
    deanStudentWelfare: { submitted: false, submittedAt: null, name: null, email: null },
    deanPlacement: { submitted: false, submittedAt: null, name: null, email: null }
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const roles = [
    { key: "registrar", label: "Registrar", post: "registrar" },
    { key: "hr", label: "HR", post: "hr" },
    { key: "deanStudentWelfare", label: "Dean Student Welfare", post: "dean-student-welfare" },
    { key: "deanPlacement", label: "Dean Placement", post: "dean-placement" }
  ];

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const { data: res } = await fetchAdministrativeStatus(academicYear);
      if (res) {
        setStatusMap({
          registrar: res.registrar || statusMap.registrar,
          hr: res.hr || statusMap.hr,
          deanStudentWelfare: res.deanStudentWelfare || statusMap.deanStudentWelfare,
          deanPlacement: res.deanPlacement || statusMap.deanPlacement
        });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load submission status."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [academicYear]);

  const handleSubmitPart = async () => {
    if (!window.confirm("Are you sure you want to submit your part of the Administrative Audit? This will lock your section from further edits.")) {
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const { data: res } = await submitAdministrativePart(academicYear);
      setSuccess("Your section has been submitted successfully!");
      const { data: updatedStatus } = await fetchAdministrativeStatus(academicYear);
      if (updatedStatus) {
        setStatusMap({
          registrar: updatedStatus.registrar || statusMap.registrar,
          hr: updatedStatus.hr || statusMap.hr,
          deanStudentWelfare: updatedStatus.deanStudentWelfare || statusMap.deanStudentWelfare,
          deanPlacement: updatedStatus.deanPlacement || statusMap.deanPlacement
        });
      }
      const normalized = normalizeDraft(res);
      onSubmitted(normalized);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit your section."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading status..." compact />;
  }

  return (
    <div style={statusStyles.container}>
      <h3 style={statusStyles.title}>Section Submission Progress</h3>
      <p style={statusStyles.intro}>
        The complete Administrative Appraisal Form will transition to the next step once all four roles have submitted their respective parts.
      </p>

      {error && <div style={statusStyles.error}>{error}</div>}
      {success && <div style={statusStyles.success}>{success}</div>}

      <div style={statusStyles.table}>
        <div style={statusStyles.tableHeader}>
          <div style={statusStyles.colRole}>Authority / Role</div>
          <div style={statusStyles.colStatus}>Status</div>
          <div style={statusStyles.colDetails}>Submission Details</div>
          <div style={statusStyles.colAction}>Action</div>
        </div>

        {roles.map((r) => {
          const info = statusMap[r.key] || { submitted: false, submittedAt: null, name: null, email: null };
          const isCurrentUser = r.post === userPost;
          const formattedDate = info.submittedAt ? new Date(info.submittedAt).toLocaleString() : "";

          return (
            <div key={r.key} style={statusStyles.tableRow}>
              <div style={statusStyles.colRole}>
                <strong>{r.label}</strong>
              </div>
              <div style={statusStyles.colStatus}>
                <span style={info.submitted ? statusStyles.badgeSubmitted : statusStyles.badgePending}>
                  {info.submitted ? "Submitted" : "Pending"}
                </span>
              </div>
              <div style={statusStyles.colDetails}>
                {info.submitted ? (
                  <div style={statusStyles.detailsText}>
                    <span>By: {info.name || "N/A"} ({info.email || "N/A"})</span>
                    <span style={statusStyles.timestamp}>On: {formattedDate}</span>
                  </div>
                ) : (
                  <span style={statusStyles.pendingText}>Waiting for submission</span>
                )}
              </div>
              <div style={statusStyles.colAction}>
                {isCurrentUser && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSubmitPart}
                    disabled={info.submitted || submitting}
                    style={info.submitted ? statusStyles.disabledBtn : statusStyles.submitBtn}
                  >
                    {submitting ? "Submitting..." : info.submitted ? "Submitted" : "Submit My Part"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const statusStyles = {
  container: {
    padding: "8px 0"
  },
  title: {
    margin: "0 0 10px",
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 700
  },
  intro: {
    color: "#475569",
    fontSize: 13.5,
    lineHeight: 1.5,
    marginBottom: 20
  },
  error: {
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#991b1b",
    padding: "10px 14px",
    fontSize: 13.5,
    fontWeight: 650,
    marginBottom: 16
  },
  success: {
    border: "1px solid #bbf7d0",
    borderRadius: 8,
    background: "#f0fdf4",
    color: "#166534",
    padding: "10px 14px",
    fontSize: 13.5,
    fontWeight: 650,
    marginBottom: 16
  },
  table: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff"
  },
  tableHeader: {
    display: "flex",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    padding: "12px 16px",
    fontWeight: 700,
    fontSize: 13,
    color: "#475569"
  },
  tableRow: {
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid #f1f5f9",
    padding: "16.5px 16px",
    fontSize: 14,
    color: "#0f172a"
  },
  colRole: {
    flex: "1.2",
    minWidth: 150
  },
  colStatus: {
    flex: "0.8",
    minWidth: 100
  },
  colDetails: {
    flex: "2",
    minWidth: 200
  },
  colAction: {
    flex: "1",
    minWidth: 130,
    textAlign: "right"
  },
  badgeSubmitted: {
    display: "inline-block",
    borderRadius: 6,
    background: "#dcfce7",
    color: "#166534",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700
  },
  badgePending: {
    display: "inline-block",
    borderRadius: 6,
    background: "#fef3c7",
    color: "#d97706",
    padding: "4px 8px",
    fontSize: 11,
    fontWeight: 700
  },
  detailsText: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    fontSize: 12.5,
    color: "#334155"
  },
  timestamp: {
    color: "#64748b",
    fontSize: 11.5
  },
  pendingText: {
    color: "#94a3b8",
    fontSize: 12.5,
    fontStyle: "italic"
  },
  submitBtn: {
    background: "#2563eb",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s"
  },
  disabledBtn: {
    background: "#f1f5f9",
    border: "1px solid #cbd5e1",
    color: "#94a3b8",
    borderRadius: 6,
    padding: "8px 12px",
    fontSize: 12.5,
    fontWeight: 700,
    cursor: "not-allowed"
  }
};
