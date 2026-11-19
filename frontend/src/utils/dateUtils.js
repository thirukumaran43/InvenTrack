
const IST_TIME_ZONE = "Asia/Kolkata";

// Backend LocalDateTime timestamps are treated as UTC.
export function parseBackendDate(value) {
  if (!value) return null;

  const text = String(value).trim();

  // Keep timestamps that already contain timezone information.
  const hasTimezone = /(?:Z|[+-]\d{2}:\d{2})$/i.test(text);

  const date = new Date(hasTimezone ? text : `${text}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatIstDateTime(value) {
  const date = parseBackendDate(value);

  if (!date) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getIstDateKey(value) {
  const date = parseBackendDate(value);

  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}
