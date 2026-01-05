import Link from "next/link";
import { db } from "@/lib/db";
import { toggleService } from "../../../../actions/admin/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminServicesPage() {
  const services = await db.serviceType.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Services</h1>
        <Link href='/admin/services/new'>New service</Link>
      </header>

      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>Name</Th>
              <Th>Slug</Th>
              <Th>Strategy</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr
                key={s.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
              >
                <Td>{s.name}</Td>
                <Td style={{ opacity: 0.75 }}>{s.slug}</Td>
                <Td>{s.pricingStrategy}</Td>
                <Td>{s.active ? "Yes" : "No"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Link href={`/admin/services/${s.id}`}>Edit</Link>

                    <form
                      action={async () => {
                        "use server";
                        await toggleService(s.id);
                      }}
                    >
                      <button type='submit' style={{ cursor: "pointer" }}>
                        {s.active ? "Disable" : "Enable"}
                      </button>
                    </form>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
