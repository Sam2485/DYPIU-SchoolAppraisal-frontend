export default function AcademicYearSelect({
  value,
  years = [],
  onChange,
  label = "Academic year",
  activeYear,
  optionLabel,
  styles,
}) {
  const labelFor = optionLabel || ((year) => year);

  return (
    <label style={styles.yearFilter}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={styles.yearSelect}
      >
        {years.map((year) => (
          <option key={year} value={year}>{labelFor(year, activeYear)}</option>
        ))}
      </select>
    </label>
  );
}
