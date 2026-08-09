import { useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../../../api/client";
import { changeCurrentUserPassword, fetchCurrentUser, updateCurrentUser, uploadCurrentUserAvatar } from "../../../api/users";

function initialsFromName(name = "") {
  return name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 12, height: 12 }}>
      <rect x="5" y="10.5" width="14" height="9" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function LockedProfileField({ label, value }) {
  return (
    <div style={styles.readOnlyField}>
      <span style={styles.lockedLabelRow}>
        <LockIcon />
        {label}
      </span>
      <div style={styles.lockedValue} title="Contact an administrator to change this">{value}</div>
    </div>
  );
}

function ChangePasswordSection() {
  const [expanded, setExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const resetFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleUpdatePassword = async () => {
    setError("");
    setSuccess("");
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill in all three fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }
    setSaving(true);
    try {
      await changeCurrentUserPassword({ currentPassword, newPassword });
      setSuccess("Password updated.");
      resetFields();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't update your password. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.passwordSection}>
      <button
        type="button"
        style={styles.passwordToggleButton}
        onClick={() => {
          setExpanded((open) => !open);
          setError("");
          setSuccess("");
        }}
      >
        Change password
        <span style={styles.passwordToggleChevron}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div style={{ ...styles.profileModalFields, marginTop: 14, marginBottom: 0 }}>
          <label style={styles.readOnlyField}>
            <span style={styles.readOnlyLabel}>Current password</span>
            <input
              style={styles.editableInput}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>
          <label style={styles.readOnlyField}>
            <span style={styles.readOnlyLabel}>New password</span>
            <input
              style={styles.editableInput}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </label>
          <label style={styles.readOnlyField}>
            <span style={styles.readOnlyLabel}>Confirm new password</span>
            <input
              style={styles.editableInput}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>

          {error && <p style={styles.profileModalError}>{error}</p>}
          {success && <p style={styles.passwordSuccessText}>{success}</p>}

          <button type="button" style={styles.saveButton} onClick={handleUpdatePassword} disabled={saving}>
            {saving ? "Updating..." : "Update password"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function UserProfileModal({ profile, onClose, onSaved }) {
  const [name, setName] = useState(profile.name || "");
  const [email, setEmail] = useState(profile.email || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
  const [avatarPreview, setAvatarPreview] = useState(profile.avatarUrl || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    let isActive = true;
    fetchCurrentUser()
      .then(({ data }) => {
        if (!isActive) return;
        const remote = data?.data || data || {};
        if (remote.name) setName(remote.name);
        if (remote.email) setEmail(remote.email);
        if (remote.avatarUrl) {
          setAvatarUrl(remote.avatarUrl);
          setAvatarPreview(remote.avatarUrl);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isActive) setLoadingProfile(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      let nextAvatarUrl = avatarUrl;
      if (avatarFile) {
        nextAvatarUrl = (await uploadCurrentUserAvatar(avatarFile)) || avatarUrl;
      }
      await updateCurrentUser({ name, email });
      onSaved({ name, email, avatarUrl: nextAvatarUrl });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Couldn't save your profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.profileModal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalTitle}>My Profile</div>

        <div style={styles.profileModalAvatarRow}>
          <div style={styles.profileModalAvatar}>
            {avatarPreview ? (
              <img src={avatarPreview} alt="" style={styles.profileModalAvatarImg} />
            ) : (
              <span>{initialsFromName(name) || "?"}</span>
            )}
          </div>
          <div>
            <button type="button" style={styles.uploadButton} onClick={() => fileInputRef.current?.click()}>
              Change photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={styles.hiddenFileInput}
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <div style={styles.profileModalFields}>
          <label style={styles.readOnlyField}>
            <span style={styles.readOnlyLabel}>Name</span>
            <input style={styles.editableInput} value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label style={styles.readOnlyField}>
            <span style={styles.readOnlyLabel}>Email</span>
            <input
              style={styles.editableInput}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <LockedProfileField label="Role" value={profile.designation || profile.role} />
          {profile.school && <LockedProfileField label="School" value={profile.school} />}
        </div>

        {error && <p style={styles.profileModalError}>{error}</p>}

        <div style={styles.modalActions}>
          <button type="button" onClick={onClose} style={styles.cancelButton} disabled={saving}>Cancel</button>
          <button type="button" onClick={handleSave} style={styles.saveButton} disabled={saving || loadingProfile}>
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>

        <ChangePasswordSection />
      </div>
    </div>
  );
}

const styles = {
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.62)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "grid",
    placeItems: "center",
    padding: 18,
  },
  profileModal: {
    width: "min(420px, 92vw)",
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
  profileModalAvatarRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
  },
  profileModalAvatar: {
    width: 64,
    height: 64,
    flex: "0 0 64px",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    borderRadius: "50%",
    color: "#1e3a8a",
    background: "linear-gradient(145deg, #dbeafe, #93c5fd)",
    fontSize: 20,
    fontWeight: 800,
  },
  profileModalAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    border: "1px solid #2563eb",
    borderRadius: 9,
    padding: "9px 13px",
    color: "#fff",
    background: "#2563eb",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 800,
    fontFamily: "inherit",
  },
  hiddenFileInput: {
    display: "none",
  },
  profileModalFields: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    marginBottom: 18,
  },
  readOnlyField: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  readOnlyLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  editableInput: {
    width: "100%",
    minHeight: 42,
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#0f172a",
    background: "#fff",
    outline: "none",
    fontSize: 12.5,
    lineHeight: 1.45,
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  lockedLabelRow: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  lockedValue: {
    width: "100%",
    minHeight: 42,
    display: "flex",
    alignItems: "center",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#94a3b8",
    background: "#f1f5f9",
    fontSize: 12.5,
    lineHeight: 1.45,
    cursor: "not-allowed",
    boxSizing: "border-box",
  },
  profileModalError: {
    margin: "12px 0 0",
    color: "#dc2626",
    fontSize: 12.5,
    lineHeight: 1.5,
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
    fontFamily: "inherit",
  },
  saveButton: {
    flex: 1,
    border: "none",
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    padding: 10,
    fontWeight: 900,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  passwordSection: {
    marginTop: 20,
    paddingTop: 18,
    borderTop: "1px solid #e2e8f0",
  },
  passwordToggleButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    border: "none",
    background: "transparent",
    padding: 0,
    color: "#0f172a",
    fontSize: 13.5,
    fontWeight: 750,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  passwordToggleChevron: {
    color: "#2563eb",
    fontSize: 16,
    fontWeight: 800,
  },
  passwordSuccessText: {
    margin: "12px 0 0",
    color: "#16a34a",
    fontSize: 12.5,
    lineHeight: 1.5,
  },
};
