// src/lib/reports/csv.ts — CSV files that open cleanly in Excel.

export type CsvFile = {
  name: string;
  header: string[];
  rows: (string | number | null | undefined)[][];
};

function cell(v: string | number | null | undefined): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  let s = String(v);
  // Stop spreadsheet apps treating text as a formula.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV text with a UTF-8 marker so Excel reads accents correctly. */
export function toCsv(file: Pick<CsvFile, "header" | "rows">): string {
  const lines = [file.header, ...file.rows].map((r) => r.map(cell).join(","));
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

/** Cents → dollars with two decimals, as a number for spreadsheets. */
export function dollars(cents: number | null | undefined): number {
  return Math.round(cents ?? 0) / 100;
}
