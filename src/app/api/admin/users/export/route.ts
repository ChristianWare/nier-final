import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCompanySettings } from "../../../../../../actions/admin/companySettings";
import * as tz from "@/lib/timezone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCSV(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const { timezone: companyTz } = await getCompanySettings();

    const users = await db.user.findMany({
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        roles: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            driverAssignments: true,
          },
        },
      },
    });

    const headers = [
      "ID",
      "Name",
      "Email",
      "Roles",
      "Email Verified",
      "Bookings",
      "Driver Assignments",
      "Created At",
      "Updated At",
    ];

    const rows = users.map((u) => [
      escapeCSV(u.id),
      escapeCSV(u.name),
      escapeCSV(u.email),
      escapeCSV((u.roles ?? []).join(", ")),
      u.emailVerified ? "Yes" : "No",
      String(u._count.bookings),
      String(u._count.driverAssignments),
      tz.formatDate(u.createdAt, companyTz),
      tz.formatDate(u.updatedAt, companyTz),
    ]);

    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(
      "\n",
    );

    const filename = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting users:", error);
    return NextResponse.json(
      { error: "Failed to export users" },
      { status: 500 },
    );
  }
}
