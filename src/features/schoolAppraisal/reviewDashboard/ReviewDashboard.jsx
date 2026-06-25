import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../../../api/client";
import {
  SIGN_OFF_FIELD,
  fetchAllSubmissions,
  fetchSubmissionById,
  getSubmissionSignOff,
  parseSubmissionFormData,
  reviewSubmission,
  withApproverSignOff,
} from "../../../api/submissions";
import universityLogo from "../../../assets/images/image.png";
import AppSidebar from "../components/AppSidebar";
import AuditReportPanel from "../components/AuditReportPanel";
import { columnsWithSerial } from "../components/tableHelpers";
import { administrativeAuditMeta, administrativeAuditModules } from "../administrativeAudit/administrativeAuditConfig";
import AdministrativeReportPanel from "../administrativeAudit/AdministrativeReportPanel";
import { academicAudit2025Schema } from "../formSchemas";
import UserManagementPanel from "../userManagement/UserManagementPanel";

const REVIEW_NAV_ITEMS = [
  { id: "overview", title: "Overview" },
  { id: "advanced-overview", title: "Advanced Overview" },
  { id: "academic", title: "Academic Audit" },
  { id: "administrative", title: "Administrative Audit" },
];
const USER_MANAGEMENT_NAV_ITEM = { id: "user-management", title: "User Management" };

const REVIEW_ROLE_CONFIG = {
  "vice-chancellor": {
    badge: "VC",
    title: "Vice Chancellor Dashboard",
    roleTitle: "Vice Chancellor",
    roleText: "School Appraisal Review",
  },
  iqac: {
    badge: "IQ",
    title: "IQAC Dashboard",
    roleTitle: "IQAC",
    roleText: "School Appraisal Review",
  },
};

const SCHOOL_GROUPS = {
  engineering: "Engineering",
  nonEngineering: "Non-Engineering",
  all: "All Schools",
};

const statusLabels = {
  submitted: "Submitted",
  "under-review": "Under Review",
  approved: "Approved",
  "sent-back": "Sent Back",
};

const statusStyles = {
  submitted: { color: "#1d4ed8", background: "#dbeafe", border: "#bfdbfe" },
  "under-review": { color: "#92400e", background: "#fef3c7", border: "#fde68a" },
  approved: { color: "#166534", background: "#dcfce7", border: "#bbf7d0" },
  "sent-back": { color: "#991b1b", background: "#fee2e2", border: "#fecaca" },
};

const auditLabels = {
  academic: "Academic Audit",
  administrative: "Administrative Audit",
};

const groupTabs = [
  { id: "all", label: "All Schools" },
  { id: "engineering", label: "Engineering" },
  { id: "nonEngineering", label: "Non-Engineering" },
];

const initialsFor = (name = "") => name.split(" ").filter(Boolean).map((word) => word[0]).join("").slice(0, 2).toUpperCase();
const isAttachmentValue = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (value.url || value.publicUrl || value.downloadUrl || value.name || value.fileName);

const blocksFor = (section) =>
  section.blocks || [
    ...(section.fields?.length ? [{ type: "fields", fields: section.fields }] : []),
    ...(section.tables?.length ? [{ type: "tables", tables: section.tables }] : []),
  ];

const sectionsForAudit = (auditType) => auditType === "academic" ? academicAudit2025Schema.sections : administrativeAuditModules;

const normalizeAuditType = (value = "") => String(value).toLowerCase().includes("admin") ? "administrative" : "academic";
const normalizeStatus = (value = "submitted") => String(value).toLowerCase().replaceAll("_", "-");
const backendStatusFor = (status) => status.toUpperCase().replaceAll("-", "_");
const responseList = (payload) => {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.submissions)) return data.submissions;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};
const submissionPayload = (payload) => payload?.data?.submission || payload?.data || payload;

const normalizeSubmission = (submission = {}) => {
  const auditType = normalizeAuditType(submission.auditType || submission.type);
  const formData = parseSubmissionFormData(submission);
  const signOff = getSubmissionSignOff(submission, formData.values);
  const values = { ...formData.values, [SIGN_OFF_FIELD]: signOff };

  return {
    ...submission,
    ...formData,
    values,
    id: submission.id || submission.submissionId,
    auditType,
    group: submission.group || submission.schoolGroup || "all",
    school: submission.school || submission.schoolName || submission.department || "School",
    submittedBy: signOff.submittedBy.name || submission.userName || "-",
    submittedByDesignation: signOff.submittedBy.designation || (auditType === "academic" ? "Director" : ""),
    submittedOn: signOff.submittedBy.date || new Date().toISOString(),
    reviewedBy: signOff.approvedBy.name,
    reviewedByDesignation: signOff.approvedBy.designation,
    reviewedByRole: signOff.approvedBy.role,
    reviewedOn: signOff.approvedBy.date,
    sections: submission.sections || sectionsForAudit(auditType),
    attachments: formData.attachments.length ? formData.attachments : submission.attachments || [],
    status: normalizeStatus(submission.status),
    remarks: submission.remarks || "",
  };
};

export default function ReviewDashboard() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState("overview");
  const [activeGroup, setActiveGroup] = useState({ academic: "all", administrative: "all" });
  const [submissions, setSubmissions] = useState({ academic: [], administrative: [] });
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [loadingSubmissionId, setLoadingSubmissionId] = useState("");
  const [reviewingStatus, setReviewingStatus] = useState("");
  const [error, setError] = useState("");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const role = String(sessionStorage.getItem("role") || "iqac").toLowerCase().replaceAll("_", "-");
  const canManageUsers = role === "iqac";
  const roleConfig = REVIEW_ROLE_CONFIG[role] || REVIEW_ROLE_CONFIG.iqac;
  const profile = {
    name: sessionStorage.getItem("name") || roleConfig.roleTitle,
    designation: sessionStorage.getItem("designation") || roleConfig.roleTitle,
    school: sessionStorage.getItem("school") || "D Y Patil International University",
    email: sessionStorage.getItem("email") || sessionStorage.getItem("username") || "",
  };

  const allSubmissions = useMemo(() => [...submissions.academic, ...submissions.administrative], [submissions]);
  const metrics = useMemo(() => buildMetrics(allSubmissions), [allSubmissions]);
  const navigationItems = useMemo(
    () => canManageUsers ? [...REVIEW_NAV_ITEMS, USER_MANAGEMENT_NAV_ITEM] : REVIEW_NAV_ITEMS,
    [canManageUsers],
  );
  const visibleActiveView = !canManageUsers && activeView === "user-management" ? "overview" : activeView;

  useEffect(() => {
    let isActive = true;

    const loadSubmissions = async () => {
      setLoadingSubmissions(true);
      setError("");

      try {
        const { data } = await fetchAllSubmissions();
        const next = { academic: [], administrative: [] };
        responseList(data).map(normalizeSubmission).forEach((submission) => {
          next[submission.auditType].push(submission);
        });

        if (isActive) setSubmissions(next);
      } catch (loadError) {
        if (isActive) setError(getApiErrorMessage(loadError, "Could not load submissions for review."));
      } finally {
        if (isActive) setLoadingSubmissions(false);
      }
    };

    loadSubmissions();

    return () => {
      isActive = false;
    };
  }, []);

  const updateSubmission = (auditType, submissionId, patch) => {
    setSubmissions((current) => {
      const next = {
        ...current,
        [auditType]: current[auditType].map((submission) =>
          submission.id === submissionId ? { ...submission, ...patch } : submission
        ),
      };
      return next;
    });

    setSelectedSubmission((current) =>
      current?.id === submissionId ? { ...current, ...patch } : current
    );
  };

  const openSubmission = async (submission) => {
    setLoadingSubmissionId(submission.id);
    setError("");

    try {
      const { data: detailData } = await fetchSubmissionById(submission.id);
      const detailedSubmission = normalizeSubmission({
        ...submission,
        ...submissionPayload(detailData),
      });
      setSelectedSubmission(detailedSubmission);
    } catch (openError) {
      setError(getApiErrorMessage(openError, "Could not load submission details."));
    } finally {
      setLoadingSubmissionId("");
    }
  };

  const confirmStatusChange = async (submission, status) => {
    const action = status === "approved" ? "approve" : "send back";
    const ok = window.confirm(`Do you want to ${action} ${submission.school} ${auditLabels[submission.auditType]}?`);
    if (!ok) return;

    setReviewingStatus(status);
    setError("");

    try {
      const reviewedOn = new Date().toISOString();
      const reviewer = { ...profile, role };
      const signedValues = status === "approved"
        ? withApproverSignOff(submission.values, reviewer, reviewedOn)
        : submission.values;

      await reviewSubmission(submission.id, {
        status: backendStatusFor(status),
        remarks: submission.remarks,
        ...(status === "approved" ? {
          reviewedBy: profile.name,
          reviewedByDesignation: profile.designation,
          reviewedByRole: role,
          reviewedOn,
        } : {}),
      });

      updateSubmission(submission.auditType, submission.id, {
        status,
        values: signedValues,
        reviewedBy: status === "approved" ? profile.name : submission.reviewedBy,
        reviewedByDesignation: status === "approved" ? profile.designation : submission.reviewedByDesignation,
        reviewedByRole: status === "approved" ? role : submission.reviewedByRole,
        reviewedOn: status === "approved" ? reviewedOn : submission.reviewedOn,
      });

    } catch (reviewError) {
      setError(getApiErrorMessage(reviewError, "Could not update review status."));
    } finally {
      setReviewingStatus("");
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  return (
    <>
      <PrintStyles />
      <div className="review-dashboard-shell" style={styles.shell}>
        <AppSidebar
          title={roleConfig.title}
          subtitle="D Y Patil International University"
          badge={roleConfig.badge}
          roleTitle={roleConfig.roleTitle}
          roleText={roleConfig.roleText}
          academicYear="2025-26"
          items={navigationItems}
          activeId={visibleActiveView}
          onChange={(viewId) => {
            if (viewId === "user-management" && !canManageUsers) return;
            setSelectedSubmission(null);
            setActiveView(viewId);
          }}
          profile={profile}
          onLogout={() => setShowLogoutModal(true)}
        />

        <main className="review-dashboard-main" style={styles.page}>
          {!selectedSubmission && (
            <header style={styles.header}>
              <div style={styles.headerContent}>
                <div style={styles.logoWrap}>
                  <img src={universityLogo} alt="DYPIU Logo" style={styles.logo} />
                </div>
                <div>
                  <p style={styles.kicker}>D Y Patil International University Akurdi Pune</p>
                  <h1 style={styles.title}>{roleConfig.title}</h1>
                  <p style={styles.meta}>School Appraisal Review - Academic Year July, 2025 - June, 2026</p>
                </div>
              </div>
            </header>
          )}

          {selectedSubmission ? (
            <FullFormReview
              submission={selectedSubmission}
              onBack={() => setSelectedSubmission(null)}
              onRemarksChange={(remarks) => updateSubmission(selectedSubmission.auditType, selectedSubmission.id, { remarks })}
              onApprove={() => confirmStatusChange(selectedSubmission, "approved")}
              onSendBack={() => confirmStatusChange(selectedSubmission, "sent-back")}
              reviewingStatus={reviewingStatus}
            />
          ) : visibleActiveView === "overview" ? (
            <OverviewPanel
              metrics={metrics}
              submissions={allSubmissions}
              loading={loadingSubmissions}
              onOpen={(submission) => {
                setActiveView(submission.auditType);
                openSubmission(submission);
              }}
            />
          ) : visibleActiveView === "advanced-overview" ? (
            <AdvancedOverviewPanel metrics={metrics} submissions={allSubmissions} loading={loadingSubmissions} />
          ) : visibleActiveView === "user-management" && canManageUsers ? (
            <UserManagementPanel />
          ) : null}

          {error && <div className="review-error-notice" style={styles.errorNotice}>{error}</div>}
          {loadingSubmissionId && <div style={styles.emptyDraftNotice}>Loading submission details...</div>}

          {!selectedSubmission && visibleActiveView === "academic" && (
            <AuditReviewPanel
              auditType="academic"
              submissions={submissions.academic}
              activeGroup={activeGroup.academic}
              onGroupChange={(group) => setActiveGroup((current) => ({ ...current, academic: group }))}
              onOpen={openSubmission}
              loading={loadingSubmissions}
            />
          )}

          {!selectedSubmission && visibleActiveView === "administrative" && (
            <AuditReviewPanel
              auditType="administrative"
              submissions={submissions.administrative}
              activeGroup={activeGroup.administrative}
              onGroupChange={(group) => setActiveGroup((current) => ({ ...current, administrative: group }))}
              onOpen={openSubmission}
              loading={loadingSubmissions}
            />
          )}
        </main>

        {showLogoutModal && <LogoutModal onCancel={() => setShowLogoutModal(false)} onConfirm={handleLogout} />}
      </div>
    </>
  );
}

function buildMetrics(submissions) {
  return submissions.reduce(
    (metrics, submission) => {
      metrics.total += 1;
      if (metrics[submission.status] != null) metrics[submission.status] += 1;
      if (metrics[submission.auditType] != null) metrics[submission.auditType] += 1;
      return metrics;
    },
    { total: 0, submitted: 0, "under-review": 0, approved: 0, "sent-back": 0, academic: 0, administrative: 0 }
  );
}

function OverviewPanel({ metrics, submissions, loading, onOpen }) {
  const pendingSubmissions = submissions.filter((submission) => submission.status !== "approved");
  const approvalRate = metrics.total ? Math.round((metrics.approved / metrics.total) * 100) : 0;
  const schoolProgress = buildSchoolProgress(submissions);

  return (
    <section style={styles.panel}>
      <div className="review-overview-hero" style={styles.overviewHero}>
        <div style={styles.overviewHeroCopy}>
          <span style={styles.overviewEyebrow}>Review command center</span>
          <h2 className="review-overview-title" style={styles.overviewTitle}>Institutional Audit Overview</h2>
          <p style={styles.overviewDescription}>Track submissions, prioritize pending reviews, and monitor approval progress across every school.</p>
          <div style={styles.overviewHeroPills}>
            <span style={styles.overviewHeroPill}>{metrics.academic} Academic</span>
            <span style={styles.overviewHeroPill}>{metrics.administrative} Administrative</span>
            <span style={styles.overviewHeroPill}>{schoolProgress.length} Schools</span>
          </div>
        </div>
        <div style={{ ...styles.approvalRing, background: `conic-gradient(#38bdf8 ${approvalRate}%, rgba(255,255,255,.16) 0)` }}>
          <div style={styles.approvalRingInner}>
            <strong>{approvalRate}%</strong>
            <span>approved</span>
          </div>
        </div>
      </div>

      <div style={styles.metricGrid}>
        <MetricCard label="Total submissions" value={metrics.total} hint="Across both audit types" tone="blue" />
        <MetricCard label="Pending review" value={metrics.submitted + metrics["under-review"]} hint="Requires reviewer action" tone="amber" />
        <MetricCard label="Approved" value={metrics.approved} hint={`${approvalRate}% completion rate`} tone="green" />
        <MetricCard label="Sent back" value={metrics["sent-back"]} hint="Awaiting school updates" tone="red" />
      </div>

      {loading && <div style={styles.emptyDraftNotice}>Loading submissions...</div>}

      <div className="review-overview-split" style={styles.splitGrid}>
        <div className="app-surface-card" style={styles.card}>
          <span style={styles.cardEyebrow}>Coverage</span>
          <h3 style={styles.cardTitle}>Audit Portfolio</h3>
          <div style={styles.auditSummaryRows}>
            <SummaryRow label="Academic Audit" value={metrics.academic} />
            <SummaryRow label="Administrative Audit" value={metrics.administrative} />
            <SummaryRow label="Engineering Schools" value="4" />
            <SummaryRow label="Non-Engineering Schools" value="4" />
          </div>
        </div>

        <div className="app-surface-card" style={styles.card}>
          <div style={styles.queueHeader}>
            <div><span style={styles.cardEyebrow}>Priority</span><h3 style={styles.cardTitle}>Pending Review Queue</h3></div>
            <span style={styles.queueCount}>{pendingSubmissions.length}</span>
          </div>
          <div style={styles.queueList}>
            {!loading && !pendingSubmissions.length && <div style={styles.emptyDraftNotice}>All available submissions are reviewed.</div>}
            {pendingSubmissions.slice(0, 6).map((submission) => (
              <button className="review-queue-item" key={submission.id} type="button" style={styles.queueItem} onClick={() => onOpen(submission)}>
                <span>
                  <strong>{submission.school}</strong>
                  <small>{auditLabels[submission.auditType]}</small>
                </span>
                <StatusBadge status={submission.status} />
              </button>
            ))}
          </div>
        </div>
      </div>

    </section>
  );
}

function buildSchoolProgress(submissions) {
  return Object.values(submissions.reduce((schools, submission) => {
    const school = submission.school || "Unknown school";
    const current = schools[school] || { school, total: 0, approved: 0, pending: 0 };
    current.total += 1;
    if (submission.status === "approved") current.approved += 1;
    else current.pending += 1;
    schools[school] = current;
    return schools;
  }, {})).sort((a, b) => b.pending - a.pending || a.school.localeCompare(b.school));
}

function AdvancedOverviewPanel({ metrics, submissions, loading }) {
  const schoolProgress = buildSchoolProgress(submissions);
  const approvalRate = metrics.total ? Math.round((metrics.approved / metrics.total) * 100) : 0;

  return (
    <section style={styles.panel}>
      <div style={styles.pageTitleRow}>
        <div style={styles.blueHeading}>
          <span style={styles.cardEyebrow}>Detailed analytics</span>
          <h2 style={styles.sectionTitle}>Advanced Overview</h2>
          <p style={styles.progressIntro}>Expanded review status and school-level completion analysis.</p>
        </div>
        <span style={styles.schoolCount}>{schoolProgress.length} schools</span>
      </div>

      <div style={styles.metricGrid}>
        <MetricCard label="Submitted" value={metrics.submitted} hint="Waiting to enter review" tone="blue" />
        <MetricCard label="Under review" value={metrics["under-review"]} hint="Currently being assessed" tone="amber" />
        <MetricCard label="Approved" value={metrics.approved} hint={`${approvalRate}% overall approval`} tone="green" />
        <MetricCard label="Sent back" value={metrics["sent-back"]} hint="Requires resubmission" tone="red" />
      </div>

      <SchoolProgressPanel schools={schoolProgress} loading={loading} />
    </section>
  );
}

function SchoolProgressPanel({ schools, loading }) {
  return (
    <div className="app-surface-card" style={styles.card}>
      <div style={styles.progressHeader}>
        <div>
          <span style={styles.cardEyebrow}>School analytics</span>
          <h3 style={styles.cardTitle}>School-wise Review Progress</h3>
          <p style={styles.progressIntro}>Approval progress across Academic and Administrative Audit submissions.</p>
        </div>
        <span style={styles.schoolCount}>{schools.length} schools</span>
      </div>
      <div style={styles.schoolProgressList}>
        {!loading && !schools.length && <div style={styles.emptyDraftNotice}>No school submissions available yet.</div>}
        {schools.map((school) => {
          const percentage = school.total ? Math.round((school.approved / school.total) * 100) : 0;
          return (
            <div className="review-school-progress-row" key={school.school} style={styles.schoolProgressRow}>
              <div style={styles.schoolProgressIdentity}>
                <span style={styles.schoolProgressAvatar}>{initialsFor(school.school)}</span>
                <span style={styles.schoolProgressName} title={school.school}>{school.school}</span>
              </div>
              <div style={styles.schoolProgressTrack} aria-label={`${school.school} ${percentage}% approved`}>
                <span style={{ ...styles.schoolProgressBar, width: `${percentage}%` }} />
              </div>
              <strong style={styles.schoolProgressPercent}>{percentage}%</strong>
              <span style={styles.schoolProgressMeta}>{school.approved} approved</span>
              <span style={styles.schoolProgressPending}>{school.pending} pending</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AuditReviewPanel({ auditType, submissions, activeGroup, onGroupChange, onOpen, loading }) {
  const filtered = activeGroup === "all" ? submissions : submissions.filter((submission) => submission.group === activeGroup);
  const counts = {
    all: submissions.length,
    engineering: submissions.filter((submission) => submission.group === "engineering").length,
    nonEngineering: submissions.filter((submission) => submission.group === "nonEngineering").length,
  };

  return (
    <section style={styles.panel}>
      <div style={styles.pageTitleRow}>
        <div style={styles.blueHeading}>
          <h2 style={styles.sectionTitle}>{auditLabels[auditType]} Reviews</h2>
        </div>
        <span style={styles.schoolCount}>{filtered.length} schools</span>
      </div>

      <div style={styles.tabs} role="tablist" aria-label={`${auditLabels[auditType]} school groups`}>
        {groupTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            style={{ ...styles.tab, ...(activeGroup === tab.id ? styles.activeTab : {}) }}
            onClick={() => onGroupChange(tab.id)}
          >
            {tab.label}
            <span style={styles.tabCount}>{counts[tab.id]}</span>
          </button>
        ))}
      </div>

      <div style={styles.reviewList}>
        {loading && <div style={styles.emptyDraftNotice}>Loading submissions...</div>}
        {!loading && !filtered.length && <div style={styles.emptyDraftNotice}>No {auditLabels[auditType]} submissions found.</div>}
        {filtered.map((submission) => (
          <SubmissionCard
            key={submission.id}
            submission={submission}
            onOpen={() => onOpen(submission)}
          />
        ))}
      </div>
    </section>
  );
}

function SubmissionCard({ submission, onOpen }) {
  return (
    <article className="app-surface-card review-submission-card" style={styles.submissionCard}>
      <div style={styles.submissionTop}>
        <div style={styles.schoolAvatar}>{initialsFor(submission.school)}</div>
        <div style={styles.submissionTitleBlock}>
          <h3 style={styles.schoolName}>{submission.school}</h3>
          <p style={styles.schoolMeta}>
            {submission.auditType === "academic" ? "Director" : "Submitted by"}: {submission.submittedBy}
            {submission.submittedByDesignation ? ` · ${submission.submittedByDesignation}` : ""}
          </p>
          <small style={styles.schoolGroup}>{SCHOOL_GROUPS[submission.group]}</small>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      <div style={styles.submissionInfoGrid}>
        <InfoPill label="Submitted on" value={formatDate(submission.submittedOn)} />
        <InfoPill label="Sections" value={submission.sections.length} />
        <InfoPill label="Attachments" value={submission.attachments.length} />
      </div>

      <div style={styles.cardActions}>
        <button type="button" className="btn btn-secondary" onClick={onOpen}>View Form</button>
      </div>
    </article>
  );
}

function FullFormReview({ submission, onBack, onRemarksChange, onApprove, onSendBack, reviewingStatus }) {
  const submittedForm = {
    values: submission.values || {},
    tables: submission.tables || {},
    hasSavedData: submission.hasSavedData,
  };
  const sections = sectionsForAudit(submission.auditType);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [reportMode, setReportMode] = useState(false);
  const isLastSection = activeSectionIndex === sections.length - 1;
  const hasRemarks = Boolean(submission.remarks.trim());
  const goToPreviousSection = () => setActiveSectionIndex((index) => Math.max(0, index - 1));
  const goToNextSection = () => setActiveSectionIndex((index) => Math.min(sections.length - 1, index + 1));

  if (reportMode) {
    return (
      <section style={styles.fullReviewPage}>
        {submission.auditType === "academic" ? (
          <>
            <div className="review-report-actions" style={styles.cardActions}>
              <button type="button" className="btn btn-secondary" onClick={() => setReportMode(false)}>Close Report</button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print Report</button>
            </div>
            <AuditReportPanel schema={academicAudit2025Schema} values={submission.values} tables={submission.tables} />
          </>
        ) : (
          <AdministrativeReportPanel
            meta={administrativeAuditMeta}
            modules={administrativeAuditModules}
            data={{ fields: submission.values, tables: submission.tables }}
            onClose={() => setReportMode(false)}
          />
        )}
      </section>
    );
  }

  return (
    <section style={styles.fullReviewPage}>
      <div style={styles.fullReviewHeader}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          Back
        </button>
        <div style={styles.fullReviewTitleBlock}>
          <p style={styles.kicker}>{auditLabels[submission.auditType]}</p>
          <h2 style={styles.fullReviewTitle}>{submission.school}</h2>
          <p style={styles.modalMeta}>
            {submission.auditType === "academic" ? "Director" : "Submitted by"}: {submission.submittedBy}
            {submission.submittedByDesignation ? ` · ${submission.submittedByDesignation}` : ""}
            {" · "}Submitted {formatDate(submission.submittedOn)}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>

      <SectionReviewNav
        sections={sections}
        activeIndex={activeSectionIndex}
        onChange={setActiveSectionIndex}
      />

      <SubmittedFormViewer
        sections={sections}
        formData={submittedForm}
        auditType={submission.auditType}
        activeSectionIndex={activeSectionIndex}
      />

      <div style={styles.fullReviewActions}>
        {!isLastSection ? (
          <div style={styles.reviewPager}>
            <button type="button" className="btn btn-secondary" onClick={goToPreviousSection} disabled={activeSectionIndex === 0}>
              Previous
            </button>
            <button type="button" className="btn btn-primary" onClick={goToNextSection}>
              Next
            </button>
          </div>
        ) : (
          <div style={styles.finalReviewPanel}>
            <label style={styles.remarksLabel}>
              Review Remarks
              <textarea
                className="audit-control"
                value={submission.remarks}
                onChange={(event) => onRemarksChange(event.target.value)}
                placeholder="Write remarks before approving or sending back"
                style={{ ...styles.remarksInput, minHeight: 120 }}
              />
            </label>
            <div style={styles.finalActionRow}>
              <span style={styles.reviewHint}>
                {submission.status === "approved"
                  ? "This form is approved and ready for its signed final report."
                  : "Approve and Send Back are enabled after remarks are written."}
              </span>
              <div style={styles.cardActions}>
                {submission.status === "approved" ? (
                  <button type="button" className="btn btn-secondary" onClick={() => setReportMode(true)}>
                    Generate Report
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-primary" onClick={onApprove} disabled={!hasRemarks || Boolean(reviewingStatus)}>
                      {reviewingStatus === "approved" ? "Approving..." : "Approve"}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={onSendBack} disabled={!hasRemarks || Boolean(reviewingStatus)}>
                      {reviewingStatus === "sent-back" ? "Sending..." : "Send Back"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function SectionReviewNav({ sections, activeIndex, onChange }) {
  return (
    <nav style={styles.sectionNav} aria-label="Review form sections">
      {sections.map((section, index) => (
        <button
          key={section.id}
          type="button"
          style={{ ...styles.sectionNavButton, ...(index === activeIndex ? styles.activeSectionNavButton : {}) }}
          onClick={() => onChange(index)}
          title={section.title}
        >
          <span>{sectionLabelFor(section, index)}</span>
        </button>
      ))}
    </nav>
  );
}

function SubmittedFormViewer({ sections, formData, auditType, activeSectionIndex }) {
  const activeSection = sections[activeSectionIndex] || sections[0];

  return (
    <div style={styles.formViewer}>
      {!formData.hasSavedData && (
        <div style={styles.emptyDraftNotice}>
          No saved {auditLabels[auditType]} draft was found in this browser yet. Once Director/Administrative user fills and saves the form, the complete content will appear here.
        </div>
      )}

      {activeSection && (
        <section key={activeSection.id} style={styles.reviewSection}>
          <h3 style={styles.reviewSectionTitle}>
            {activeSection.number ? `${activeSection.number}. ${activeSection.title}` : activeSection.title}
          </h3>
          {activeSection.note && <p style={styles.reviewSectionNote}>{activeSection.note}</p>}

          {blocksFor(activeSection).map((block, blockIndex) => {
            if (block.type === "fields") {
              return (
                <ReadOnlyFieldGrid
                  key={`${activeSection.id}-fields-${blockIndex}`}
                  fields={block.fields}
                  values={formData.values}
                />
              );
            }

            if (block.type === "text") {
              return (
                <p key={`${activeSection.id}-text-${blockIndex}`} style={styles.reviewText}>
                  {block.text}
                </p>
              );
            }

            return (
              <div key={`${activeSection.id}-tables-${blockIndex}`} style={styles.reviewTables}>
                {block.tables.map((table) => (
                  <ReadOnlyTable
                    key={table.id}
                    table={table}
                    rows={formData.tables[table.id] || []}
                    values={formData.values}
                  />
                ))}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}

function sectionLabelFor(section, index) {
  if (section.number) return `Part ${section.number}`;

  const partMatch = section.title.match(/^Part\s+[A-Z]/i);
  if (partMatch) return partMatch[0];

  return index === 0 ? "Info" : String(index + 1);
}

function ReadOnlyFieldGrid({ fields, values }) {
  return (
    <div style={styles.readOnlyFieldGrid}>
      {fields.map((field) => {
        if (field.kind === "heading") {
          return (
            <h4 key={field.id} style={styles.reviewSubheading}>
              {field.label}
            </h4>
          );
        }

        return (
          <div key={field.id} style={styles.readOnlyField}>
            <div style={styles.readOnlyLabel}>{field.label}</div>
            <div style={styles.readOnlyValue}>{renderValue(values[field.id])}</div>
          </div>
        );
      })}
    </div>
  );
}

function ReadOnlyTable({ table, rows, values }) {
  const columns = columnsWithSerial(table.columns);
  const visibleRows = rows.length ? rows : [columns.reduce((row, column) => ({ ...row, [column]: "" }), {})];

  return (
    <div style={styles.readOnlyTableBlock}>
      {table.showTitle !== false && <h4 style={styles.readOnlyTableTitle}>{table.title}</h4>}

      {!!table.notes?.length && (
        <div style={styles.readOnlyNotes}>
          {table.notes.map((note) => (
            <div key={note}>{note}</div>
          ))}
        </div>
      )}

      {!!table.fields?.length && (
        <div style={styles.readOnlyFieldGrid}>
          {table.fields.map((field) => (
            <div key={field.id} style={styles.readOnlyField}>
              <div style={styles.readOnlyLabel}>{field.label}</div>
              <div style={styles.readOnlyValue}>{renderValue(values[field.id])}</div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.readOnlyScroller}>
        <table className="audit-data-table" style={styles.readOnlyTable}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} style={styles.readOnlyTh}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${table.id}-readonly-${rowIndex}`}>
                {columns.map((column) => (
                  <td key={column} style={styles.readOnlyTd}>
                    {renderValue(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderValue(value) {
  if (Array.isArray(value)) {
    return value.length ? (
      <div style={styles.attachmentList}>
        {value.map((file, index) => (
          <div key={`${file?.url || file?.name || "attachment"}-${index}`} style={styles.attachmentItem}>
            {renderValue(file)}
          </div>
        ))}
      </div>
    ) : "-";
  }

  if (isAttachmentValue(value)) {
    const name = value.name || value.fileName || value.filename || "Attachment";
    const url = value.url || value.publicUrl || value.downloadUrl;
    return (
      <div style={styles.attachmentPreview}>
        <span>{name}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" style={styles.attachmentLink}>
            View Attachment
          </a>
        ) : (
          <span style={styles.mutedText}>Attachment link unavailable</span>
        )}
      </div>
    );
  }

  return String(value || "").trim() || "-";
}

function MetricCard({ label, value, hint, tone }) {
  const tones = {
    blue: { color: "#1d4ed8", background: "#dbeafe" },
    amber: { color: "#b45309", background: "#fef3c7" },
    green: { color: "#15803d", background: "#dcfce7" },
    red: { color: "#b91c1c", background: "#fee2e2" },
  };
  const activeTone = tones[tone] || tones.blue;
  return (
    <div className="app-surface-card review-metric-card" style={styles.metricCard}>
      <div style={styles.metricTopRow}>
        <span style={{ ...styles.metricIndicator, ...activeTone }} aria-hidden="true" />
        <span style={styles.metricLabel}>{label}</span>
      </div>
      <strong style={styles.metricValue}>{value}</strong>
      <small style={styles.metricHint}>{hint}</small>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div style={styles.summaryRow}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function InfoPill({ label, value }) {
  return (
    <div style={styles.infoPill}>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function StatusBadge({ status }) {
  const tone = statusStyles[status] || statusStyles.submitted;
  return (
    <span style={{ ...styles.statusBadge, color: tone.color, background: tone.background, borderColor: tone.border }}>
      {statusLabels[status] || status}
    </span>
  );
}

function LogoutModal({ onCancel, onConfirm }) {
  return (
    <div style={styles.modalBackdrop} onClick={onCancel}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <div style={styles.modalTitle}>Confirm Logout</div>
        <div style={styles.modalText}>You are about to leave the School Appraisal review dashboard.</div>
        <div style={styles.modalActions}>
          <button type="button" onClick={onCancel} style={styles.cancelButton}>Cancel</button>
          <button type="button" onClick={onConfirm} style={styles.confirmButton}>Logout</button>
        </div>
      </div>
    </div>
  );
}

function PrintStyles() {
  return (
    <style>{`
      @media (max-width: 900px) {
        .review-dashboard-shell { flex-direction: column; }
        .review-dashboard-main { padding: 18px !important; }
      }
      @media print {
        .app-sidebar,
        .btn,
        .review-error-notice {
          display: none !important;
        }
        .review-dashboard-shell {
          display: block !important;
          background: #fff !important;
        }
        .review-dashboard-main {
          padding: 0 !important;
          width: 100% !important;
          margin-left: 0 !important;
        }
        body {
          background: #fff !important;
        }
      }
      .review-dashboard-main .btn:disabled {
        opacity: .5;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
      }
    `}</style>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

const styles = {
  shell: {
    minHeight: "100vh",
    display: "flex",
    background: "#f5f7fb",
    color: "#0f172a",
    fontFamily: "Inter, 'Segoe UI', sans-serif",
  },
  page: {
    minHeight: "100vh",
    flex: 1,
    background: "#f5f7fb",
    padding: "28px 30px 40px",
    overflowX: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 18,
    padding: "24px 26px",
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 10px 35px rgba(15, 23, 42, 0.055)",
    marginBottom: 22,
  },
  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: 18,
  },
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
    lineHeight: 1.25,
  },
  meta: {
    margin: 0,
    color: "#64748b",
    fontSize: 12.5,
    lineHeight: 1.45,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  overviewHero: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 28,
    minHeight: 190,
    padding: "28px 32px",
    borderRadius: 18,
    color: "#fff",
    background: "linear-gradient(125deg, #17233b 0%, #1e3a5f 58%, #2563eb 100%)",
    boxShadow: "0 18px 40px rgba(15, 23, 42, .14)",
  },
  overviewHeroCopy: { position: "relative", zIndex: 1, maxWidth: 720 },
  overviewEyebrow: { display: "block", marginBottom: 8, color: "#7dd3fc", fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" },
  overviewTitle: { margin: "0 0 9px", color: "#fff", fontSize: 24, fontWeight: 750, letterSpacing: "-.025em" },
  overviewDescription: { maxWidth: 640, margin: 0, color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.6 },
  overviewHeroPills: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 },
  overviewHeroPill: { padding: "6px 9px", border: "1px solid rgba(255,255,255,.16)", borderRadius: 999, color: "#e0f2fe", background: "rgba(255,255,255,.08)", fontSize: 10, fontWeight: 700 },
  approvalRing: { position: "relative", zIndex: 1, width: 118, height: 118, flex: "0 0 118px", display: "grid", placeItems: "center", borderRadius: "50%", boxShadow: "0 12px 30px rgba(15,23,42,.24)" },
  approvalRingInner: { width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", borderRadius: "50%", color: "#fff", background: "#17233b" },
  blueHeading: {
    padding: "0 0 15px",
    borderBottom: "1px solid #edf1f6",
  },
  pageTitleRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 14,
  },
  sectionTitle: {
    margin: 0,
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  schoolCount: {
    flexShrink: 0,
    color: "#475569",
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  metricCard: {
    position: "relative",
    overflow: "hidden",
    border: "1px solid #e5eaf2",
    borderRadius: 14,
    background: "#fff",
    padding: "17px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#64748b",
    boxShadow: "0 8px 24px rgba(15, 23, 42, .035)",
  },
  metricTopRow: { display: "flex", alignItems: "center", gap: 8 },
  metricIndicator: { width: 24, height: 24, display: "grid", placeItems: "center", borderRadius: 7 },
  metricLabel: { color: "#475569", fontSize: 10.5, fontWeight: 750, letterSpacing: ".04em", textTransform: "uppercase" },
  metricValue: { color: "#0f172a", fontSize: 25, lineHeight: 1, letterSpacing: "-.03em" },
  metricHint: { color: "#94a3b8", fontSize: 10.5, fontWeight: 600 },
  splitGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, .8fr) minmax(320px, 1.2fr)",
    gap: 18,
  },
  card: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
    padding: 18,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
  },
  cardTitle: {
    margin: "2px 0 14px",
    color: "#0f172a",
    fontSize: 18,
    fontWeight: 800,
  },
  cardEyebrow: { color: "#2563eb", fontSize: 9.5, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" },
  queueHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  queueCount: { minWidth: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 9, color: "#92400e", background: "#fef3c7", fontSize: 11, fontWeight: 800 },
  progressHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginBottom: 14,
  },
  progressIntro: {
    margin: "-7px 0 0",
    color: "#64748b",
    fontSize: 12,
  },
  schoolProgressList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  schoolProgressRow: {
    display: "grid",
    gridTemplateColumns: "minmax(190px, 1.2fr) minmax(160px, 1fr) 52px 88px 78px",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#fbfdff",
  },
  schoolProgressIdentity: {
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 9,
  },
  schoolProgressAvatar: {
    width: 30,
    height: 30,
    flex: "0 0 30px",
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    color: "#fff",
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    fontSize: 9,
    fontWeight: 800,
  },
  schoolProgressName: {
    overflow: "hidden",
    color: "#1e293b",
    fontSize: 12,
    fontWeight: 700,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  schoolProgressTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: 999,
    background: "#e2e8f0",
  },
  schoolProgressBar: {
    display: "block",
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #2563eb, #22c55e)",
  },
  schoolProgressPercent: { color: "#1e293b", fontSize: 12, textAlign: "right" },
  schoolProgressMeta: { color: "#166534", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" },
  schoolProgressPending: { color: "#92400e", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap" },
  auditSummaryRows: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "12px 0",
    borderBottom: "1px solid #edf2f7",
    color: "#475569",
    fontSize: 14,
  },
  queueList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  queueItem: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#f8fafc",
    padding: "12px 14px",
    cursor: "pointer",
    textAlign: "left",
    fontFamily: "inherit",
  },
  tabs: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  tab: {
    border: "1px solid #dbe3ef",
    borderRadius: 999,
    background: "#fff",
    color: "#334155",
    padding: "8px 11px",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    fontFamily: "inherit",
  },
  activeTab: {
    color: "#fff",
    background: "#2563eb",
    borderColor: "#2563eb",
  },
  tabCount: {
    minWidth: 24,
    height: 24,
    display: "grid",
    placeItems: "center",
    borderRadius: 999,
    color: "inherit",
    background: "rgba(148, 163, 184, .18)",
    fontSize: 12,
  },
  reviewList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: 16,
  },
  submissionCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "#fff",
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.04)",
  },
  submissionTop: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  schoolAvatar: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
    fontSize: 12,
    fontWeight: 900,
  },
  submissionTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  schoolName: {
    margin: 0,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  schoolMeta: {
    margin: "4px 0 0",
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  schoolGroup: {
    display: "block",
    marginTop: 3,
    color: "#64748b",
    fontSize: 10.5,
  },
  statusBadge: {
    border: "1px solid",
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 10.5,
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  submissionInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  infoPill: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    background: "#f8fafc",
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    color: "#64748b",
    fontSize: 11,
  },
  remarksLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  remarksInput: {
    width: "100%",
    minHeight: 84,
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#0f172a",
    background: "#fbfcfe",
    outline: "none",
    resize: "vertical",
    fontSize: 12.5,
    lineHeight: 1.45,
  },
  cardActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  fullReviewPage: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  fullReviewHeader: {
    position: "sticky",
    top: 0,
    zIndex: 5,
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 16,
    padding: 20,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  },
  fullReviewTitleBlock: {
    minWidth: 0,
  },
  fullReviewTitle: {
    margin: "0 0 5px",
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 700,
    lineHeight: 1.3,
  },
  sectionNav: {
    position: "sticky",
    top: 88,
    zIndex: 4,
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    padding: 12,
    border: "1px solid #dbe3ef",
    borderRadius: 14,
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 10px 24px rgba(15, 23, 42, 0.055)",
  },
  sectionNavButton: {
    minWidth: 72,
    border: "1px solid #dbe3ef",
    borderRadius: 999,
    background: "#f8fafc",
    color: "#334155",
    padding: "8px 11px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  activeSectionNavButton: {
    borderColor: "#2563eb",
    background: "#2563eb",
    color: "#fff",
    boxShadow: "0 8px 18px rgba(37, 99, 235, 0.18)",
  },
  fullReviewActions: {
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    display: "flex",
    justifyContent: "flex-end",
    padding: 14,
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    background: "rgba(255, 255, 255, 0.96)",
    boxShadow: "0 -10px 28px rgba(15, 23, 42, 0.06)",
  },
  reviewPager: {
    width: "100%",
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
  },
  finalReviewPanel: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  finalActionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  reviewHint: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: 650,
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
  reviewModal: {
    width: "min(1040px, 96vw)",
    maxHeight: "92vh",
    overflow: "auto",
    background: "#fff",
    borderRadius: 16,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 18,
    boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    borderBottom: "1px solid #e2e8f0",
    paddingBottom: 16,
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
  modalMeta: {
    margin: 0,
    color: "#64748b",
    fontSize: 14,
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  formViewer: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  emptyDraftNotice: {
    border: "1px solid #fde68a",
    borderRadius: 10,
    background: "#fffbeb",
    color: "#92400e",
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.5,
  },
  errorNotice: {
    border: "1px solid #fecaca",
    borderRadius: 10,
    background: "#fef2f2",
    color: "#991b1b",
    padding: "12px 14px",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.5,
  },
  reviewSection: {
    display: "flex",
    flexDirection: "column",
    gap: 15,
    border: "1px solid #e2e8f0",
    borderRadius: 16,
    background: "#fff",
    padding: 20,
    boxShadow: "0 12px 35px rgba(15, 23, 42, 0.045)",
  },
  reviewSectionTitle: {
    margin: 0,
    padding: "0 0 15px",
    borderBottom: "1px solid #edf1f6",
    color: "#0f172a",
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: "-.015em",
    lineHeight: 1.3,
  },
  reviewSectionNote: {
    margin: "-6px 0 14px",
    color: "#475569",
    fontSize: 12,
    fontWeight: 650,
  },
  reviewText: {
    margin: "0 0 14px",
    color: "#0f172a",
    fontSize: 12,
    fontWeight: 650,
  },
  reviewTables: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  readOnlyFieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "18px 16px",
  },
  reviewSubheading: {
    gridColumn: "1 / -1",
    margin: "4px 0 0",
    color: "#0f172a",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  readOnlyField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  readOnlyLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: 650,
  },
  readOnlyValue: {
    width: "100%",
    minHeight: 42,
    display: "flex",
    alignItems: "center",
    border: "1px solid #d7dee9",
    borderRadius: 8,
    padding: "9px 11px",
    color: "#0f172a",
    background: "#fbfcfe",
    fontSize: 12.5,
    whiteSpace: "pre-wrap",
    lineHeight: 1.45,
  },
  readOnlyTableBlock: {
    marginTop: 8,
  },
  readOnlyTableTitle: {
    margin: "0 0 9px",
    padding: 0,
    color: "#0f172a",
    background: "transparent",
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.35,
  },
  readOnlyNotes: {
    margin: "0 0 8px",
    color: "#334155",
    fontSize: 12,
    lineHeight: 1.6,
  },
  readOnlyScroller: {
    overflowX: "auto",
    border: "1px solid #d7dee8",
  },
  readOnlyTable: {
    width: "100%",
    minWidth: 0,
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  readOnlyTh: {
    padding: "10px 11px",
    borderBottom: "1px solid #334155",
    borderRight: "1px solid #3a465b",
    background: "#1e293b",
    color: "#f8fafc",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: ".025em",
    textAlign: "left",
    verticalAlign: "top",
  },
  readOnlyTd: {
    padding: "8px 9px",
    borderBottom: "1px solid #dfe5ec",
    borderRight: "1px solid #dfe5ec",
    color: "#0f172a",
    fontSize: 12.5,
    verticalAlign: "top",
    whiteSpace: "pre-wrap",
  },
  attachmentPreview: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  attachmentLink: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 700,
    textDecoration: "none",
  },
  mutedText: {
    color: "#64748b",
    fontSize: 12,
  },
  sectionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  sectionItem: {
    display: "grid",
    gridTemplateColumns: "32px 1fr auto",
    gap: 10,
    alignItems: "center",
    border: "1px solid #edf2f7",
    borderRadius: 10,
    padding: "9px 10px",
    fontSize: 14,
    color: "#334155",
  },
  attachmentList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  attachmentItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    border: "1px solid #edf2f7",
    borderRadius: 10,
    padding: "9px 10px",
    fontSize: 14,
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
