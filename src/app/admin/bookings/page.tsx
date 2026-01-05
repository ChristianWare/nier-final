import Link from "next/link";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = [
  "PENDING_REVIEW",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ASSIGNED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
  "ALL",
] as const;

type StatusFilter = (typeof STATUSES)[number];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: StatusFilter }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "PENDING_REVIEW") as StatusFilter;

  const where =
    status === "ALL"
      ? {}
      : {
          status,
        };

  const bookings = await db.booking.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      serviceType: { select: { name: true } },
      vehicle: { select: { name: true } },
      assignment: {
        include: { driver: { select: { name: true, email: true } } },
      },
    },
    orderBy: [{ pickupAt: "asc" }],
    take: 300,
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Bookings</h1>
        <StatusTabs active={status} />
      </header>

      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>Pickup</Th>
              <Th>Customer</Th>
              <Th>Service</Th>
              <Th>Route</Th>
              <Th>Vehicle</Th>
              <Th>Status</Th>
              <Th>Driver</Th>
            </tr>
          </thead>
          <tbody>
            {bookings.length === 0 ? (
              <tr>
                <td style={{ padding: 14 }} colSpan={7}>
                  <div style={{ opacity: 0.75 }}>No bookings found.</div>
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr
                  key={b.id}
                  style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <Td>
                    <Link href={`/admin/bookings/${b.id}`}>
                      {b.pickupAt.toLocaleString()}
                    </Link>
                  </Td>
                  <Td style={{ opacity: 0.85 }}>
                    {b.user?.name ?? "—"}{" "}
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {b.user.email}
                    </div>
                  </Td>
                  <Td>{b.serviceType.name}</Td>
                  <Td style={{ maxWidth: 380 }}>
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      {b.pickupAddress}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65 }}>
                      → {b.dropoffAddress}
                    </div>
                  </Td>
                  <Td>{b.vehicle?.name ?? "—"}</Td>
                  <Td>{b.status}</Td>
                  <Td style={{ opacity: 0.85 }}>
                    {b.assignment?.driver
                      ? `${b.assignment.driver.name ?? "Driver"}`
                      : "—"}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusTabs({ active }: { active: StatusFilter }) {
  const items = STATUSES;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {items.map((s) => {
        const isActive = s === active;
        const href =
          s === "ALL"
            ? "/admin/bookings?status=ALL"
            : `/admin/bookings?status=${s}`;
        return (
          <Link
            key={s}
            href={href}
            style={{
              textDecoration: "none",
              padding: "8px 10px",
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,0.15)",
              background: isActive ? "rgba(0,0,0,0.06)" : "transparent",
              color: "inherit",
              fontSize: 13,
            }}
          >
            {s}
          </Link>
        );
      })}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "12px 14px", fontSize: 12, opacity: 0.7 }}>
      {children}
    </th>
  );
}
function Td({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <td style={{ padding: "12px 14px", ...style }}>{children}</td>;
}
