import Link from "next/link";
import { db } from "@/lib/db";
import { toggleVehicleUnit } from "../../../../actions/admin/vehicleUnits";
import Button from "@/components/shared/Button/Button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminVehiclesPage() {
  const units = await db.vehicleUnit.findMany({
    include: { category: true },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  return (
    <section style={{ display: "grid", gap: 14 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Vehicles (units)</h1>
        <Button
          href='/admin/vehicles/new'
          text='New vehicle'
          btnType='black'
          arrow
        />
      </header>

      <div style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Plate</Th>
              <Th>Active</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr
                key={u.id}
                style={{ borderTop: "1px solid rgba(0,0,0,0.08)" }}
              >
                <Td>{u.name}</Td>
                <Td>{u.category?.name ?? "—"}</Td>
                <Td style={{ opacity: 0.8 }}>{u.plate ?? "—"}</Td>
                <Td>{u.active ? "Yes" : "No"}</Td>
                <Td>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Link href={`/admin/vehicles/${u.id}`}>Edit</Link>
                    <form
                      action={async () => {
                        "use server";
                        await toggleVehicleUnit(u.id, !u.active);
                      }}
                    >
                      <button type='submit' style={{ cursor: "pointer" }}>
                        {u.active ? "Disable" : "Enable"}
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
