const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

export const formatDateInput = (value = "") => {
  const digits = String(value).replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export const isValidDateDDMMYYYY = (value = "") => {
  const match = String(value).match(DATE_PATTERN);
  if (!match) return false;

  const [, day, month, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

export const formatDateDDMMYYYY = (value, fallback = "-") => {
  if (!value) return fallback;
  if (isValidDateDDMMYYYY(value)) return String(value);

  const isoDate = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return `${isoDate[3]}/${isoDate[2]}/${isoDate[1]}`;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};
