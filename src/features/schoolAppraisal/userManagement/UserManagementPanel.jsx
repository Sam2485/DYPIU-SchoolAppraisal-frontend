import { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { createUser, deleteUser, fetchUsers, updateUser } from "../../../api/users";
import { ADMINISTRATIVE_POSTS, SCHOOL_OPTIONS } from "./userManagementConfig";

const emptyForm = {
  accountType: "user",
  category: "",
  auditorType: "",
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
  const accountType = String(user.accountType || user.userType || user.type || (role.includes("auditor") ? "auditor" : "user")).toLowerCase().replaceAll("_", "-");
  const auditorType = String(user.auditorType || user.auditorCategory || (
    role.includes("external")
      ? "external"
      : role.includes("internal")
        ? "internal"
        : ""
  )).toLowerCase().replaceAll("_", "-");
  const category = user.category || (
    role.includes("academic")
      ? "academic"
      : role.includes("administrative")
        ? "administrative"
        : role === "director"
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
    accountType,
    auditorType,
    category,
    role: accountType === "auditor"
      ? (user.auditorRole || `${category}-${auditorType || "internal"}-auditor`)
      : (role || (category === "academic" ? "director" : "administrative")),
    assignment: category === "academic"
      ? (user.school || user.schoolName || "-")
      : (designation || "-"),
    status: String(user.status || (user.active === false ? "inactive" : "active")).toLowerCase(),
  };
};

const postLabelFor = (value) => ADMINISTRATIVE_POSTS.find((post) => post.value === value)?.label || value;
const titleCase = (value = "") => String(value).replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const auditorRoleForForm = (form) => `${form.category}-${form.auditorType}-auditor`;
const roleForForm = (form) => form.accountType === "auditor"
  ? auditorRoleForForm(form)
  : form.category === "academic"
    ? "director"
    : "administrative";
const designationForForm = (form) => {
  if (form.accountType === "auditor") return `${titleCase(form.auditorType)} ${titleCase(form.category)} Auditor`;
  return form.category === "academic" ? "Director" : postLabelFor(form.post);
};

const formatDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);

function validate(form) {
  const errors = {};
  if (!form.category) errors.category = "Select Academic or Administrative.";
  if (form.accountType === "auditor" && !form.auditorType) errors.auditorType = "Select Internal or External auditor.";
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

function validateEdit(form) {
  const errors = {};
  if (!form.category) errors.category = "Select Academic or Administrative.";
  if (form.accountType === "auditor" && !form.auditorType) errors.auditorType = "Select Internal or External auditor.";
  if (form.category === "academic" && !form.school) errors.school = "Select a school.";
  if (form.category === "administrative" && !form.post) errors.post = "Select an administrative post.";
  if (!form.name.trim()) errors.name = "Enter the user's name.";
  if (!form.email.trim()) errors.email = "Enter an email address.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (form.password && form.password.length < 6) errors.password = "Password must contain at least 6 characters.";
  if (form.password && form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

const editFormFromUser = (user = {}) => {
  const category = user.category === "administrative" ? "administrative" : "academic";
  const postValue = ADMINISTRATIVE_POSTS.find((post) =>
    post.value === user.post || post.label === user.post || post.label === user.assignment || post.value === user.designation
  )?.value || "";

  return {
    accountType: user.accountType === "auditor" ? "auditor" : "user",
    category,
    auditorType: user.accountType === "auditor" ? (user.auditorType || "internal") : "",
    school: category === "academic" ? (user.school || user.schoolName || user.assignment || "") : "",
    post: category === "administrative" ? postValue : "",
    name: user.name === "-" ? "" : user.name || "",
    email: user.email === "-" ? "" : user.email || "",
    password: "",
    confirmPassword: "",
  };
};

export default function UserManagementPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");
  const [loadNotice, setLoadNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editErrors, setEditErrors] = useState({});
  const [updatingId, setUpdatingId] = useState("");

  const schools = useMemo(() => SCHOOL_OPTIONS, []);
  const userStats = useMemo(() => ({
    total: users.length,
    academic: users.filter((user) => user.category === "academic").length,
    administrative: users.filter((user) => user.category === "administrative").length,
    auditors: users.filter((user) => user.accountType === "auditor").length,
    active: users.filter((user) => user.status === "active").length,
  }), [users]);

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
      ...(field === "accountType" ? { category: "", auditorType: "", school: "", post: "" } : {}),
      ...(field === "category" ? { school: "", post: "" } : {}),
    }));
    setErrors((current) => ({
      ...current,
      [field]: "",
      ...(field === "accountType" ? { category: "", auditorType: "", school: "", post: "" } : {}),
      ...(field === "category" ? { school: "", post: "" } : {}),
    }));
    setStatus("");
  };

  const openCreateForm = (accountType) => {
    setForm({ ...emptyForm, accountType });
    setErrors({});
    setStatus("");
    setShowForm(true);
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
      accountType: form.accountType,
      userType: form.accountType,
      category: form.category,
      auditCategory: form.category,
      auditorType: form.accountType === "auditor" ? form.auditorType : null,
      auditorRole: form.accountType === "auditor" ? auditorRoleForForm(form) : null,
      role: roleForForm(form),
      school: isAcademic ? form.school : "Administrative Office",
      designation: designationForForm(form),
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
      setStatus(`${form.accountType === "auditor" ? "Auditor" : "User"} account created successfully.`);
      setForm(emptyForm);
      setErrors({});
      setShowForm(false);
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not create the user. The backend should provide POST /api/users."));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (user) => {
    setEditTarget(user);
    setEditForm(editFormFromUser(user));
    setEditErrors({});
    setStatus("");
  };

  const closeEdit = () => {
    setEditTarget(null);
    setEditForm(emptyForm);
    setEditErrors({});
  };

  const updateEditField = (field, value) => {
    setEditForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "accountType" ? { category: "", auditorType: "", school: "", post: "" } : {}),
      ...(field === "category" ? { school: "", post: "" } : {}),
      ...(field === "password" && !value ? { confirmPassword: "" } : {}),
    }));
    setEditErrors((current) => ({
      ...current,
      [field]: "",
      ...(field === "accountType" ? { category: "", auditorType: "", school: "", post: "" } : {}),
      ...(field === "category" ? { school: "", post: "" } : {}),
    }));
    setStatus("");
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;

    setDeletingId(deleteTarget.id);
    setStatus("");

    try {
      await deleteUser(deleteTarget.id);
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id));
      setStatus(`${deleteTarget.name} deleted successfully.`);
      setDeleteTarget(null);
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not delete the user. The backend should provide DELETE /api/users/:id."));
    } finally {
      setDeletingId("");
    }
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    if (!editTarget?.id) return;

    const nextErrors = validateEdit(editForm);
    setEditErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const isAcademic = editForm.category === "academic";
    const payload = {
      accountType: editForm.accountType,
      userType: editForm.accountType,
      category: editForm.category,
      auditCategory: editForm.category,
      auditorType: editForm.accountType === "auditor" ? editForm.auditorType : null,
      auditorRole: editForm.accountType === "auditor" ? auditorRoleForForm(editForm) : null,
      role: roleForForm(editForm),
      school: isAcademic ? editForm.school : "Administrative Office",
      designation: designationForForm(editForm),
      post: isAcademic ? null : editForm.post,
      name: editForm.name.trim(),
      email: editForm.email.trim().toLowerCase(),
      ...(editForm.password ? { password: editForm.password } : {}),
    };

    setUpdatingId(editTarget.id);
    setStatus("");

    try {
      const { data } = await updateUser(editTarget.id, payload);
      const updated = data?.data?.user || data?.user || data?.data || data || payload;
      setUsers((current) =>
        current.map((user) => user.id === editTarget.id ? normalizeUser({ ...user, ...payload, ...updated }) : user)
      );
      setStatus(`${payload.name} updated successfully.`);
      closeEdit();
    } catch (error) {
      setStatus(getApiErrorMessage(error, "Could not update the user. The backend should provide PUT /api/users/:id."));
    } finally {
      setUpdatingId("");
    }
  };

  const handlePrintUsers = () => {
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <section style={styles.panel}>
      <div className="user-management-heading" style={styles.headingRow}>
        <div>
          <p style={styles.kicker}>IQAC access only</p>
          <h2 style={styles.title}>User Management</h2>
          <p style={styles.description}>View Academic, Administrative and auditor accounts or create a new account.</p>
        </div>
        <div style={styles.headingActions}>
          <button type="button" className="btn btn-secondary user-management-no-print" onClick={handlePrintUsers} disabled={loading || !users.length}>
            <span aria-hidden="true">⎙</span>
            Print Users
          </button>
          <button type="button" className="btn btn-primary user-management-no-print" onClick={() => showForm ? closeForm() : openCreateForm("user")}>
            {showForm ? "Close Form" : "+ Add New User"}
          </button>
        </div>
      </div>

      {showForm && (
        <form style={styles.formCard} onSubmit={handleCreate}>
          <div style={styles.formHeading}>
            <div>
              <h3 style={styles.formTitle}>Create {form.accountType === "auditor" ? "Auditor" : "User"} Credentials</h3>
              <span style={styles.formHint}>Fill assignment details first, then enter login credentials.</span>
            </div>
            <span style={form.accountType === "auditor" ? styles.auditorPill : styles.userPill}>
              {form.accountType === "auditor" ? "Auditor Account" : "Regular User"}
            </span>
          </div>

          <div style={styles.formSection}>
            <div style={styles.formSectionHeader}>
              <h4 style={styles.sectionTitle}>Assignment Details</h4>
              <span style={styles.sectionHint}>{form.accountType === "auditor" ? "Set audit category and auditor type." : "Set user category and assignment."}</span>
            </div>
            <div className="user-management-field-grid" style={styles.fieldGrid}>
              <Field label="Account Type">
                <select className="audit-control" style={styles.control} value={form.accountType} onChange={(event) => updateField("accountType", event.target.value)}>
                  <option value="user">Regular User</option>
                  <option value="auditor">Auditor</option>
                </select>
              </Field>

              <Field label={form.accountType === "auditor" ? "Audit Category" : "User Category"} error={errors.category}>
                <select className="audit-control" style={styles.control} value={form.category} onChange={(event) => updateField("category", event.target.value)}>
                  <option value="">Select category</option>
                  <option value="academic">Academic</option>
                  <option value="administrative">Administrative</option>
                </select>
              </Field>

              {form.accountType === "auditor" && (
                <Field label="Auditor Type" error={errors.auditorType}>
                  <select className="audit-control" style={styles.control} value={form.auditorType} onChange={(event) => updateField("auditorType", event.target.value)}>
                    <option value="">Select auditor type</option>
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                  </select>
                </Field>
              )}

              {form.category === "academic" && (
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
              )}

              {form.category === "administrative" && (
                <Field label="Administrative Post" error={errors.post}>
                  <select className="audit-control" style={styles.control} value={form.post} onChange={(event) => updateField("post", event.target.value)}>
                    <option value="">Select post</option>
                    {ADMINISTRATIVE_POSTS.map((post) => <option key={post.value} value={post.value}>{post.label}</option>)}
                  </select>
                </Field>
              )}
            </div>
          </div>

          <div style={styles.formSection}>
            <div style={styles.formSectionHeader}>
              <h4 style={styles.sectionTitle}>Credential Details</h4>
              <span style={styles.sectionHint}>These details will be used for login.</span>
            </div>
            <div className="user-management-field-grid" style={styles.fieldGrid}>
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
          </div>

          <div style={styles.formActions}>
            <button type="button" className="btn btn-secondary" onClick={closeForm}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={creating || !form.category || (form.accountType === "auditor" && !form.auditorType)}>
              {creating ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>
      )}

      {status && <div style={status.includes("successfully") ? styles.successNotice : styles.errorNotice}>{status}</div>}
      {loadNotice && <div style={styles.apiNotice}>{loadNotice}</div>}

      <div style={styles.tableCard}>
        <div style={styles.tableHeading}>
          <div>
            <h3 style={styles.formTitle}>All Users</h3>
            <p style={styles.tableSubtext}>Manage every Academic, Administrative, auditor and authority account from one place.</p>
          </div>
          <div style={styles.tableBadges}>
            <span style={styles.count}>{userStats.total} users</span>
            <span style={styles.count}>{userStats.auditors} auditors</span>
            <span style={styles.printHint}>Print-ready report available</span>
          </div>
        </div>

        <div style={styles.scroller}>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Name", "Email", "Account", "Category", "School / Post", "Role", "Status", "Action"].map((column) => (
                  <th key={column} style={styles.th}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={styles.emptyCell}>Loading users...</td></tr>
              ) : users.length ? users.map((user) => (
                <tr key={user.id}>
                  <td style={styles.td}><strong>{user.name}</strong></td>
                  <td style={styles.td}>{user.email}</td>
                  <td style={{ ...styles.td, ...styles.centerCell }}>
                    <span style={user.accountType === "auditor" ? styles.auditorPill : styles.userPill}>
                      {user.accountType === "auditor" ? `${titleCase(user.auditorType)} Auditor` : "User"}
                    </span>
                  </td>
                  <td style={{ ...styles.td, ...styles.centerCell }}><span style={styles.categoryPill}>{user.category}</span></td>
                  <td style={styles.td}>{user.assignment}</td>
                  <td style={{ ...styles.td, ...styles.centerCell }}>{user.role}</td>
                  <td style={{ ...styles.td, ...styles.centerCell }}><span style={user.status === "active" ? styles.activeStatus : styles.inactiveStatus}>{user.status}</span></td>
                  <td style={{ ...styles.td, ...styles.actionCell }}>
                    <div style={styles.actionGroup}>
                      <button
                        type="button"
                        className="user-management-action-button user-management-action-button--edit"
                        style={styles.editButton}
                        onClick={() => openEdit(user)}
                        disabled={updatingId === user.id}
                        aria-label={`Edit ${user.name}`}
                        title={`Edit ${user.name}`}
                      >
                        <span style={styles.editIcon} aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M4 16.5V20h3.5L18.1 9.4l-3.5-3.5L4 16.5Z" fill="currentColor" />
                            <path d="m16 4.5 1.2-1.2a1.7 1.7 0 0 1 2.4 0l1.1 1.1a1.7 1.7 0 0 1 0 2.4L19.5 8 16 4.5Z" fill="currentColor" opacity=".75" />
                          </svg>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="user-management-action-button user-management-action-button--delete"
                        style={styles.deleteButton}
                        onClick={() => setDeleteTarget(user)}
                        disabled={deletingId === user.id}
                        aria-label={`Delete ${user.name}`}
                        title={`Delete ${user.name}`}
                      >
                        <span style={styles.deleteIcon} aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M9 3h6l1 2h4v2H4V5h4l1-2Z" fill="currentColor" />
                            <path d="M6.5 9h11l-.7 10.2A2 2 0 0 1 14.8 21H9.2a2 2 0 0 1-2-1.8L6.5 9Z" fill="currentColor" opacity=".78" />
                          </svg>
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" style={styles.emptyCell}>No users are available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteTarget && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div style={styles.modalCard}>
            <div style={styles.warningIcon}>!</div>
            <div>
              <p style={styles.kicker}>Delete user</p>
              <h3 id="delete-user-title" style={styles.modalTitle}>Remove this account?</h3>
              <p style={styles.modalText}>
                This will delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email}) from user management.
              </p>
              <div style={styles.deleteUserPreview}>
                <span style={styles.previewAvatar}>{deleteTarget.name?.charAt(0)?.toUpperCase() || "U"}</span>
                <span>
                  <strong>{deleteTarget.name}</strong>
                  <small style={styles.previewMeta}>{deleteTarget.role} · {deleteTarget.assignment}</small>
                </span>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingId === deleteTarget.id}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.confirmDeleteButton}
                onClick={handleDelete}
                disabled={deletingId === deleteTarget.id}
              >
                {deletingId === deleteTarget.id ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div style={styles.editOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
          <form style={styles.editModalCard} onSubmit={handleUpdate}>
            <div style={styles.editModalHeader}>
              <span style={styles.editModalIcon} aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 16.5V20h3.5L18.1 9.4l-3.5-3.5L4 16.5Z" fill="currentColor" />
                  <path d="m16 4.5 1.2-1.2a1.7 1.7 0 0 1 2.4 0l1.1 1.1a1.7 1.7 0 0 1 0 2.4L19.5 8 16 4.5Z" fill="currentColor" opacity=".75" />
                </svg>
              </span>
              <div>
                <p style={styles.kicker}>Edit user</p>
                <h3 id="edit-user-title" style={styles.modalTitle}>Update account details</h3>
                <p style={styles.modalText}>Correct wrong school/post, name, email or reset password if needed.</p>
              </div>
            </div>

            <div style={styles.formSection}>
              <div style={styles.formSectionHeader}>
                <h4 style={styles.sectionTitle}>Assignment Details</h4>
                <span style={styles.sectionHint}>Update account type, category and assignment.</span>
              </div>
              <div style={styles.editFieldGrid}>
                <Field label="Account Type">
                  <select className="audit-control" style={styles.control} value={editForm.accountType} onChange={(event) => updateEditField("accountType", event.target.value)}>
                    <option value="user">Regular User</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </Field>

                <Field label={editForm.accountType === "auditor" ? "Audit Category" : "User Category"} error={editErrors.category}>
                  <select className="audit-control" style={styles.control} value={editForm.category} onChange={(event) => updateEditField("category", event.target.value)}>
                    <option value="">Select category</option>
                    <option value="academic">Academic</option>
                    <option value="administrative">Administrative</option>
                  </select>
                </Field>

                {editForm.accountType === "auditor" && (
                  <Field label="Auditor Type" error={editErrors.auditorType}>
                    <select className="audit-control" style={styles.control} value={editForm.auditorType} onChange={(event) => updateEditField("auditorType", event.target.value)}>
                      <option value="">Select auditor type</option>
                      <option value="internal">Internal</option>
                      <option value="external">External</option>
                    </select>
                  </Field>
                )}

                {editForm.category === "academic" && (
                <Field label="School" error={editErrors.school}>
                  <select className="audit-control" style={styles.control} value={editForm.school} onChange={(event) => updateEditField("school", event.target.value)}>
                    <option value="">Select school</option>
                    {schools.map((school) => (
                      <option key={school.name} value={school.name}>
                        {school.name}{school.code ? ` (${school.code})` : ""}
                      </option>
                    ))}
                  </select>
                </Field>
                )}

                {editForm.category === "administrative" && (
                <Field label="Administrative Post" error={editErrors.post}>
                  <select className="audit-control" style={styles.control} value={editForm.post} onChange={(event) => updateEditField("post", event.target.value)}>
                    <option value="">Select post</option>
                    {ADMINISTRATIVE_POSTS.map((post) => <option key={post.value} value={post.value}>{post.label}</option>)}
                  </select>
                </Field>
                )}
              </div>
            </div>

            <div style={styles.formSection}>
              <div style={styles.formSectionHeader}>
                <h4 style={styles.sectionTitle}>Credential Details</h4>
                <span style={styles.sectionHint}>Leave password blank to keep the existing password.</span>
              </div>
              <div style={styles.editFieldGrid}>
              <Field label="Name" error={editErrors.name}>
                <input className="audit-control" style={styles.control} value={editForm.name} onChange={(event) => updateEditField("name", event.target.value)} placeholder="Enter full name" />
              </Field>

              <Field label="Email ID" error={editErrors.email}>
                <input className="audit-control" style={styles.control} type="email" value={editForm.email} onChange={(event) => updateEditField("email", event.target.value)} placeholder="name@dypiu.ac.in" />
              </Field>

              <Field label="New Password (Optional)" error={editErrors.password}>
                <input className="audit-control" style={styles.control} type="password" value={editForm.password} onChange={(event) => updateEditField("password", event.target.value)} placeholder="Leave blank to keep existing password" />
              </Field>

              <Field label="Confirm New Password" error={editErrors.confirmPassword}>
                <input className="audit-control" style={styles.control} type="password" value={editForm.confirmPassword} onChange={(event) => updateEditField("confirmPassword", event.target.value)} placeholder="Required only when changing password" disabled={!editForm.password} />
              </Field>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button type="button" className="btn btn-secondary" onClick={closeEdit} disabled={updatingId === editTarget.id}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={updatingId === editTarget.id}>
                {updatingId === editTarget.id ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      <PrintableUsersReport users={users} stats={userStats} />
    </section>
  );
}

function PrintableUsersReport({ users, stats }) {
  return (
    <section className="user-report-print-area" aria-hidden="true">
      <div className="user-report-sheet">
        <header className="user-report-cover">
          <div>
            <p>DY Patil International University, Akurdi Pune</p>
            <h1>User Management Register</h1>
            <span>IQAC Administrative Access Report</span>
          </div>
          <div className="user-report-date">
            <small>Generated on</small>
            <strong>{formatDate()}</strong>
          </div>
        </header>

        <div className="user-report-summary">
          <ReportStat label="Total Users" value={stats.total} />
          <ReportStat label="Academic" value={stats.academic} />
          <ReportStat label="Administrative" value={stats.administrative} />
          <ReportStat label="Auditors" value={stats.auditors} />
        </div>

        <div className="user-report-section-heading">
          <span>01</span>
          <div>
            <h2>All Registered Users</h2>
            <p>Complete list of accounts configured for the appraisal portal.</p>
          </div>
        </div>

        <table className="user-report-table">
          <thead>
            <tr>
              <th>Sr No</th>
              <th>Name</th>
              <th>Email</th>
              <th>Account</th>
              <th>Category</th>
              <th>School / Post</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.length ? users.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.accountType === "auditor" ? `${titleCase(user.auditorType)} Auditor` : "User"}</td>
                <td>{user.category}</td>
                <td>{user.assignment}</td>
                <td>{user.role}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7">No users are available.</td>
              </tr>
            )}
          </tbody>
        </table>

        <footer className="user-report-footer">
          <span>Prepared by IQAC</span>
          <span>School Appraisal Portal</span>
        </footer>
      </div>
    </section>
  );
}

function ReportStat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
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
  headingActions: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  kicker: { margin: "0 0 5px", color: "#2563eb", fontSize: 10, fontWeight: 750, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { margin: "0 0 5px", color: "#0f172a", fontSize: 20, fontWeight: 700 },
  description: { margin: 0, color: "#64748b", fontSize: 12.5 },
  formCard: { display: "flex", flexDirection: "column", gap: 18, padding: 20, border: "1px solid #e2e8f0", borderRadius: 16, background: "#fff", boxShadow: "0 12px 35px rgba(15,23,42,.045)" },
  formHeading: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 14, borderBottom: "1px solid #edf1f6" },
  formTitle: { margin: 0, color: "#0f172a", fontSize: 17, fontWeight: 700 },
  formHint: { color: "#64748b", fontSize: 11 },
  formSection: { display: "flex", flexDirection: "column", gap: 14, padding: 16, border: "1px solid #e5ebf3", borderRadius: 12, background: "#fbfcfe" },
  formSectionHeader: { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, paddingBottom: 10, borderBottom: "1px solid #edf1f6" },
  sectionTitle: { margin: 0, color: "#0f172a", fontSize: 13, fontWeight: 800 },
  sectionHint: { color: "#64748b", fontSize: 11.5 },
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
  tableSubtext: { margin: "5px 0 0", color: "#64748b", fontSize: 11.5 },
  tableBadges: { display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" },
  count: { padding: "5px 8px", borderRadius: 999, color: "#475569", background: "#f1f5f9", fontSize: 10.5, fontWeight: 700 },
  printHint: { padding: "5px 8px", borderRadius: 999, color: "#1d4ed8", background: "#eff6ff", fontSize: 10.5, fontWeight: 750 },
  scroller: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: { padding: "10px 11px", borderRight: "1px solid #3a465b", color: "#f8fafc", background: "#1e293b", fontSize: 11.5, fontWeight: 700, textAlign: "left" },
  td: { padding: "11px", borderRight: "1px solid #dfe5ec", borderBottom: "1px solid #dfe5ec", color: "#334155", fontSize: 12, overflowWrap: "anywhere" },
  centerCell: { textAlign: "center", verticalAlign: "middle" },
  actionCell: { width: 96, textAlign: "center" },
  emptyCell: { padding: 28, color: "#64748b", fontSize: 12, textAlign: "center" },
  categoryPill: { textTransform: "capitalize", color: "#1d4ed8", fontWeight: 700 },
  userPill: { display: "inline-flex", padding: "4px 7px", borderRadius: 999, color: "#475569", background: "#f1f5f9", fontSize: 10.5, fontWeight: 750, textTransform: "capitalize" },
  auditorPill: { display: "inline-flex", padding: "4px 7px", borderRadius: 999, color: "#7c2d12", background: "#ffedd5", fontSize: 10.5, fontWeight: 750, textTransform: "capitalize" },
  activeStatus: { display: "inline-flex", padding: "4px 7px", borderRadius: 999, color: "#166534", background: "#dcfce7", fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" },
  inactiveStatus: { display: "inline-flex", padding: "4px 7px", borderRadius: 999, color: "#991b1b", background: "#fee2e2", fontSize: 10.5, fontWeight: 700, textTransform: "capitalize" },
  actionGroup: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 0, padding: 3, border: "1px solid #dbe4f0", borderRadius: 12, background: "#f8fafc", boxShadow: "inset 0 1px 0 rgba(255,255,255,.9)" },
  editButton: { width: 34, height: 32, display: "grid", placeItems: "center", border: 0, borderRight: "1px solid #e2e8f0", borderRadius: "9px 0 0 9px", color: "#2563eb", background: "transparent", cursor: "pointer", fontFamily: "inherit" },
  editIcon: { width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 8, color: "inherit", background: "transparent", flex: "0 0 auto" },
  deleteButton: { width: 34, height: 32, display: "grid", placeItems: "center", border: 0, borderRadius: "0 9px 9px 0", color: "#dc2626", background: "transparent", cursor: "pointer", fontFamily: "inherit" },
  deleteIcon: { width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 8, color: "inherit", background: "transparent", flex: "0 0 auto" },
  modalOverlay: { position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .52)", backdropFilter: "blur(4px)" },
  modalCard: { width: "min(460px, 100%)", display: "grid", gridTemplateColumns: "48px 1fr", gap: 15, padding: 22, borderRadius: 22, border: "1px solid #fee2e2", background: "linear-gradient(180deg, #fff 0%, #fffafa 100%)", boxShadow: "0 28px 80px rgba(15,23,42,.22)" },
  warningIcon: { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 16, color: "#b91c1c", background: "linear-gradient(135deg, #fee2e2, #fecaca)", fontSize: 21, fontWeight: 900, boxShadow: "inset 0 0 0 1px rgba(185,28,28,.08)" },
  modalTitle: { margin: "0 0 8px", color: "#0f172a", fontSize: 18, fontWeight: 800 },
  modalText: { margin: 0, color: "#475569", fontSize: 13, lineHeight: 1.55 },
  deleteUserPreview: { display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: 10, border: "1px solid #fee2e2", borderRadius: 14, background: "#fff", color: "#0f172a", fontSize: 12 },
  previewAvatar: { width: 34, height: 34, display: "grid", placeItems: "center", borderRadius: 12, color: "#fff", background: "linear-gradient(135deg, #ef4444, #f97316)", fontWeight: 900 },
  previewMeta: { display: "block", marginTop: 2, color: "#64748b", fontSize: 11 },
  modalActions: { gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 },
  confirmDeleteButton: { border: "1px solid #dc2626", borderRadius: 10, padding: "10px 14px", color: "#fff", background: "linear-gradient(135deg, #ef4444, #b91c1c)", fontSize: 12.5, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 10px 24px rgba(220, 38, 38, .22)" },
  editOverlay: { position: "fixed", inset: 0, zIndex: 78, display: "grid", placeItems: "center", padding: 20, background: "rgba(15, 23, 42, .48)", backdropFilter: "blur(4px)", overflowY: "auto" },
  editModalCard: { width: "min(780px, 100%)", display: "flex", flexDirection: "column", gap: 16, padding: 22, border: "1px solid #dbeafe", borderRadius: 22, background: "linear-gradient(180deg, #fff 0%, #f8fbff 100%)", boxShadow: "0 28px 80px rgba(15,23,42,.22)" },
  editModalHeader: { display: "flex", alignItems: "flex-start", gap: 14, paddingBottom: 14, borderBottom: "1px solid #e2e8f0" },
  editModalIcon: { width: 46, height: 46, flex: "0 0 46px", display: "grid", placeItems: "center", borderRadius: 16, color: "#1d4ed8", background: "linear-gradient(135deg, #dbeafe, #bfdbfe)", boxShadow: "inset 0 0 0 1px rgba(37,99,235,.08)" },
  editCategoryGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  editFieldGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: "15px 14px" },
};
