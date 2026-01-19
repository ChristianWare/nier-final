import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function isValidMonth(v: string) {
  return /^\d{4}-\d{2}$/.test(v);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const month = String(url.searchParams.get("month") ?? "").trim();

  if (!month || !isValidMonth(month)) {
    return NextResponse.json({ ymds: [] });
  }

  const prefix = `${month}-`;

  const rows = await db.blackoutDate.findMany({
    where: { ymd: { startsWith: prefix } },
    select: { ymd: true },
    orderBy: [{ ymd: "asc" }],
  });

  return NextResponse.json({ ymds: rows.map((r) => r.ymd) });
}
