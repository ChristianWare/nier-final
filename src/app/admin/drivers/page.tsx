import Link from "next/link";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDriversPage() {
  const drivers = await db.user.findMany({
    where: { role: "DRIVER" },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, name: true, email: true, createdAt: true },
    take: 500,
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Drivers</h1>
        <p style={{ margin: 0, opacity: 0.75 }}>
          This page is read-only for now. Later we’ll add driver features here
          (availability, earnings, assigned trips, etc.).
        </p>
      </header>

      {drivers.length === 0 ? (
        <EmptyDrivers />
      ) : (
        <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <Th>Name</Th>
                <Th>Email</Th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr
                  key={d.id}
                  style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <Td>{d.name ?? "—"}</Td>
                  <Td style={{ opacity: 0.8 }}>{d.email}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyDrivers() {
  return (
    <div
      style={{
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: 14,
        padding: "1rem",
        maxWidth: 900,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>No drivers yet</div>
      <div style={{ opacity: 0.75, marginBottom: 12 }}>
        Drivers should sign up like normal users. Then go to Users and change
        their role to DRIVER.
      </div>
      <Link href='/admin/users'>Go to Users</Link>
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
