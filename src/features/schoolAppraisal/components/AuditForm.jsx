//contains all the schema for academic audit 2025-26 form
import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { buildSubmissionPayload, deleteAttachment, fetchMyDraft, normalizeDraft, saveDraft, signOffProfileFromSession, submitDraft, uploadAttachments, withSubmitterSignOff } from "../../../api/submissions";
import universityLogo from "../../../assets/images/image.png";
import AuditReportPanel from "./AuditReportPanel";
import AuditSection from "./AuditSection";
import { columnsWithSerial, serialColumnFor } from "./tableHelpers";

const emptyRowFor = (columns) =>
  columnsWithSerial(columns).reduce((row, column) => {
    row[column] = "";
    return row;
  }, {});

const numberedRowFor = (columns, index) => {
  const row = emptyRowFor(columns);
  const serialColumn = serialColumnFor(Object.keys(row));
  if (serialColumn) row[serialColumn] = String(index + 1);
  return row;
};

const withSerialNumbers = (columns, rows) => {
  const normalizedColumns = columnsWithSerial(columns);
  const serialColumn = serialColumnFor(normalizedColumns);

  return rows.map((row, index) => ({
    ...numberedRowFor(columns, index),
    ...row,
    ...(serialColumn && !row[serialColumn] ? { [serialColumn]: String(index + 1) } : {}),
  }));
};

function buildInitialValues(schema) {
  return schema.sections.reduce((values, section) => {
    const fields = [
      ...(section.fields || []),
      ...(section.blocks || []).flatMap((block) => (block.type === "fields" ? block.fields : [])),
    ];

    fields.forEach((field) => {
      if (field.kind === "heading") return;
      values[field.id] = "";
    });
    return values;
  }, {});
}

function buildInitialTables(schema) {
  return schema.sections.reduce((tables, section) => {
    const tableDefinitions = [
      ...(section.tables || []),
      ...(section.blocks || []).flatMap((block) => (block.type === "tables" ? block.tables : [])),
    ];

    tableDefinitions.forEach((table) => {
      const rows = table.initialRows?.length ? table.initialRows : [numberedRowFor(table.columns, 0)];
      tables[table.id] = withSerialNumbers(table.columns, rows);
    });
    return tables;
  }, {});
}

export default function AuditForm({ schema, activeSectionId, reportMode, onReportModeChange, onSectionChange }) {
  const auditType = schema.id.includes("administrative") ? "administrative" : "academic";
  const initialValues = useMemo(() => buildInitialValues(schema), [schema]);
  const initialTables = useMemo(() => buildInitialTables(schema), [schema]);
  const [values, setValues] = useState(initialValues);
  const [tables, setTables] = useState(initialTables);
  const [attachments, setAttachments] = useState([]);
  const [status, setStatus] = useState("");
  const [submitStatus, setSubmitStatus] = useState("");
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [printReportAfterRender, setPrintReportAfterRender] = useState(false);
  const activeSectionIndex = Math.max(0, schema.sections.findIndex((section) => section.id === activeSectionId));
  const isLastSection = activeSectionIndex === schema.sections.length - 1;
  const readOnly = isSubmitted;
  const progress = Math.round(((activeSectionIndex + 1) / schema.sections.length) * 100);

  useEffect(() => {
    if (!reportMode || !printReportAfterRender) return undefined;

    const timer = window.setTimeout(() => {
      window.print();
      setPrintReportAfterRender(false);
    }, 150);

    return () => window.clearTimeout(timer);
  }, [printReportAfterRender, reportMode]);

  useEffect(() => {
    let isActive = true;

    const loadDraft = async () => {
      setLoadingDraft(true);
      setStatus("");

      try {
        const { data } = await fetchMyDraft(auditType);
        const draft = normalizeDraft(data, initialValues, initialTables);

        if (!isActive) return;
        setValues(draft.values);
        setTables(draft.tables);
        setAttachments(draft.attachments);
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
  }, [auditType, initialTables, initialValues]);

  const handleFieldChange = (fieldId, value) => {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setStatus("");
  };

  const handleTableChange = (tableId, rowIndex, column, value) => {
    setTables((current) => ({
      ...current,
      [tableId]: current[tableId].map((row, index) => (index === rowIndex ? { ...row, [column]: value } : row)),
    }));
    setStatus("");
  };

  const handleAddRow = (table) => {
    setTables((current) => ({
      ...current,
      [table.id]: [...(current[table.id] || []), numberedRowFor(table.columns, current[table.id]?.length || 0)],
    }));
  };

  const handleDeleteLastRow = (table) => {
    setTables((current) => {
      const nextRows = (current[table.id] || []).slice(0, -1);
      return {
        ...current,
        [table.id]: nextRows.length ? withSerialNumbers(table.columns, nextRows) : [numberedRowFor(table.columns, 0)],
      };
    });
  };

  const currentPayload = () => buildSubmissionPayload({ auditType, values, tables, attachments });

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setStatus("");

    try {
      await saveDraft(currentPayload(), { isUpdate: hasExistingSubmission });
      setHasExistingSubmission(true);
      setStatus("Draft saved successfully.");
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not save draft."));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveAndNext = async () => {
    setSavingDraft(true);
    setStatus("");

    try {
      await saveDraft(currentPayload(), { isUpdate: hasExistingSubmission });
      setHasExistingSubmission(true);
      setStatus("Draft saved successfully.");

      const sectionIds = schema.sections.map((section) => section.id);
      const currentIndex = sectionIds.indexOf(activeSectionId);
      const nextSectionId = sectionIds[Math.min(currentIndex + 1, sectionIds.length - 1)];

      if (nextSectionId && nextSectionId !== activeSectionId) {
        onSectionChange?.(nextSectionId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not save draft."));
    } finally {
      setSavingDraft(false);
    }
  };

  const handleClear = () => {
    if (!window.confirm("Are you sure you want to clear the form? All unsaved changes will be lost.")) return;

    setValues(initialValues);
    setTables(initialTables);
    setAttachments([]);
    setIsSubmitted(false);
    setStatus("Form cleared.");
  };

  const handleGenerateReport = () => {
    onReportModeChange(true);
    setPrintReportAfterRender(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitStatus("");

    try {
      const signedValues = withSubmitterSignOff(values, signOffProfileFromSession("director"));
      await submitDraft(buildSubmissionPayload({ auditType, values: signedValues, tables, attachments }), { isUpdate: hasExistingSubmission });
      setValues(signedValues);
      setHasExistingSubmission(true);
      setIsSubmitted(true);
      setSubmitStatus("Academic Audit submitted successfully.");
    } catch (error) {
      setSubmitStatus(getApiErrorMessage(error, "Could not submit Academic Audit."));
    } finally {
      setSubmitting(false);
    }
  };

  if (reportMode) {
    return (
      <div className="academic-report-view" style={styles.form}>
        <div className="academic-report-actions" style={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={() => onReportModeChange(false)}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Print Report
          </button>
        </div>
        <AuditReportPanel schema={schema} values={values} tables={tables} />
      </div>
    );
  }

  return (
    <form className="audit-form" style={styles.form} onSubmit={(event) => event.preventDefault()}>
      <header className="audit-form__header" style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logoWrap}><img src={universityLogo} alt="DYPIU Logo" style={styles.logo} /></div>
          <div style={styles.headerCopy}>
            <p style={styles.kicker}>{schema.header.university}</p>
            <h1 style={styles.title}>{schema.title}</h1>
            <p style={styles.meta}>{schema.header.address}</p>
            <div style={styles.headerMetaRow}>
              <span style={styles.year}>Academic Year {schema.academicYear}</span>
              <span style={styles.draftPill}>Draft in progress</span>
            </div>
          </div>
        </div>
        <div style={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={handleClear} disabled={readOnly}>
            Clear
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSaveDraft} disabled={readOnly || savingDraft || loadingDraft}>
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
        </div>
        <div className="audit-form__progress" style={styles.progressTrack}>
          <span style={{ ...styles.progressBar, width: `${progress}%` }} />
        </div>
      </header>

      {status && <div style={styles.status}>{status}</div>}
      {loadingDraft && <div style={styles.status}>Loading draft from server...</div>}

      <div style={styles.sections}>
        {schema.sections
          .filter((section) => !activeSectionId || section.id === activeSectionId)
          .map((section) => (
            <AuditSection
              key={section.id}
              section={section}
              values={values}
              tables={tables}
              onFieldChange={handleFieldChange}
              onTableChange={handleTableChange}
              onAddRow={handleAddRow}
              onDeleteLastRow={handleDeleteLastRow}
              onUploadAttachment={async (files) => {
                const uploaded = await uploadAttachments(files);
                setAttachments((current) => [...current, ...uploaded]);
                return uploaded;
              }}
              onDeleteAttachment={async (attachment) => {
                await deleteAttachment(attachment);
                setAttachments((current) => current.filter((file) => file.url !== attachment.url));
              }}
              readOnly={readOnly}
            />
          ))}
      </div>

      <div style={styles.sectionFooter}>
        {isLastSection ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={handleGenerateReport}>
              Generate Report
            </button>
            {!isSubmitted && (
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit"}
              </button>
            )}
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={handleSaveAndNext} disabled={readOnly || savingDraft || loadingDraft}>
            {savingDraft ? "Saving..." : "Save & Next"}
          </button>
        )}
      </div>
      {isLastSection && submitStatus && <div style={styles.status}>{submitStatus}</div>}
    </form>
  );
}

const styles = {
  form: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  header: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
    padding: "24px 26px 28px",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 10px 35px rgba(15, 23, 42, 0.055)",
    overflow: "hidden",
  },
  headerContent: {
    display: "flex",
    alignItems: "flex-start",
    gap: 18,
    minWidth: 0,
  },
  headerCopy: { minWidth: 0 },
  logoWrap: {
    width: 76,
    height: 76,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
    border: "1px solid #e7edf5",
    borderRadius: 14,
    background: "#f8fafc",
  },
  logo: {
    width: 62,
    height: 62,
    objectFit: "contain",
    flexShrink: 0,
  },
  kicker: {
    margin: "0 0 6px",
    color: "#2563eb",
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
    lineHeight: 1.25,
  },
  meta: {
    margin: "3px 0",
    color: "#64748b",
    fontSize: 12.5,
    lineHeight: 1.45,
  },
  headerMetaRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 },
  year: { color: "#334155", fontSize: 11, fontWeight: 650 },
  draftPill: { padding: "4px 8px", borderRadius: 999, color: "#0369a1", background: "#e0f2fe", fontSize: 9.5, fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase" },
  progressTrack: { position: "absolute", left: 0, right: 0, bottom: 0, height: 4, background: "#eff6ff" },
  progressBar: { display: "block", height: "100%", borderRadius: "0 4px 4px 0", background: "linear-gradient(90deg, #2563eb, #38bdf8)", transition: "width .3s ease" },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  primaryButton: {
    border: "1px solid #2563eb",
    borderRadius: 5,
    color: "#fff",
    background: "#2563eb",
    padding: "10px 13px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    color: "#334155",
    background: "#fff",
    padding: "10px 13px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  status: {
    padding: "10px 12px",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    color: "#166534",
    background: "#f0fdf4",
    fontSize: 14,
    fontWeight: 700,
  },
  sections: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
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
};
