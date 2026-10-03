// src/lib/reports/model.ts — what a generated report contains, independent
// of whether it becomes a PDF or CSV files.

import type { CsvFile } from "./csv";

export type ReportSection =
  | {
      kind: "kpis";
      items: { label: string; value: string; sub?: string }[];
    }
  | {
      kind: "bar";
      title: string;
      subtitle?: string;
      points: { label: string; value: number }[];
      /** Values are cents. */
      money?: boolean;
    }
  | {
      kind: "donut";
      title: string;
      slices: { label: string; value: number }[];
      money?: boolean;
    }
  | {
      kind: "table";
      title: string;
      subtitle?: string;
      columns: { label: string; align?: "right"; flex?: number }[];
      rows: string[][];
      totals?: string[];
      emptyText?: string;
    }
  | { kind: "notes"; title?: string; lines: string[] }
  | { kind: "pageBreak" };

export type ReportModel = {
  title: string;
  companyName: string;
  periodLabel: string;
  generatedLabel: string;
  sections: ReportSection[];
};

export type BuiltReport = {
  model: ReportModel;
  csvs: CsvFile[];
  /** File name without extension. */
  baseName: string;
};

/** Which parts the person asked for. */
export type IncludeParts = {
  summary: boolean;
  charts: boolean;
  tables: boolean;
};

export function filterSections(
  model: ReportModel,
  include: IncludeParts,
): ReportModel {
  return {
    ...model,
    sections: model.sections.filter((s) =>
      s.kind === "kpis"
        ? include.summary
        : s.kind === "bar" || s.kind === "donut"
          ? include.charts
          : s.kind === "table"
            ? include.tables
            : true,
    ),
  };
}
