import { columnsWithSerial } from "./tableHelpers";
import universityLogo from "../../../assets/images/image.png";

const blocksFor = (section) =>
  section.blocks || [
    ...(section.fields?.length ? [{ type: "fields", fields: section.fields }] : []),
    ...(section.tables?.length ? [{ type: "tables", tables: section.tables }] : []),
  ];

export default function AuditReportPanel({ schema, values, tables }) {
  return (
    <div style={styles.panel}>
      <header style={styles.header}>
        <img src={universityLogo} alt="DYPIU Logo" style={styles.logo} />
        <div>
          <p style={styles.kicker}>{schema.header.university}</p>
          <h1 style={styles.title}>{schema.title}</h1>
          <p style={styles.meta}>{schema.header.address}</p>
          <p style={styles.meta}>{schema.header.act}</p>
          <p style={styles.year}>Academic Year {schema.academicYear}</p>
        </div>
      </header>

      {schema.sections.map((section) => (
        <section key={section.id} style={styles.section}>
          <h2 style={styles.sectionTitle}>{section.title}</h2>
          {blocksFor(section).map((block, blockIndex) => {
            if (block.type === "fields") {
              return (
                <div key={`fields-${blockIndex}`} style={styles.fieldGrid}>
                  {block.fields.map((field) => {
                    if (field.kind === "heading") {
                      return (
                        <h3 key={field.id} style={styles.subheading}>
                          {field.label}
                        </h3>
                      );
                    }

                    return (
                      <div key={field.id} style={styles.fieldBlock}>
                        <div style={styles.fieldLabel}>{field.label}</div>
                        <div style={styles.fieldValue}>{values[field.id] || "-"}</div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            return block.tables.map((table) => {
              const columns = columnsWithSerial(table.columns);

              return (
                <div key={table.id} style={styles.tableBlock}>
                  {table.showTitle !== false && <h3 style={styles.tableTitle}>{table.title}</h3>}
                  <div style={styles.tableScroller}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          {columns.map((column) => (
                            <th key={column} style={styles.th}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(tables[table.id] || []).map((row, rowIndex) => (
                          <tr key={`${table.id}-${rowIndex}`}>
                            {columns.map((column) => (
                              <td key={column} style={styles.td}>
                                {row[column]?.name || row[column] || "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            });
          })}
        </section>
      ))}

      <AuditorSignatureBlock />
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
    alignItems: "flex-start",
    gap: 16,
    padding: 22,
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    background: "#fff",
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
  meta: {
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
  section: {
    padding: 18,
    border: "1px solid #dbe3ef",
    borderRadius: 10,
    background: "#fff",
  },
  sectionTitle: {
    margin: "0 0 14px",
    padding: "12px 14px",
    borderLeft: "4px solid #2563eb",
    borderRadius: 6,
    background: "#eff6ff",
    color: "#0f172a",
    fontSize: 18,
  },
  subheading: {
    gridColumn: "1 / -1",
    margin: "6px 0 0",
    color: "#0f172a",
    fontSize: 18,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 10,
    marginBottom: 14,
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
    color: "#0f172a",
    fontSize: 18,
  },
  tableScroller: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    minWidth: 720,
    borderCollapse: "collapse",
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
