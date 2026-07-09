import { useState, useRef } from "react";
import apiClient, { getApiErrorMessage } from "../../../api/client";

export default function BackupRestorePanel() {
  const [dbLoading, setDbLoading] = useState(false);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [dbRestoring, setDbRestoring] = useState(false);
  const [uploadsRestoring, setUploadsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const dbInputRef = useRef(null);
  const uploadsInputRef = useRef(null);

  // ────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────

  const handleDownloadDb = async () => {
    setDbLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await apiClient.get("/api/backup/db", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `db_dump_${Date.now()}.sql`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage("Database dump downloaded successfully.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to download database dump."));
    } finally {
      setDbLoading(false);
    }
  };

  const handleDownloadUploads = async () => {
    setUploadsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      const response = await apiClient.get("/api/backup/uploads", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `uploads_backup_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setStatusMessage("Uploads ZIP backup downloaded successfully.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to download uploads ZIP backup."));
    } finally {
      setUploadsLoading(false);
    }
  };

  const handleDbUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".sql")) {
      setErrorMessage("Only .sql files are allowed.");
      return;
    }

    setDbRestoring(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post("/api/backup/db/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatusMessage(response.data?.message || "Database successfully restored.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to restore database."));
    } finally {
      setDbRestoring(false);
      if (dbInputRef.current) dbInputRef.current.value = "";
    }
  };

  const handleUploadsUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setErrorMessage("Only .zip files are allowed.");
      return;
    }

    setUploadsRestoring(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiClient.post("/api/backup/uploads/restore", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatusMessage(response.data?.message || "Uploads ZIP successfully restored.");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Failed to restore uploads ZIP."));
    } finally {
      setUploadsRestoring(false);
      if (uploadsInputRef.current) uploadsInputRef.current.value = "";
    }
  };

  return (
    <div style={styles.container}>
      {/* Banner */}
      <div style={styles.banner}>
        <div style={styles.bannerIcon}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </div>
        <div style={styles.bannerText}>
          <strong style={styles.bannerTitle}>BROWSER UPLOAD & SIZE LIMITATIONS</strong>
          <p style={styles.bannerDescription}>
            Web-based file transfers are subject to network timeouts and container memory allocation. Do not use this UI for uploaded folder backups exceeding <strong>500MB</strong>.
            For large media/file sizes, please use direct server command-line tools (SCP/SFTP and SSH) as described in the system docs.
          </p>
        </div>
      </div>

      {statusMessage && <div style={styles.successAlert}>{statusMessage}</div>}
      {errorMessage && <div style={styles.errorAlert}>{errorMessage}</div>}

      {/* Cards Grid */}
      <div style={styles.grid}>
        {/* PostgreSQL Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>PostgreSQL Database</h2>
          <p style={styles.cardSubtitle}>SQL data dumps and schema recovery</p>

          <div style={styles.divider} />

          {/* Export Section */}
          <div style={styles.section}>
            <span style={styles.sectionHeader}>EXPORT DATABASE DUMP</span>
            <p style={styles.sectionDescription}>
              Generates a full PostgreSQL database dump containing all tables, appraisal forms, snapshot configurations, and user credentials.
            </p>
            <button
              onClick={handleDownloadDb}
              disabled={dbLoading}
              style={dbLoading ? styles.buttonDisabled : styles.button}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.btnIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {dbLoading ? "Generating SQL..." : "Download Database SQL"}
            </button>
          </div>

          <div style={styles.divider} />

          {/* Restore Section */}
          <div style={styles.section}>
            <span style={styles.sectionHeader}>RESTORE / IMPORT DATABASE</span>
            
            <div style={styles.criticalWarning}>
              <strong>CRITICAL WARNING:</strong> Restoring database dumps replaces the live schema. All data registered since the backup date will be permanently deleted.
            </div>

            <input
              type="file"
              accept=".sql"
              ref={dbInputRef}
              onChange={handleDbUpload}
              style={{ display: "none" }}
            />
            
            <button
              onClick={() => dbInputRef.current?.click()}
              disabled={dbRestoring}
              style={dbRestoring ? styles.dropzoneDisabled : styles.dropzone}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.dropzoneIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>{dbRestoring ? "Restoring Database..." : "Click to choose SQL dump file"}</span>
              <small style={styles.dropzoneSmall}>Only .sql files are allowed</small>
            </button>
          </div>
        </div>

        {/* Uploads Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Uploaded Proof Files</h2>
          <p style={styles.cardSubtitle}>PDF documents, attachments, and uploads backup</p>

          <div style={styles.divider} />

          {/* Export Section */}
          <div style={styles.section}>
            <span style={styles.sectionHeader}>EXPORT UPLOADED DOCUMENTS</span>
            <p style={styles.sectionDescription}>
              Zips the entire storage uploads directory containing all faculty-provided PDF attachments and proof files.
            </p>
            <button
              onClick={handleDownloadUploads}
              disabled={uploadsLoading}
              style={uploadsLoading ? styles.buttonDisabled : styles.button}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.btnIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              {uploadsLoading ? "Zipping files..." : "Download Uploads ZIP"}
            </button>
          </div>

          <div style={styles.divider} />

          {/* Restore Section */}
          <div style={styles.section}>
            <span style={styles.sectionHeader}>RESTORE / IMPORT UPLOADS</span>
            
            <div style={styles.noteWarning}>
              <strong>NOTE:</strong> Restoring uploads will overwrite files with matching names inside the uploads directory. Existing unique files will not be deleted.
            </div>

            <input
              type="file"
              accept=".zip"
              ref={uploadsInputRef}
              onChange={handleUploadsUpload}
              style={{ display: "none" }}
            />

            <button
              onClick={() => uploadsInputRef.current?.click()}
              disabled={uploadsRestoring}
              style={uploadsRestoring ? styles.dropzoneDisabled : styles.dropzone}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={styles.dropzoneIcon}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>{uploadsRestoring ? "Uploading & Restoring..." : "Click to choose ZIP backup archive"}</span>
              <small style={styles.dropzoneSmall}>Only .zip files are allowed</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "20px 0",
    color: "#e2e8f0",
  },
  banner: {
    display: "flex",
    gap: "16px",
    background: "rgba(30, 41, 59, 0.4)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
    borderRadius: "12px",
    padding: "16px 20px",
    marginBottom: "24px",
  },
  bannerIcon: {
    color: "#3b82f6",
    flexShrink: 0,
    marginTop: "2px",
  },
  bannerText: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  bannerTitle: {
    color: "#3b82f6",
    fontSize: "13px",
    letterSpacing: "0.5px",
  },
  bannerDescription: {
    color: "#94a3b8",
    fontSize: "12.5px",
    margin: 0,
    lineHeight: "1.5",
  },
  grid: {
    display: "flex",
    flexDirection: "row",
    gap: "24px",
    flexWrap: "wrap",
  },
  card: {
    flex: "1 1 450px",
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(148, 163, 184, 0.1)",
    borderRadius: "16px",
    padding: "24px",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2)",
    backdropFilter: "blur(8px)",
  },
  cardTitle: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#f8fafc",
    margin: "0 0 4px 0",
  },
  cardSubtitle: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  divider: {
    height: "1px",
    background: "rgba(148, 163, 184, 0.1)",
    margin: "20px 0",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  sectionHeader: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: "1px",
  },
  sectionDescription: {
    fontSize: "13px",
    color: "#94a3b8",
    lineHeight: "1.5",
    margin: 0,
  },
  button: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  buttonDisabled: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "#1e3a8a",
    color: "#93c5fd",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "not-allowed",
    opacity: 0.7,
  },
  btnIcon: {
    flexShrink: 0,
  },
  criticalWarning: {
    fontSize: "12px",
    background: "rgba(244, 63, 94, 0.1)",
    border: "1px solid rgba(244, 63, 94, 0.2)",
    borderRadius: "8px",
    padding: "12px",
    color: "#fda4af",
    lineHeight: "1.5",
  },
  noteWarning: {
    fontSize: "12px",
    background: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.2)",
    borderRadius: "8px",
    padding: "12px",
    color: "#fde047",
    lineHeight: "1.5",
  },
  dropzone: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "rgba(15, 23, 42, 0.4)",
    border: "1px dashed rgba(148, 163, 184, 0.3)",
    borderRadius: "8px",
    padding: "24px 16px",
    cursor: "pointer",
    color: "#cbd5e1",
    transition: "border-color 0.2s, background 0.2s",
    outline: "none",
    width: "100%",
  },
  dropzoneDisabled: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    background: "rgba(15, 23, 42, 0.2)",
    border: "1px dashed rgba(148, 163, 184, 0.15)",
    borderRadius: "8px",
    padding: "24px 16px",
    cursor: "not-allowed",
    color: "#64748b",
    width: "100%",
    opacity: 0.7,
  },
  dropzoneIcon: {
    color: "#64748b",
  },
  dropzoneSmall: {
    fontSize: "11px",
    color: "#64748b",
  },
  successAlert: {
    background: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#a7f3d0",
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "13px",
    marginBottom: "20px",
  },
  errorAlert: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    borderRadius: "8px",
    padding: "12px 16px",
    fontSize: "13px",
    marginBottom: "20px",
  },
};
