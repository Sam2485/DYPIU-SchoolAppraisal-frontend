import AcademicYearSelect from "./AcademicYearSelect";

export default function PreviousReportsHeader({
  title,
  selectedYear,
  years,
  currentYear,
  reportCount,
  onYearChange,
  optionLabel,
  styles,
}) {
  return (
    <div style={styles.previousReportsHeader}>
      <div style={styles.previousReportsHeading}>
        <h2 style={styles.reportDashboardTitle}>{title}</h2>
        <p style={styles.previousReportsIntro}>Approved audit versions are preserved here as immutable historical records.</p>
      </div>
      <div style={styles.pageTitleActions}>
        <AcademicYearSelect
          value={selectedYear}
          years={years}
          onChange={onYearChange}
          activeYear={currentYear}
          optionLabel={optionLabel}
          styles={styles}
        />
        <span style={styles.schoolCount}>{reportCount} reports</span>
      </div>
    </div>
  );
}
