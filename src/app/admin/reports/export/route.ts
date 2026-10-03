// src/app/admin/reports/export/route.ts
//
// Generates a report from the report builder (or a driver's pay statement)
// as a PDF, CSV, or ZIP download. Admins only.

import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/sessionUser";
import { companyDisplayName } from "@/lib/companyName";
import { getCompanySettings } from "../../../../../actions/admin/companySettings";
import { resolvePeriod } from "@/lib/reports/period";
import {
  buildCorporateReport,
  buildDriverPayReport,
  buildIncomeReport,
  buildOperationsReport,
  buildTaxPackage,
  type ReportContext,
} from "@/lib/reports/build";
import { filterSections, type BuiltReport } from "@/lib/reports/model";
import { renderReportPdf } from "@/lib/reports/pdf/ReportPDF";
import { toCsv } from "@/lib/reports/csv";
import { makeZip } from "@/lib/reports/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function download(body: Buffer | string, filename: string, type: string) {
  const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  if (!(await getAdminUserId())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = new URL(req.url).searchParams;
  const now = new Date();
  const settings = await getCompanySettings();
  const ctx: ReportContext = {
    timezone: settings.timezone,
    companyName: companyDisplayName(settings),
    now,
  };
  const type = q.get("type") ?? "income";
  const format = q.get("format") === "csv" ? "csv" : "pdf";
  const include = {
    summary: q.get("summary") !== "0",
    charts: q.get("charts") !== "0",
    tables: q.get("tables") !== "0",
  };

  // The tax package always covers one calendar year.
  const period = resolvePeriod(
    {
      period: type === "tax" ? "year" : q.get("period"),
      year: q.get("year"),
      month: q.get("month"),
      quarter: q.get("quarter"),
      from: q.get("from"),
      to: q.get("to"),
    },
    ctx.timezone,
    now,
  );

  let built: BuiltReport;
  switch (type) {
    case "tax":
      built = await buildTaxPackage(period, ctx);
      break;
    case "drivers":
      built = await buildDriverPayReport(
        period,
        ctx,
        q.get("driver") && q.get("driver") !== "all"
          ? q.get("driver")!
          : undefined,
      );
      break;
    case "operations":
      built = await buildOperationsReport(
        period,
        ctx,
        q.get("basis") === "created" ? "created" : "pickup",
      );
      break;
    case "corporate":
      built = await buildCorporateReport(period, ctx);
      break;
    default:
      built = await buildIncomeReport(period, ctx);
  }

  // Tax package: one ZIP with the summary PDF and every CSV.
  if (type === "tax") {
    const pdf = await renderReportPdf(built.model);
    const folder = built.baseName;
    const zip = makeZip([
      { name: `${folder}/summary.pdf`, data: pdf },
      ...built.csvs.map((c) => ({
        name: `${folder}/${c.name}`,
        data: toCsv(c),
      })),
    ]);
    return download(zip, `${folder}.zip`, "application/zip");
  }

  if (format === "csv") {
    if (built.csvs.length === 1) {
      const c = built.csvs[0];
      return download(
        toCsv(c),
        `${built.baseName}-${c.name}`,
        "text/csv; charset=utf-8",
      );
    }
    const zip = makeZip(
      built.csvs.map((c) => ({ name: c.name, data: toCsv(c) })),
    );
    return download(zip, `${built.baseName}-csv.zip`, "application/zip");
  }

  const pdf = await renderReportPdf(filterSections(built.model, include));
  return download(pdf, `${built.baseName}.pdf`, "application/pdf");
}
