//renders a section of the audit form, like part A, part B, etc. It can contain fields and tables
import AuditTable from "./AuditTable";

function FieldGrid({ fields, values, onFieldChange }) {
  return (
    <div className="audit-field-grid" style={styles.fieldGrid}>
      {fields.map((field) => {
        if (field.kind === "heading") {
          return (
            <h3 key={field.id} style={styles.subheading}>
              {field.label}
            </h3>
          );
        }

        return (
          <label className="audit-field" key={field.id} style={field.type === "textarea" ? styles.wideField : styles.field}>
            <span style={styles.label}>{field.label}</span>
            {field.type === "textarea" ? (
              <textarea
                value={values[field.id] ?? ""}
                onChange={(event) => onFieldChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.textarea}
                rows={4}
              />
            ) : field.type === "select" ? (
              <select
                value={values[field.id] ?? ""}
                onChange={(event) => onFieldChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.input}
              >
                <option value="">Select</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={values[field.id] ?? ""}
                onChange={(event) => onFieldChange(field.id, event.target.value)}
                className="audit-control"
                style={styles.input}
                type={field.type || "text"}
              />
            )}
          </label>
        );
      })}
    </div>
  );
}

function TableList({ tableDefinitions, tableValues, values, onFieldChange, onTableChange, onAddRow, onDeleteLastRow, onUploadAttachment }) {
  return (
    <div style={styles.tables}>
      {tableDefinitions.map((table) => (
        <AuditTable
          key={table.id}
          table={table}
          rows={tableValues[table.id] || []}
          values={values}
          onFieldChange={onFieldChange}
          onChange={(rowIndex, column, value) => onTableChange(table.id, rowIndex, column, value)}
          onAddRow={onAddRow}
          onDeleteLastRow={onDeleteLastRow}
          onUploadAttachment={onUploadAttachment}
        />
      ))}
    </div>
  );
}

export default function AuditSection({ section, values, tables, onFieldChange, onTableChange, onAddRow, onDeleteLastRow, onUploadAttachment }) {
  const blocks = section.blocks || [
    ...(section.fields?.length ? [{ type: "fields", fields: section.fields }] : []),
    ...(section.tables?.length ? [{ type: "tables", tables: section.tables }] : []),
  ];

  return (
    <section className="audit-section-card" id={section.id} style={styles.section}>
      <div style={styles.headingRow}>
        <h2 style={styles.heading}>{section.title}</h2>
      </div>

      {blocks.map((block, index) => {
        if (block.type === "fields") {
          return <FieldGrid key={`fields-${index}`} fields={block.fields} values={values} onFieldChange={onFieldChange} />;
        }

        return (
          <TableList
            key={`tables-${index}`}
            tableValues={tables}
            tableDefinitions={block.tables}
            values={values}
            onFieldChange={onFieldChange}
            onTableChange={onTableChange}
            onAddRow={onAddRow}
            onDeleteLastRow={onDeleteLastRow}
            onUploadAttachment={onUploadAttachment}
          />
        );
      })}
    </section>
  );
}

const styles = {
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 12px 35px rgba(15, 23, 42, 0.045)",
  },
  headingRow: {
    padding: "0 0 15px",
    borderBottom: "1px solid #edf1f6",
  },
  heading: {
    margin: 0,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-.015em",
    lineHeight: 1.3,
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px 16px",
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
  label: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  subheading: {
    gridColumn: "1 / -1",
    margin: "8px 0 0",
    padding: 0,
    color: "#0f172a",
    background: "transparent",
    fontSize: 15,
    lineHeight: 1.35,
  },
  input: {
    width: "100%",
    minHeight: 42,
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#0f172a",
    background: "#fbfcfe",
    outline: "none",
  },
  textarea: {
    width: "100%",
    minHeight: 84,
    resize: "vertical",
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#0f172a",
    background: "#fbfcfe",
    outline: "none",
  },
  tables: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
};
