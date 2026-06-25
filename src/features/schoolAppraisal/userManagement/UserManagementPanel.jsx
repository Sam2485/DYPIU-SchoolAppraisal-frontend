import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { createUser, fetchUsers } from "../../../api/users";
import { ADMINISTRATIVE_POSTS, SCHOOL_OPTIONS } from "./userManagementConfig";

const emptyForm = {
  category: "",
  school: "",
  post: "",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const normalizeList = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const normalizeUser = (user = {}, index = 0) => {
  const role = String(user.role || "").toLowerCase().replaceAll("_", "-");
  const category = user.category || (
    role === "director"
      ? "academic"
      : role === "administrative"
        ? "administrative"
        : "authority"
  );
  const designation = user.designation || user.post || "";

  return {
    ...user,
    id: user.id || user.userId || user.email || `user-${index}`,
    name: user.name || user.fullName || "-",
    email: user.email || user.username || "-",
    category,
    role: role || (category === "academic" ? "director" : "administrative"),
    assignment: category === "academic"
      ? (user.school || user.schoolName || "-")
      : (designation || "-"),
    status: String(user.status || (user.active === false ? "inactive" : "active")).toLowerCase(),
  };
};

const postLabelFor = (value) => ADMINISTRATIVE_POSTS.find((post) => post.value === value)?.label || value;

function validate(form) {
  const errors = {};
  if (!form.category) errors.category = "Select Academic or Administrative.";
  if (form.category === "academic" && !form.school) errors.school = "Select a school.";
  if (form.category === "administrative" && !form.post) errors.post = "Select an administrative post.";
  if (!form.name.trim()) errors.name = "Enter the user's name.";
  if (!form.email.trim()) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!form.password) errors.password = "Enter a password.";
  else if (form.password.length < 6) errors.password = "Password must contain at least 6 characters.";
  if (!form.confirmPassword) errors.confirmPassword = "Confirm the password.";
  else if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

export default function UserManagementPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [loadNotice, setLoadNotice] = useState("");
  const [creating, setCreating] = useState(false);

  const schools = useMemo(() => SCHOOL_OPTIONS, []);

  useEffect(() => {
    let isActive = true;

    const loadUsers = async () => {
      setLoading(true);
      setLoadNotice("");

      try {
        const { data } = await fetchUsers();
        if (isActive) setUsers(normalizeList(data).map(normalizeUser));
      } catch (error) {
        if (isActive) {
          setUsers([]);
          setLoadNotice(getApiErrorMessage(error, "User API is not connected yet. The backend should provide GET /api/users."));
        }
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadUsers();
    return () => {
      isActive = false;
    };
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "category" ? { school: "", post: "" } : {}),
    }));
    setErrors((current) => ({ ...current, [field]: "", ...(field === "category" ? { school: "", post: "" } : {}) }));
    setStatus("");
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(emptyForm);
    setErrors({});
    setStatus("");
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const isAcademic = form.category === "academic";
    const payload = {
      category: form.category,
      role: isAcademic ? "director" : "administrative",
      school: isAcademic ? form.school : "Administrative Office",
      designation: isAcademic ? "Director" : postLabelFor(form.post),
      post: isAcademic ? null : form.post,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
    };

    setCreating(true);
    setStatus("");

    try {
      const { data } = await createUser(payload);
      const created = data?.data?.user || data?.user || data?.data || data || payload;
      setUsers((current) => [normalizeUser({ ...payload, ...created }), ...current]);
      setStatus("User account created successfully.");
      setForm(emptyForm);
      setErrors({});
      setShowForm(false);
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not create the user. The backend should provide POST /api/users."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <section style={styles.panel}>
      <div className="user-management-heading" style={styles.headingRow}>
        <div>
          <p style={styles.kicker}>IQAC access only</p>
          <h2 style={styles.title}>User Management</h2>
          <p style={styles.description}>View Academic and Administrative users or create a new account.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm((open) => !open)}>
          {showForm ? "Close Form" : "+ Add New User"}
        </button>
      </div>

      {showForm && (
        <form style={styles.formCard} onSubmit={handleCreate}>
          <div style={styles.formHeading}>
            <h3 style={styles.formTitle}>Create New User</h3>
            <span style={styles.formHint}>Choose the user category first.</span>
          </div>

          <div className="user-management-category-grid" style={styles.categoryGrid}>
            {[
              { value: "academic", label: "Academic", detail: "Director assigned to a school" },
              { value: "administrative", label: "Administrative", detail: "Registrar, HR, DSW or Placement" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                style={{ ...styles.categoryCard, ...(form.category === option.value ? styles.activeCategoryCard : {}) }}
                onClick={() => updateField("category", option.value)}
              >
                <strong>{option.label}</strong>
                <span>{option.detail}</span>
              </button>
            ))}
          </div>
          {errors.category && <span style={styles.errorText}>{errors.category}</span>}

          {form.category && (
            <div className="user-management-field-grid" style={styles.fieldGrid}>
              {form.category === "academic" ? (
                <Field label="School" error={errors.school}>
                  <select className="audit-control" style={styles.control} value={form.school} onChange={(event) => updateField("school", event.target.value)}>
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={school.name} value={school.name}>
                        {school.name}{school.code ? ` (${school.code})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field label="Administrative Post" error={errors.post}>
                  <select className="audit-control" style={styles.control} value={form.post} onChange={(event) => updateField("post", event.target.value)}>
                    <option value="">Select post</option>
                    {ADMINISTRATIVE_POSTS.map((post) => <option key={post.value} value={post.value}>{post.label}</option>)}
                  </select>
                </Field>
              )}

              <Field label="Name" error={errors.name}>
                <input className="audit-control" style={styles.control} value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Enter full name" />
              </Field>

              <Field label="Email ID" error={errors.email}>
                <input className="audit-control" style={styles.control} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="name@dypiu.ac.in" />
              </Field>

              <Field label="Password" error={errors.password}>
                <input className="audit-control" style={styles.control} type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Minimum 6 characters" />
              </Field>

              <Field label="Confirm Password" error={errors.confirmPassword}>
                <input className="audit-control" style={styles.control} type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Re-enter password" />
              </Field>
            </div>
          )}

          <div style={styles.formActions}>
            <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating || !form.category}>
              {creating ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {status && <div style={status.includes("successfully") ? styles.successNotice : styles.errorNotice}>{status}</div>}
      {loadNotice && <div style={styles.apiNotice}>{loadNotice}</div>}

      <div style={styles.tableCard}>
        <div style={styles.tableHeading}>
          <h3 style={styles.formTitle}>All Users</h3>
          <span style={styles.count}>{users.length} users</span>
        </div>

        <div style={styles.scroller}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Name", "Email", "Category", "School / Post", "Role", "Status"].map((column) => (
                  <th key={column} style={styles.th}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={styles.emptyCell}>Loading users...</td></tr>
              ) : users.length ? users.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}><strong>{user.name}</strong></td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={styles.td}><span style={styles.categoryPill}>{user.category}</span></td>
                  <td style={styles.td}>{user.assignment}</td>
                  <td style={styles.td}>{user.role}</td>
                  <td style={styles.td}><span style={user.status === "active" ? styles.activeStatus : styles.inactiveStatus}>{user.status}</span></td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={styles.emptyCell}>No users are available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      {children}
      {error && <span style={styles.errorText}>{error}</span>}
    </label>
  );
}

const styles = {
  panel: { display: "flex", flexDirection: "column", gap: 18 },
  headingRow: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, padding: 20, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 12px 35px rgba(15,23,42,.045)" },
  kicker: { margin: "0 0 5px", color: "#2563eb", fontSize: 10, fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: "0 0 5px", color: "#0f172a", fontSize: 20, fontWeight: 700 },
  description: { margin: 0, color: "#64748b", fontSize: 12.5 },
  formCard: { display: "flex", flexDirection: "column", gap: 18, padding: 20, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 12px 35px rgba(15,23,42,.045)" },
  formHeading: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 14, borderBottom: "1px solid #edf1f6" },
  formTitle: { margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 700 },
  formHint: { color: "#64748b", fontSize: 11 },
  categoryGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  categoryCard: { display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px", border: "1px solid #d7dee9", borderRadius: 10, color: "#334155", background: "#fbfcfe", cursor: "pointer", textAlign: "left", fontFamily: "inherit" },
  activeCategoryCard: { borderColor: "#2563eb", color: "#1d4ed8", background: "#eff6ff", boxShadow: "0 0 0 3px rgba(37,99,235,.08)" },
  fieldGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(240px, 1fr))", gap: "18px 16px" },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#334155", fontSize: 12, fontWeight: 650 },
  control: { width: "100%", minHeight: 42, border: "1px solid #d7dee9", borderRadius: 8, padding: "9px 11px", color: "#0f172a", background: "#fbfcfe", outline: "none" },
  errorText: { color: "#b91c1c", fontSize: 11, fontWeight: 650 },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 2 },
  successNotice: { padding: "10px 12px", border: "1px solid #bbf7d0", borderRadius: 10, color: "#166534", background: "#f0fdf4", fontSize: 12, fontWeight: 700 },
  errorNotice: { padding: "10px 12px", border: "1px solid #fecaca", borderRadius: 10, color: "#991b1b", background: "#fef2f2", fontSize: 12, fontWeight: 700 },
  apiNotice: { padding: "10px 12px", border: "1px solid #bae6fd", borderRadius: 10, color: "#075985", background: "#f0f9ff", fontSize: 12, fontWeight: 650 },
  tableCard: { overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 12px 35px rgba(15,23,42,.045)" },
  tableHeading: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "18px 20px", borderBottom: "1px solid #edf1f6" },
  count: { padding: "5px 8px", borderRadius: 999, color: "#475569", background: "#f1f5f9", fontSize: 10.5, fontWeight: 700 },
  scroller: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: { padding: "10px 11px", borderRight: "1px solid #3a465b", color: "#f8fafc", background: "#1e293b", fontSize: 11.5, fontWeight: 700, textAlign: "left" },
  td: { padding: "11px", borderRight: "1px solid #dfe5ec", borderBottom: "1px solid #dfe5ec", color: "#334155", fontSize: 12, overflowWrap: "anywhere" },
  emptyCell: { padding: 28, color: "#64748b", fontSize: 12, textAlign: "center" },
  categoryPill: { textTransform: "capitalize", color: "#1d4ed8", fontWeight: 700 },
  activeStatus: { display: "inline-flex", padding: "4px 7px", borderRadius: 999, color: "#166534", background: "#dcfce7", fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" },
  inactiveStatus: { display: "inline-flex", padding: "4px 7px", borderRadius: 999, color: "#991b1b", background: "#fee2e2", fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" },
};
