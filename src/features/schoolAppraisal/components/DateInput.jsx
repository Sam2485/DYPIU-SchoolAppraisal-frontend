import { formatDateDDMMYYYY, formatDateInput, isValidDateDDMMYYYY } from "../../../utils/dateFormat";

export default function DateInput({ value = "", onChange, readOnly = false, className = "", style, ...props }) {
  const displayValue = /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? formatDateDDMMYYYY(value, "") : value;
  const hasInvalidValue = Boolean(displayValue) && String(displayValue).length === 10 && !isValidDateDDMMYYYY(displayValue);

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      maxLength={10}
      placeholder="DD/MM/YYYY"
      pattern="\d{2}/\d{2}/\d{4}"
      value={displayValue}
      onChange={(event) => onChange(formatDateInput(event.target.value))}
      readOnly={readOnly}
      aria-invalid={hasInvalidValue}
      title={hasInvalidValue ? "Enter a valid date in DD/MM/YYYY format" : "Date format: DD/MM/YYYY"}
      className={`${className} app-date-input`.trim()}
      style={style}
    />
  );
}
