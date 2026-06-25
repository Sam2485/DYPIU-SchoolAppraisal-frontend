//academic & administrative table add rows and delete last row functionality , sr no, table heading(blue)
import { useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { columnsWithSerial, serialColumnFor } from "./tableHelpers";

const isAttachmentColumn = (column) => /\b(link|proof|attachment|document|mom)\b/i.test(column);

export default function AuditTable({
  table,
  rows,
  values = {},
  onFieldChange,
  onChange,
  onCellChange,
  onAddRow,
  onDeleteLastRow,
  onUploadAttachment,
  onDeleteAttachment,
}) {
  const columns = columnsWithSerial(table.columns);
  const fitToContainer = table.fitToContainer !== false;
  const denseTable = columns.length >= 9;
  const [uploadingCell, setUploadingCell] = useState("");
  const [deletingAttachment, setDeletingAttachment] = useState("");
  const [uploadError, setUploadError] = useState("");

  const handleCellChange = (rowIndex, column, value) => {
    if (onChange) {
      onChange(rowIndex, column, value);
      return;
    }

    onCellChange?.(table.id, rowIndex, column, value);
  };

  const handleAttachmentChange = async (rowIndex, column, selectedFiles) => {
    const files = Array.from(selectedFiles || []);
    if (!files.length) return;

    setUploadError("");
    const invalidType = files.find((file) => file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"));
    if (invalidType) {
      setUploadError("Only PDF attachments are allowed.");
      return;
    }

    if (files.some((file) => file.size > 10 * 1024 * 1024)) {
      setUploadError("Attachment must be 10MB or smaller.");
      return;
    }

    const cellKey = `${rowIndex}-${column}`;
    setUploadingCell(cellKey);

    try {
      const uploaded = onUploadAttachment
        ? await onUploadAttachment(files)
        : files.map((file) => ({ name: file.name, fileName: file.name, url: URL.createObjectURL(file) }));
      const currentFiles = Array.isArray(rows[rowIndex]?.[column])
        ? rows[rowIndex][column]
        : rows[rowIndex]?.[column]
          ? [rows[rowIndex][column]]
          : [];
      handleCellChange(rowIndex, column, [...currentFiles, ...uploaded]);
    } catch (error) {
      setUploadError(getApiErrorMessage(error, "Attachment upload failed."));
    } finally {
      setUploadingCell("");
    }
  };

  const handleAttachmentDelete = async (rowIndex, column, attachment) => {
    if (!attachment?.url) {
      setUploadError("Could not delete attachment because its URL is missing.");
      return;
    }

    if (!window.confirm(`Remove ${attachment.name || attachment.fileName || "this attachment"}?`)) return;

    const attachmentKey = `${rowIndex}-${column}-${attachment.url}`;
    setDeletingAttachment(attachmentKey);
    setUploadError("");

    try {
      await onDeleteAttachment?.(attachment);
      const currentFiles = Array.isArray(rows[rowIndex]?.[column])
        ? rows[rowIndex][column]
        : rows[rowIndex]?.[column]
          ? [rows[rowIndex][column]]
          : [];
      handleCellChange(
        rowIndex,
        column,
        currentFiles.filter((file) => file.url !== attachment.url),
      );
    } catch (error) {
      const status = error?.response?.status;
      if (status === 400) {
        setUploadError(error?.response?.data?.message || "Could not delete attachment.");
      } else if (status === 404) {
        setUploadError("File not found.");
      } else {
        setUploadError("Could not delete attachment.");
      }
    } finally {
      setDeletingAttachment("");
    }
  };

  return (
    <section className={`audit-table-card${denseTable ? " audit-table-card--dense" : ""}`} style={styles.wrap}>
      {table.showTitle !== false && (
        <div style={styles.header}>
          <h3 style={styles.title}>{table.title}</h3>
        </div>
      )}

      {!!table.notes?.length && (
        <div style={styles.notes}>
          {table.notes.map((note) => (
            <div key={note} style={styles.note}>
              {note}
            </div>
          ))}
        </div>
      )}

      {uploadError && <div style={styles.uploadError}>{uploadError}</div>}

      {!!table.fields?.length && (
        <div style={styles.embeddedFields}>
          {table.fields.map((field) => (
            <label key={field.id} style={styles.embeddedField}>
              <span style={styles.embeddedLabel}>{field.label}</span>
              <input
                value={values[field.id] ?? ""}
                onChange={(event) => onFieldChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.embeddedInput}
                type={field.type || "text"}
              />
            </label>
          ))}
        </div>
      )}

      <div style={{ ...styles.scroller, ...(fitToContainer ? styles.fittedScroller : {}) }}>
        <table
          style={{
            ...styles.table,
            minWidth: fitToContainer ? 0 : Math.max(760, columns.length * 180),
            tableLayout: fitToContainer ? "fixed" : "auto",
          }}
        >
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} style={{ ...styles.th, ...(serialColumnFor([column]) ? styles.serialCell : {}) }}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${table.id}-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column} style={{ ...styles.td, ...(serialColumnFor([column]) ? styles.serialCell : {}) }}>
                    {isAttachmentColumn(column) ? (
                      <div style={styles.attachmentCell}>
                        {(Array.isArray(row[column]) ? row[column] : row[column] ? [row[column]] : []).length ? (
                          <div className="audit-attached-file" style={styles.attachedFile}>
                            {(Array.isArray(row[column]) ? row[column] : [row[column]]).map((file, fileIndex) => (
                              <span key={`${file.url || file.name || "attachment"}-${fileIndex}`} style={styles.fileSummary}>
                                <span style={styles.pdfIcon} aria-hidden="true">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                                    <path d="M6 2.75h8l4 4V21.25H6z" />
                                    <path d="M14 2.75v4h4" />
                                  </svg>
                                </span>
                                <span style={styles.fileDetails}>
                                  <span style={styles.fileName} title={file.name || file.fileName}>
                                    {file.name || file.fileName || "Attached document"}
                                  </span>
                                  <span style={styles.fileType}>PDF document</span>
                                </span>
                                {file.url && (
                                  <span style={styles.attachmentItemActions}>
                                    <a
                                      className="audit-attachment-view"
                                      href={file.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={styles.attachmentLink}
                                      aria-label={`View ${file.name || "attachment"}`}
                                    >
                                      View
                                    </a>
                                    <button
                                      type="button"
                                      style={styles.deleteAttachmentButton}
                                      onClick={() => handleAttachmentDelete(rowIndex, column, file)}
                                      disabled={deletingAttachment === `${rowIndex}-${column}-${file.url}`}
                                      aria-label={`Remove ${file.name || "attachment"}`}
                                    >
                                      {deletingAttachment === `${rowIndex}-${column}-${file.url}` ? "Removing..." : "Remove"}
                                    </button>
                                  </span>
                                )}
                              </span>
                            ))}
                            <span style={styles.fileActions}>
                              <label className="audit-attachment-replace" style={styles.replaceButton}>
                                {uploadingCell === `${rowIndex}-${column}` ? "Uploading..." : "Add PDFs"}
                                <input
                                  type="file"
                                  accept=".pdf,application/pdf"
                                  multiple
                                  onChange={(event) => {
                                    handleAttachmentChange(rowIndex, column, event.target.files);
                                    event.target.value = "";
                                  }}
                                  style={styles.fileInput}
                                  aria-label={`Add attachments to ${table.title} ${column}`}
                                  disabled={uploadingCell === `${rowIndex}-${column}`}
                                />
                              </label>
                            </span>
                          </div>
                        ) : (
                          <label className="audit-attachment-button" style={styles.attachmentButton}>
                            <svg
                              aria-hidden="true"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={styles.attachmentIcon}
                            >
                              <path d="M12 16V4" />
                              <path d="m7 9 5-5 5 5" />
                              <path d="M5 20h14" />
                            </svg>
                            <span>{uploadingCell === `${rowIndex}-${column}` ? "Uploading..." : "Attach PDFs"}</span>
                            <input
                              type="file"
                              accept=".pdf,application/pdf"
                              multiple
                              onChange={(event) => {
                                handleAttachmentChange(rowIndex, column, event.target.files);
                                event.target.value = "";
                              }}
                              style={styles.fileInput}
                              aria-label={`${table.title} ${column}`}
                              disabled={uploadingCell === `${rowIndex}-${column}`}
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <input className="audit-table-input"
                        value={row[column] ?? ""}
                        onChange={(event) => handleCellChange(rowIndex, column, event.target.value)}
                        style={{
                          ...styles.cellInput,
                          ...(fitToContainer ? styles.fittedCellInput : {}),
                          ...(serialColumnFor([column]) ? styles.serialInput : {}),
                          background: serialColumnFor([column]) ? "#f8fafc" : "#fff",
                        }}
                        readOnly={Boolean(serialColumnFor([column]))}
                        aria-label={`${table.title} ${column}`}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td style={styles.emptyCell} colSpan={columns.length}>
                  No rows added.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.footer}>
        <button type="button" className="audit-table-add-row" onClick={() => onAddRow?.(table)}>
          + Add Row
        </button>
        <button type="button" className="audit-table-delete-row" onClick={() => onDeleteLastRow?.(table)} disabled={rows.length <= 1}>
          Delete Last Row
        </button>
      </div>
    </section>
  );
}

const styles = {
  wrap: {
    border: 0,
    borderRadius: 0,
    background: "#fff",
    overflow: "visible",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    margin: 0,
    padding: "0 0 9px",
    borderBottom: 0,
    background: "transparent",
  },
  title: {
    margin: 0,
    fontSize: 15,
    lineHeight: 1.35,
    color: "#0f172a",
    fontWeight: 700,
  },
  notes: {
    padding: "0 14px 12px",
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.6,
  },
  note: {
    paddingLeft: 8,
  },
  embeddedFields: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 14,
    padding: "12px 14px",
    borderBottom: "1px solid #e5edf7",
    background: "#fff",
  },
  embeddedField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  embeddedLabel: {
    color: "#334155",
    fontSize: 14,
    fontWeight: 800,
  },
  embeddedInput: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 9,
    padding: "10px 11px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
  },
  scroller: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #d7dee8",
  },
  fittedScroller: {
    overflowX: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    padding: "10px 11px",
    borderBottom: "1px solid #334155",
    borderRight: "1px solid #3a465b",
    color: "#f8fafc",
    background: "#1e293b",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: ".025em",
    textAlign: "left",
    whiteSpace: "normal",
  },
  serialCell: {
    width: 72,
    minWidth: 72,
    maxWidth: 72,
  },
  td: {
    padding: 7,
    borderBottom: "1px solid #dfe5ec",
    borderRight: "1px solid #dfe5ec",
    verticalAlign: "top",
  },
  cellInput: {
    width: "100%",
    minWidth: 120,
    border: "1px solid #cbd5e1",
    borderRadius: 5,
    padding: "8px 9px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
  },
  fittedCellInput: {
    minWidth: 0,
  },
  serialInput: {
    minWidth: 44,
    width: 54,
    textAlign: "center",
    fontWeight: 700,
    fontSize: 14,
  },
  secondaryButton: {
    flex: "0 0 auto",
    border: "1px solid #2563eb",
    borderRadius: 8,
    color: "#2563eb",
    background: "#fff",
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  removeButton: {
    border: "1px solid #dc2626",
    borderRadius: 8,
    color: "#dc2626",
    background: "#fff",
    padding: "8px 12px",
    fontSize: 14,
    fontWeight: 800,
    cursor: "pointer",
  },
  footer: {
    display: "flex",
    justifyContent: "flex-start",
    gap: 10,
    padding: "10px 0 2px",
    borderTop: 0,
    background: "transparent",
  },
  attachmentCell: {
    width: "100%",
    minWidth: 0,
  },
  attachmentButton: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "fit-content",
    maxWidth: "100%",
    gap: 7,
    minHeight: 36,
    border: "1px solid #bfdbfe",
    borderRadius: 7,
    color: "#1d4ed8",
    background: "#eff6ff",
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 750,
    cursor: "pointer",
    overflow: "hidden",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  attachmentIcon: {
    width: 16,
    height: 16,
    flex: "0 0 16px",
  },
  fileInput: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    margin: 0,
    opacity: 0,
    cursor: "pointer",
  },
  attachedFile: {
    display: "flex",
    flexDirection: "column",
    gap: 9,
    width: "100%",
    minHeight: 46,
    padding: "6px 7px",
    border: "1px solid #dbe3ef",
    borderRadius: 8,
    background: "#f8fafc",
  },
  fileSummary: {
    width: "100%",
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  pdfIcon: {
    width: 30,
    height: 30,
    flex: "0 0 30px",
    display: "grid",
    placeItems: "center",
    padding: 6,
    borderRadius: 7,
    color: "#dc2626",
    background: "#fee2e2",
  },
  fileDetails: {
    minWidth: 0,
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: 2,
  },
  attachmentLink: {
    flex: "0 0 auto",
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: 750,
    textDecoration: "none",
  },
  attachmentItemActions: {
    display: "flex",
    flex: "0 0 auto",
    alignItems: "center",
    gap: 8,
  },
  deleteAttachmentButton: {
    border: 0,
    color: "#b91c1c",
    background: "transparent",
    padding: 0,
    fontSize: 10.5,
    fontWeight: 750,
    cursor: "pointer",
  },
  fileName: {
    overflow: "hidden",
    color: "#1e293b",
    fontSize: 11.5,
    fontWeight: 700,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileType: {
    color: "#64748b",
    fontSize: 9.5,
  },
  fileActions: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingTop: 5,
    borderTop: "1px solid #e2e8f0",
  },
  replaceButton: {
    position: "relative",
    flex: "0 0 auto",
    overflow: "hidden",
    border: 0,
    color: "#475569",
    background: "transparent",
    padding: "3px 2px",
    fontSize: 10.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  uploadError: {
    margin: "10px 14px 0",
    border: "1px solid #fecaca",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#991b1b",
    padding: "9px 10px",
    fontSize: 13,
    fontWeight: 700,
  },
  emptyCell: {
    padding: 18,
    textAlign: "center",
    color: "#64748b",
    fontSize: 14,
  },
};
