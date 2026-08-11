export const REPORT_EXPORT_ROW_LIMIT = 10_000;

export function neutralizeSpreadsheetValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function createCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const cell = (value: unknown) =>
    `"${neutralizeSpreadsheetValue(value).replaceAll('"', '""')}"`;
  return [
    headers.map(cell).join(","),
    ...rows.map((row) => headers.map((header) => cell(row[header])).join(",")),
  ].join("\r\n");
}
