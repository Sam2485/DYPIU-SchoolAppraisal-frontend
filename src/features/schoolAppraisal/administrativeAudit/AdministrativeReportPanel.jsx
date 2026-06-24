import universityLogo from "../../../assets/images/image.png";

const moduleBlocksFor = (module) =>
  module.blocks || [
    ...(module.fields?.length ? [{ type: "fields", fields: module.fields }] : []),
    ...(module.tables?.length ? [{ type: "tables", tables: module.tables }] : []),
  ];

export default function AdministrativeReportPanel({ meta, modules, data, onClose }) {
  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <img src={universityLogo} alt="DYPIU Logo" style={styles.logo} />
          <div>
          <p style={styles.kicker}>{meta.university}</p>
          <h2 style={styles.title}>{meta.title}</h2>
          <p style={styles.text}>{meta.address}</p>
          <p style={styles.text}>{meta.act}</p>
          <p style={styles.year}>Academic Year {meta.academicYear}</p>
          </div>
        </div>
        <div className="admin-report-actions" style={styles.actions}>
          <button type="button" style={styles.secondary} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {modules.map((module) => (
          <section key={module.id} style={styles.module}>
            <h3 style={styles.moduleTitle}>
              {module.number}. {module.title}
            </h3>
            {module.note && <p style={styles.moduleNote}>{module.note}</p>}

            {moduleBlocksFor(module).map((block, index) => {
              if (block.type === "fields") {
                return (
                  <div key={`fields-${index}`} style={styles.fieldGrid}>
                    {block.fields.map((field) => {
                      if (field.kind === "heading") {
                        return (
                          <h4 key={field.id} style={styles.subsectionHeading}>
                            {field.label}
                          </h4>
                        );
                      }

                      return (
                        <div key={field.id} style={styles.fieldBlock}>
                          <div style={styles.fieldLabel}>{field.label}</div>
                          <div style={styles.fieldValue}>{data.fields[field.id] || "-"}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (block.type === "text") {
                return (
                  <p key={`text-${index}`} style={styles.sectionText}>
                    {block.text}
                  </p>
                );
              }

              return block.tables.map((table) => (
                <div key={table.id} style={styles.tableBlock}>
                  <h4 style={styles.tableTitle}>{table.title}</h4>
                  {!!table.notes?.length && (
                    <div style={styles.notes}>
                      {table.notes.map((note) => (
                        <div key={note}>{note}</div>
                      ))}
                    </div>
                  )}
                  <div style={styles.scroller}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {table.columns.map((column) => (
                            <th key={column} style={styles.th}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(data.tables[table.id] || []).map((row, rowIndex) => (
                          <tr key={`${table.id}-${rowIndex}`}>
                            {table.columns.map((column) => (
                              <td key={column} style={styles.td}>
                                {row[column] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ));
            })}
          </section>
        ))}
        <AuditorSignatureBlock />
      </div>
    </div>
  );
}

function AuditorSignatureBlock() {
  return (
    <section style={styles.signatureWrap}>
      {[1, 2].map((auditor) => (
        <div key={auditor} style={styles.signatureBlock}>
          <div style={styles.signatureRow}>
            <span>Name of the Auditor</span>
            <span style={styles.signatureLine}>:</span>
          </div>
          <div style={styles.signatureRow}>
            <span>Designation</span>
            <span style={styles.signatureLine}>:</span>
          </div>
          <div style={styles.signatureRow}>
            <span>Date</span>
            <span style={styles.dateLine}>: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;/20</span>
          </div>
        </div>
      ))}
    </section>
  );
}

const styles = {
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    padding: 22,
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    background: "#fff",
    boxShadow: "0 12px 26px rgba(15, 23, 42, 0.04)",
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
    margin: "0 0 7px",
    color: "#1d4ed8",
    fontSize: 14,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  title: {
    margin: "0 0 8px",
    color: "#0f172a",
    fontSize: 18,
  },
  text: {
    margin: "2px 0",
    color: "#64748b",
    fontSize: 14,
  },
  year: {
    margin: "10px 0 0",
    color: "#334155",
    fontWeight: 900,
    fontSize: 14,
  },
  actions: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
  },
  secondary: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    background: "#fff",
    color: "#334155",
    padding: "10px 14px",
    fontWeight: 900,
    cursor: "pointer",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  module: {
    padding: 18,
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    background: "#fff",
  },
  moduleTitle: {
    margin: "0 0 14px",
    padding: "12px 14px",
    borderLeft: "4px solid #2563eb",
    borderRadius: 6,
    background: "#eff6ff",
    color: "#0f172a",
    fontSize: 18,
  },
  moduleNote: {
    margin: "-6px 0 14px",
    color: "#475569",
    fontSize: 14,
    fontWeight: 800,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginBottom: 14,
  },
  sectionText: {
    margin: "0 0 14px",
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  subsectionHeading: {
    gridColumn: "1 / -1",
    margin: "4px 0 0",
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 900,
  },
  fieldBlock: {
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 10,
    background: "#f8fafc",
  },
  fieldLabel: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: 900,
    marginBottom: 5,
  },
  fieldValue: {
    color: "#0f172a",
    fontSize: 14,
    whiteSpace: "pre-wrap",
  },
  tableBlock: {
    marginTop: 14,
  },
  tableTitle: {
    margin: "0 0 8px",
    padding: "10px 12px",
    borderLeft: "4px solid #2563eb",
    borderRadius: 6,
    background: "#eff6ff",
    color: "#1e293b",
    fontSize: 18,
  },
  notes: {
    margin: "0 0 8px",
    color: "#334155",
    fontSize: 14,
    lineHeight: 1.6,
  },
  scroller: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 720,
  },
  th: {
    padding: "8px 9px",
    border: "1px solid #cbd5e1",
    background: "#eef4fb",
    color: "#334155",
    fontSize: 14,
    textAlign: "left",
  },
  td: {
    padding: "8px 9px",
    border: "1px solid #e2e8f0",
    color: "#0f172a",
    fontSize: 14,
    verticalAlign: "top",
  },
  signatureWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(260px, 1fr))",
    gap: 28,
    padding: "28px 36px",
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    background: "#fff",
  },
  signatureBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    color: "#0f172a",
    fontSize: 14,
    fontWeight: 800,
  },
  signatureRow: {
    display: "grid",
    gridTemplateColumns: "118px 1fr",
    alignItems: "center",
    gap: 8,
  },
  signatureLine: {
    borderBottom: "1px solid #0f172a",
    minHeight: 18,
  },
  dateLine: {
    minHeight: 18,
  },
};
