import Link from "next/link";
import { db } from "@/lib/db";
import { toggleVehicleCategory } from "../../../../actions/admin/vehicleCategories"; 

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminVehicleCategoriesPage() {
  const categories = await db.vehicle.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Vehicle categories</h1>
        <Link href='/admin/vehicle-categories/new'>New category</Link>
      </header>

      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>Name</Th>
              <Th>Capacity</Th>
              <Th>Luggage</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr
                key={c.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
              >
                <Td>{c.name}</Td>
                <Td>{c.capacity}</Td>
                <Td>{c.luggageCapacity}</Td>
                <Td>{c.active ? "Yes" : "No"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Link href={`/admin/vehicle-categories/${c.id}`}>Edit</Link>
                    <form
                      action={async () => {
                        "use server";
                        await toggleVehicleCategory(c.id, !c.active);
                      }}
                    >
                      <button type='submit' style={{ cursor: "pointer" }}>
                        {c.active ? "Disable" : "Enable"}
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
