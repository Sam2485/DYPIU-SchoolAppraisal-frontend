//main dashboard for administrative audit 2025-26 form, contains sidebar, header, summary metrics, and module panel with fields and tables
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../api/client";
import { buildSubmissionPayload, deleteAttachment, fetchMyDraft, normalizeDraft, saveDraft, signOffProfileFromSession, submitDraft, uploadAttachments, withSubmitterSignOff } from "../../../api/submissions";
import universityLogo from "../../../assets/images/image.png";
import AuditTable from "../components/AuditTable";
import { columnsWithSerial, serialColumnFor } from "../components/tableHelpers";
import AdministrativeReportPanel from "./AdministrativeReportPanel";
import AppSidebar from "../components/AppSidebar";
import { administrativeAuditMeta, administrativeAuditModules } from "./administrativeAuditConfig";

const administrativeUserModules = administrativeAuditModules.filter((module) => module.id !== "section-f-observations-recommendations");

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

const moduleBlocksFor = (module) =>
  module.blocks || [
    ...(module.fields?.length ? [{ type: "fields", fields: module.fields }] : []),
    ...(module.tables?.length ? [{ type: "tables", tables: module.tables }] : []),
  ];

const moduleFieldsFor = (module) =>
  moduleBlocksFor(module)
    .flatMap((block) => (block.type === "fields" ? block.fields : []))
    .filter((field) => field.kind !== "heading");

const moduleTablesFor = (module) =>
  moduleBlocksFor(module).flatMap((block) => (block.type === "tables" ? block.tables : []));

const buildInitialData = () => {
  const fields = {};
  const tables = {};

  administrativeAuditModules.forEach((module) => {
    moduleFieldsFor(module).forEach((field) => {
      fields[field.id] = "";
    });
    moduleTablesFor(module).forEach((table) => {
      tables[table.id] = normalizeRows(table.columns, table.initialRows?.length ? table.initialRows : [emptyRowFor(table.columns, 0)]);
    });
  });

  fields.universityName = administrativeAuditMeta.university;
  fields.address = administrativeAuditMeta.address;

  return { fields, tables, attachments: [], lastSavedAt: "" };
};

const getUserProfile = () => ({
  name: sessionStorage.getItem("name") || "Administrative User",
  designation: sessionStorage.getItem("designation") || "Registrar",
  school: sessionStorage.getItem("school") || "Administrative Office",
  email: sessionStorage.getItem("email") || sessionStorage.getItem("username") || "",
});

export default function AdministrativeAuditDashboard() {
  const navigate = useNavigate();
  const [activeModuleId, setActiveModuleId] = useState(administrativeUserModules[0].id);
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
  const [data, setData] = useState(buildInitialData);

  const activeModule = useMemo(
    () => administrativeUserModules.find((module) => module.id === activeModuleId) || administrativeUserModules[0],
    [activeModuleId],
  );
  const profile = getUserProfile();
  const activeModuleIndex = administrativeUserModules.findIndex((module) => module.id === activeModuleId);
  const isLastModule = activeModuleIndex === administrativeUserModules.length - 1;

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
          tables: draft.tables,
          attachments: draft.attachments,
          lastSavedAt: new Date().toISOString(),
        });
        setHasExistingSubmission(draft.exists);
        setIsSubmitted(draft.isSubmitted);
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
  }, []);

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

  const resetDraft = () => {
    if (!window.confirm("Are you sure you want to reset the form? All unsaved changes will be lost.")) return;

    const nextData = buildInitialData();
    setData(nextData);
    setIsSubmitted(false);
    setStatus("Form cleared.");
  };

  const currentPayload = () =>
    buildSubmissionPayload({
      auditType: "administrative",
      values: data.fields,
      tables: data.tables,
      attachments: data.attachments,
    });

  const saveAndGoNext = async () => {
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

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitStatus("");

    try {
      const signedFields = withSubmitterSignOff(data.fields, signOffProfileFromSession("administrative"));
      const signedData = { ...data, fields: signedFields };
      await submitDraft(
        buildSubmissionPayload({
          auditType: "administrative",
          values: signedFields,
          tables: data.tables,
          attachments: data.attachments,
        }),
        { isUpdate: hasExistingSubmission },
      );
      setHasExistingSubmission(true);
      setIsSubmitted(true);
      setData({ ...signedData, submittedAt: new Date().toISOString(), lastSavedAt: new Date().toISOString() });
      setSubmitStatus("Administrative Audit submitted successfully.");
    } catch (error) {
      setSubmitStatus(getApiErrorMessage(error, "Could not submit Administrative Audit."));
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
            onLogout={() => setShowLogoutModal(true)}
          />
          <main className="admin-audit-main" style={styles.main}>
            <AdministrativeReportPanel
              meta={administrativeAuditMeta}
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
                <p style={styles.year}>Academic Year {administrativeAuditMeta.academicYear}</p>
              </div>
            </div>
            <div className="admin-audit-actions" style={styles.headerActions}>
              <button type="button" className="btn btn-secondary" onClick={resetDraft} disabled={loadingDraft || savingDraft}>
                Reset
              </button>
            </div>
          </header>

          {status && <div style={styles.submitStatus}>{status}</div>}
          {loadingDraft && <div style={styles.submitStatus}>Loading draft from server...</div>}

          <section className="admin-form-panel audit-section-card" style={styles.modulePanel}>
            <div style={styles.moduleHead}>
              <div>
                <h2 style={styles.moduleTitle}>
                  {activeModule.number ? `${activeModule.number}. ${activeModule.title}` : activeModule.title}
                </h2>
                {activeModule.note && <p style={styles.moduleNote}>{activeModule.note}</p>}
              </div>
              <span style={styles.badge}>Server draft</span>
            </div>

            {moduleBlocksFor(activeModule).map((block, index) => {
              if (block.type === "fields") {
                return <FieldGrid key={`fields-${index}`} fields={block.fields} data={data} onChange={setFieldValue} />;
              }

              if (block.type === "text") {
                return (
                  <p key={`text-${index}`} style={styles.sectionText}>
                    {block.text}
                  </p>
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
                  onUploadAttachment={async (files) => {
                    const uploaded = await uploadAttachments(files);
                    setData((current) => ({
                      ...current,
                      attachments: [...(current.attachments || []), ...uploaded],
                      lastSavedAt: new Date().toISOString(),
                    }));
                    return uploaded;
                  }}
                  onDeleteAttachment={async (attachment) => {
                    await deleteAttachment(attachment);
                    setData((current) => ({
                      ...current,
                      attachments: (current.attachments || []).filter((file) => file.url !== attachment.url),
                      lastSavedAt: new Date().toISOString(),
                    }));
                  }}
                />
                  ))}
                </div>
              );
            })}

            <div style={styles.sectionFooter}>
              {isLastModule ? (
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
                  {!isSubmitted && (
                    <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  )}
                </>
              ) : (
                <button type="button" className="btn btn-primary" onClick={saveAndGoNext} disabled={savingDraft || loadingDraft}>
                  {savingDraft ? "Saving..." : "Save & Next"}
                </button>
              )}
            </div>
            {isLastModule && submitStatus && <div style={styles.submitStatus}>{submitStatus}</div>}
          </section>
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

function Sidebar({ activeModuleId, setActiveModuleId, profile, onLogout }) {
  return (
    <AppSidebar
      title="Administrative Audit"
      subtitle="School Appraisal"
      badge="AA"
      roleTitle="Administrative Module"
      roleText="Registrar · HR · DSW · Placement"
      items={administrativeUserModules}
      activeId={activeModuleId}
      onChange={setActiveModuleId}
      profile={profile}
      onLogout={onLogout}
    />
  );
}

function FieldGrid({ fields, data, onChange }) {
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
              />
            ) : (
              <input
                value={data.fields[field.id] ?? ""}
                onChange={(event) => onChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.input}
                type="text"
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
